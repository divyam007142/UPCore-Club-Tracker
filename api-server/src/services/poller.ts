import { trackedClubsCol, clubLogsCol, ClubLogDoc } from "../db";
import { getClub, BSClub } from "./brawlstars";
import { logger } from "../lib/logger";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Snapshot of member tag → role for diff comparison
const memberSnapshots = new Map<string, Map<string, string>>();

// Full club data cache — served by the overview routes instead of calling BrawlTools per request
export const clubDataCache = new Map<string, BSClub>();

export async function pollClub(clubTag: string, clubName: string): Promise<void> {
  try {
    const club = await getClub(clubTag);

    // Always update the full data cache so overview routes are fresh
    clubDataCache.set(clubTag, club);

    const currentMembers = new Map<string, string>();
    for (const m of club.members) {
      currentMembers.set(m.tag, m.role);
    }

    const prev = memberSnapshots.get(clubTag);
    if (!prev) {
      memberSnapshots.set(clubTag, currentMembers);
      logger.info({ clubTag }, "Initial snapshot taken");
      return;
    }

    const logsToInsert: Omit<ClubLogDoc, "_id">[] = [];
    const now = new Date();

    for (const [tag, role] of currentMembers.entries()) {
      const member = club.members.find((m) => m.tag === tag)!;
      if (!prev.has(tag)) {
        logsToInsert.push({
          clubTag,
          clubName,
          playerTag: tag,
          playerName: member.name,
          eventType: "join",
          roleFrom: null,
          roleTo: role,
          timestamp: now,
        });
      } else {
        const prevRole = prev.get(tag)!;
        if (prevRole !== role) {
          const roleOrder = ["member", "senior", "vicePresident", "president"];
          const prevIdx = roleOrder.indexOf(prevRole);
          const currIdx = roleOrder.indexOf(role);
          let eventType: ClubLogDoc["eventType"] = "role_change";
          if (currIdx > prevIdx) eventType = "promotion";
          else if (currIdx < prevIdx) eventType = "demotion";
          logsToInsert.push({
            clubTag,
            clubName,
            playerTag: tag,
            playerName: member.name,
            eventType,
            roleFrom: prevRole,
            roleTo: role,
            timestamp: now,
          });
        }
      }
    }

    for (const [tag] of prev.entries()) {
      if (!currentMembers.has(tag)) {
        const prevRole = prev.get(tag) ?? null;
        logsToInsert.push({
          clubTag,
          clubName,
          playerTag: tag,
          playerName: tag,
          eventType: "leave",
          roleFrom: prevRole,
          roleTo: null,
          timestamp: now,
        });
      }
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
        await sleep(1200); // 1.2s between each club to stay well under rate limit
      }
    } catch (err) {
      logger.warn({ err }, "Poller iteration failed");
    }
  };

  void poll();
  setInterval(() => void poll(), POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Club poller started");
}
