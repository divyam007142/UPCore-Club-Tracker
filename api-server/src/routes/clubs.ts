import { Router } from "express";
import { trackedClubsCol, clubSnapshotsCol, TrackedClubDoc } from "../db";
import { WithId } from "mongodb";
import { BSClub, getClubFromOfficialAPI } from "../services/brawlstars";
import { clubDataCache, pollClub } from "../services/poller";
import { requireAdmin, recordAudit } from "../lib/auth";
import z from "zod";
import {
  AddTrackedClubBody,
  ToggleClubLoggingBody,
  RemoveTrackedClubParams,
  ToggleClubLoggingParams,
  GetClubOverviewParams,
} from "../zod";

const router = Router();

const RenameClubParams = z.object({ tag: z.coerce.string() });
const RenameClubBody = z.object({ name: z.string().min(1).max(80) });

function serializeClub(c: WithId<TrackedClubDoc>) {
  return {
    id: c._id.toString(),
    tag: c.tag,
    name: c.name,
    loggingEnabled: c.loggingEnabled,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const clubs = await trackedClubsCol.find().toArray();
  res.json(clubs.map(serializeClub));
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = AddTrackedClubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { tag, name } = parsed.data;
  const existing = await trackedClubsCol.findOne({ tag });
  if (existing) {
    res.status(409).json({ error: "Club already tracked" });
    return;
  }
  const now = new Date();
  const result = await trackedClubsCol.insertOne({
    tag,
    name,
    loggingEnabled: true,
    createdAt: now,
    updatedAt: now,
  });
  const club = await trackedClubsCol.findOne({ _id: result.insertedId });
  await recordAudit(req.admin!, "club.add", `Added club "${name}" (${tag})`);
  res.status(201).json(serializeClub(club!));
});

router.delete("/:tag", requireAdmin, async (req, res) => {
  const parsed = RemoveTrackedClubParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const club = await trackedClubsCol.findOne({ tag: parsed.data.tag });
  const result = await trackedClubsCol.deleteOne({ tag: parsed.data.tag });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  await recordAudit(
    req.admin!,
    "club.remove",
    `Removed club "${club?.name ?? "?"}" (${parsed.data.tag})`,
  );
  res.status(204).send();
});

