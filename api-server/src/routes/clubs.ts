import { Router } from "express";
import { trackedClubsCol, TrackedClubDoc } from "../db";
import { WithId } from "mongodb";
import { getClub, BSClub } from "../services/brawlstars";
import { clubDataCache } from "../services/poller";
import {
  AddTrackedClubBody,
  ToggleClubLoggingBody,
  RemoveTrackedClubParams,
  ToggleClubLoggingParams,
  GetClubOverviewParams,
} from "../zod";

const router = Router();

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

router.post("/", async (req, res) => {
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
  res.status(201).json(serializeClub(club!));
});

router.delete("/:tag", async (req, res) => {
  const parsed = RemoveTrackedClubParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const result = await trackedClubsCol.deleteOne({ tag: parsed.data.tag });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Club not found" });
    return;
  }
  res.status(204).send();
});

router.patch("/:tag/toggle", async (req, res) => {
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
  res.json(serializeClub(updated));
});

function serializeClubOverview(club: BSClub) {
  const president = club.members?.find((m) => m.role === "president");
  return {
    tag: club.tag,
    name: club.name,
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

// Serve all overviews from the in-memory poller cache only.
// The poller is the sole caller of BrawlTools — routes never hit BrawlTools directly.
// Returns whatever is cached so far; clubs still loading appear with `loading: true`.
router.get("/overview/all", async (req, res) => {
  const clubs = await trackedClubsCol.find().toArray();
  const overviews = clubs.map((c) => {
    const cached = clubDataCache.get(c.tag);
    if (cached) return serializeClubOverview(cached);
    // Club not yet in cache (poller is still warming up) — return a stub
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

// Serve individual club overview from cache only.
router.get("/:tag/overview", async (req, res) => {
  const parsed = GetClubOverviewParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { tag } = parsed.data;
  const cached = clubDataCache.get(tag);
  if (cached) {
    res.json(serializeClubOverview(cached));
    return;
  }
  res.status(503).json({ error: "Club data not yet available. Poller is still warming up." });
});

export default router;
