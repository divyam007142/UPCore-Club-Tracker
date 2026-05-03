import { trackedClubsCol, clubLogsCol, clubSnapshotsCol, ClubLogDoc } from "../db";
import { getClub, getPlayer, getClubFromOfficialAPI, BSClub } from "./brawlstars";
import { logger } from "../lib/logger";

// 45 min keeps us under BrawlTools free tier daily limit of 500 req/day
// (14 clubs × 32 polls/day = 448 req/day)
const POLL_INTERVAL_MS = 45 * 60 * 1000;

interface MemberSnapshot {
  role: string;
  name: string;
}

// Snapshot of member tag → { role, name } for diff comparison
const memberSnapshots = new Map<string, Map<string, MemberSnapshot>>();

// Full club data cache — served by the overview routes instead of calling BrawlTools per request
export const clubDataCache = new Map<string, BSClub>();

/** Returns true if the string looks like a raw tag rather than a real player name */
function looksLikeTag(s: string): boolean {
  return !s || s.startsWith("#") || s.trim() === "";
}

export async function pollClub(clubTag: string, clubName: string): Promise<void> {
  try {
    let club: BSClub;
    let fromBrawlTools = true;
    try {
      club = await getClub(clubTag);
    } catch (btErr) {
      // BrawlTools rate-limited or down — fall back to official Brawl Stars API
      const bsClub = await getClubFromOfficialAPI(clubTag);
      if (!bsClub) throw btErr; // re-throw original so the outer catch logs it
      // Preserve the last known online count from cache — official BS API doesn't provide it
      const existing = clubDataCache.get(clubTag);
      if (existing?.online) bsClub.online = existing.online;
      club = bsClub;
      fromBrawlTools = false;
      logger.info({ clubTag }, "BrawlTools unavailable — serving from official BS API");
    }

    // Always update the full data cache so overview routes are fresh
    clubDataCache.set(clubTag, club);

    // Persist to MongoDB so data survives server restarts + BrawlTools rate-limit windows
    void clubSnapshotsCol.updateOne(
      { tag: clubTag },
      { $set: { tag: clubTag, data: club as unknown as Record<string, unknown>, savedAt: new Date() } },
      { upsert: true },
    );

    // If we got data from the official BS API it won't have member-detail fields needed
    // for log diffing — skip event logging in that case (BrawlTools provides richer data)
    if (!fromBrawlTools) return;

    const currentMembers = new Map<string, MemberSnapshot>();
    for (const m of club.members) {
      currentMembers.set(m.tag, { role: m.role, name: m.name });
    }

    const prev = memberSnapshots.get(clubTag);
    if (!prev) {
      memberSnapshots.set(clubTag, currentMembers);
      logger.info({ clubTag }, "Initial snapshot taken");
      return;
    }

    const logsToInsert: Omit<ClubLogDoc, "_id">[] = [];
    const now = new Date();

    // ── Joins & role changes ──────────────────────────────────────────
    for (const [tag, snap] of currentMembers.entries()) {
      const member = club.members.find((m) => m.tag === tag)!;
      const prevSnap = prev.get(tag);
      if (!prevSnap) {
        logsToInsert.push({
          clubTag,
          clubName,
          playerTag: tag,
          playerName: member.name,
          eventType: "join",
          roleFrom: null,
          roleTo: snap.role,
          timestamp: now,
        });
      } else if (prevSnap.role !== snap.role) {
        const roleOrder = ["member", "senior", "vicePresident", "president"];
        const prevIdx = roleOrder.indexOf(prevSnap.role);
        const currIdx = roleOrder.indexOf(snap.role);
        let eventType: ClubLogDoc["eventType"] = "role_change";
        if (currIdx > prevIdx) eventType = "promotion";
        else if (currIdx < prevIdx) eventType = "demotion";
        logsToInsert.push({
          clubTag,
          clubName,
          playerTag: tag,
          playerName: member.name,
          eventType,
          roleFrom: prevSnap.role,
          roleTo: snap.role,
          timestamp: now,
        });
      }
    }

    // ── Leaves: resolve player names from BrawlTools API when unknown ─
    const leavers: Array<{ tag: string; prevSnap: MemberSnapshot }> = [];
    for (const [tag, prevSnap] of prev.entries()) {
      if (!currentMembers.has(tag)) {
        leavers.push({ tag, prevSnap });
      }
    }

    // Always try to resolve the real player name from BrawlTools for leavers
    // Fall back to snapshot name, then raw tag
    const resolvedNames = await Promise.all(
      leavers.map(async ({ tag, prevSnap }) => {
        const player = await getPlayer(tag);
        const resolvedName = player?.name || (!looksLikeTag(prevSnap.name) ? prevSnap.name : null) || tag;
        return { tag, name: resolvedName };
      }),
    );

    const nameByTag = new Map(resolvedNames.map(({ tag, name }) => [tag, name]));

    for (const { tag, prevSnap } of leavers) {
      logsToInsert.push({
        clubTag,
        clubName,
        playerTag: tag,
        playerName: nameByTag.get(tag) ?? prevSnap.name ?? tag,
        eventType: "leave",
        roleFrom: prevSnap.role ?? null,
        roleTo: null,
        timestamp: now,
      });
    }

    if (logsToInsert.length > 0) {
      await clubLogsCol.insertMany(logsToInsert);
      logger.info({ clubTag, count: logsToInsert.length }, "Logged club events");
    }

    memberSnapshots.set(clubTag, currentMembers);
  } catch (err) {
    logger.warn({ err, clubTag }, "Failed to poll club");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runPoller(): Promise<void> {
  const poll = async () => {
    try {
      const clubs = await trackedClubsCol.find({ loggingEnabled: true }).toArray();
      for (const club of clubs) {
        await pollClub(club.tag, club.name);
        await sleep(1200);
      }
    } catch (err) {
      logger.warn({ err }, "Poller iteration failed");
    }
  };

  void poll();
  setInterval(() => void poll(), POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Club poller started");
}