router.patch("/:tag/toggle", requireAdmin, async (req, res) => {
  const paramsParsed = ToggleClubLoggingParams.safeParse(req.params);
  const bodyParsed = ToggleClubLoggingBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { tag } = paramsParsed.data;
  const { loggingEnabled } = bodyParsed.data;
  const updated = await trackedClubsCol.findOneAndUpdate(
    { tag },
    { $set: { loggingEnabled, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  await recordAudit(
    req.admin!,
    "club.toggle",
    `${loggingEnabled ? "Enabled" : "Disabled"} logging for "${updated.name}" (${tag})`,
  );
  res.json(serializeClub(updated));
});

// Rename a club's display name (admin-only)
router.patch("/:tag/rename", requireAdmin, async (req, res) => {
  const paramsParsed = RenameClubParams.safeParse(req.params);
  const bodyParsed = RenameClubBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { tag } = paramsParsed.data;
  const { name } = bodyParsed.data;
  const prev = await trackedClubsCol.findOne({ tag });
  if (!prev) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  const updated = await trackedClubsCol.findOneAndUpdate(
    { tag },
    { $set: { name, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  await recordAudit(
    req.admin!,
    "club.rename",
    `Renamed club "${prev.name}" → "${name}" (${tag})`,
  );
  res.json(serializeClub(updated!));
});

// Force a manual re-poll of a single club (admin-only)
router.post("/:tag/repoll", requireAdmin, async (req, res) => {
  const paramsParsed = RenameClubParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { tag } = paramsParsed.data;
  const club = await trackedClubsCol.findOne({ tag });
  if (!club) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  // Run poll in background, respond immediately
  void pollClub(tag, club.name);
  await recordAudit(req.admin!, "club.repoll", `Triggered manual re-poll for "${club.name}" (${tag})`);
  res.json({ ok: true });
});

function serializeClubOverview(club: BSClub, nameOverride?: string) {
  const president = club.members?.find((m) => m.role === "president");
  return {
    tag: club.tag,
    name: nameOverride ?? club.name,
    description: club.description ?? null,
    type: club.type ?? null,
    trophies: club.trophies ?? 0,
    requiredTrophies: club.requiredTrophies ?? null,
    badgeId: club.badgeId ?? null,
    memberCount: club.members?.length ?? 0,
    online: club.online ?? 0,
    regionName: club.regionName ?? null,
    megaPig: club.megaPig ?? null,
    president: president?.name ?? null,
    members: (club.members ?? []).map((m) => ({
      tag: m.tag,
      name: m.name,
      role: m.role,
      trophies: m.trophies,
      nameColor: m.nameColor ?? null,
      iconId: m.icon?.id ?? null,
      megaPig: m.megaPig ?? null,
      brawlPass: m.brawlPass ?? null,
    })),
  };
}

router.get("/overview/all", async (req, res) => {
  const clubs = await trackedClubsCol.find().toArray();

  // Pre-fetch all snapshots from MongoDB in one query for clubs not in memory
  const missingTags = clubs.filter(c => !clubDataCache.has(c.tag)).map(c => c.tag);
  const snapshots = missingTags.length > 0
    ? await clubSnapshotsCol.find({ tag: { $in: missingTags } }).toArray()
    : [];
  const snapshotMap = new Map(snapshots.map(s => [s.tag, s.data as unknown as BSClub]));

  const overviews = clubs.map((c) => {
    const cached = clubDataCache.get(c.tag);
    if (cached) return serializeClubOverview(cached, c.name);

    const snapshot = snapshotMap.get(c.tag);
    if (snapshot) return { ...serializeClubOverview(snapshot, c.name), stale: true };

    return {
      tag: c.tag,
      name: c.name,
      description: null,
      type: null,
      trophies: 0,
      requiredTrophies: null,
      badgeId: null,
      memberCount: 0,
      online: 0,
      regionName: null,
      megaPig: null,
      president: null,
      members: [],
      loading: true,
    };
  });
  res.json(overviews);
});

// Public leaderboard — clubs sorted by trophies (desc).
router.get("/leaderboard", async (req, res) => {
  const clubs = await trackedClubsCol.find().toArray();

  // Tier 1: in-memory cache
  const missingTags = clubs.filter(c => !clubDataCache.has(c.tag)).map(c => c.tag);

  // Tier 2: MongoDB snapshots
  const snapshots = missingTags.length > 0
    ? await clubSnapshotsCol.find({ tag: { $in: missingTags } }).toArray()
    : [];
  const snapshotMap = new Map(snapshots.map(s => [s.tag, s.data as unknown as BSClub]));

  // Tier 3: official BS API for clubs still missing after both tiers
  const stillMissing = missingTags.filter(t => !snapshotMap.has(t));
  if (stillMissing.length > 0) {
    const fetched = await Promise.all(
      stillMissing.map(async (tag) => {
        const club = await getClubFromOfficialAPI(tag);
        if (club) {
          // Persist so future requests (and other routes) benefit
          void clubSnapshotsCol.updateOne(
            { tag },
            { $set: { tag, data: club as unknown as Record<string, unknown>, savedAt: new Date() } },
            { upsert: true },
          );
        }
        return { tag, club };
      })
    );
    for (const { tag, club } of fetched) {
      if (club) snapshotMap.set(tag, club);
    }
  }

  const rows = clubs.map((c) => {
    const cached = clubDataCache.get(c.tag) ?? snapshotMap.get(c.tag);
    return {
      tag: c.tag,
      name: c.name,
      trophies: cached?.trophies ?? 0,
      requiredTrophies: cached?.requiredTrophies ?? null,
      badgeId: cached?.badgeId ?? null,
      memberCount: cached?.members?.length ?? 0,
      online: cached?.online ?? 0,
      type: cached?.type ?? null,
      loading: !cached,
      stale: !clubDataCache.has(c.tag) && !!(snapshotMap.get(c.tag)),
    };
  });
  rows.sort((a, b) => b.trophies - a.trophies);
  res.json(rows);
});

router.get("/:tag/overview", async (req, res) => {
  const parsed = GetClubOverviewParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { tag } = parsed.data;
  const [cached, dbClub] = await Promise.all([
    Promise.resolve(clubDataCache.get(tag)),
    trackedClubsCol.findOne({ tag }),
  ]);

  // 1. Serve from in-memory cache (fastest path)
  if (cached) {
    res.json(serializeClubOverview(cached, dbClub?.name));
    return;
  }

  // 2. Fall back to last persisted MongoDB snapshot (survives restarts + BrawlTools 429)
  const snapshot = await clubSnapshotsCol.findOne({ tag });
  if (snapshot?.data) {
    const clubData = snapshot.data as unknown as BSClub;
    res.json({ ...serializeClubOverview(clubData, dbClub?.name), stale: true });
    return;
  }

  // 3. Try official BS API as last resort (works once server IP is whitelisted)
  const bsClub = await getClubFromOfficialAPI(tag);
  if (bsClub) {
    // Persist for future requests
    void clubSnapshotsCol.updateOne(
      { tag },
      { $set: { tag, data: bsClub as unknown as Record<string, unknown>, savedAt: new Date() } },
      { upsert: true },
    );
    res.json({ ...serializeClubOverview(bsClub, dbClub?.name), stale: true });
    return;
  }

  // 4. Genuinely no data yet (new club, never polled successfully)
  res.status(503).json({ error: "Club data not yet available. Poller is still warming up." });
});

export default router;
