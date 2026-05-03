import { Router } from "express";
import { getPlayer, getPlayerFromOfficialAPI, BrawlToolsRateLimitError, BSPlayer } from "../services/brawlstars";
import { clubSnapshotsCol } from "../db";
import z from "zod";

const router = Router();

const PlayerParams = z.object({ tag: z.string().min(1) });

/** Search all stored club snapshots for a member matching the given tag.
 *  Returns a partial BSPlayer from snapshot data — enough for the join suggester. */
async function getPlayerFromSnapshots(tag: string): Promise<BSPlayer | null> {
  const snapshots = await clubSnapshotsCol.find({}).toArray();
  for (const snap of snapshots) {
    const members = (snap.data as { members?: Array<{
      tag: string; name: string; trophies: number;
      nameColor?: string; icon?: { id: number }; role?: string;
    }> }).members ?? [];
    const found = members.find(m => m.tag === tag);
    if (found) {
      return {
        tag: found.tag,
        name: found.name,
        trophies: found.trophies,
        nameColor: found.nameColor,
        icon: found.icon,
      };
    }
  }
  return null;
}

router.get("/:tag", async (req, res) => {
  const parsed = PlayerParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tag" });
    return;
  }
  const tag = parsed.data.tag.startsWith("#")
    ? parsed.data.tag
    : `#${parsed.data.tag}`;

  try {
    // Tier 1: BrawlTools
    const player = await getPlayer(tag);
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(player);
  } catch (err) {
    if (err instanceof BrawlToolsRateLimitError) {
      // Tier 2: Official Brawl Stars API
      const official = await getPlayerFromOfficialAPI(tag);
      if (official) {
        res.json({ ...official, _source: "official" });
        return;
      }

      // Tier 3: Our own MongoDB club snapshots (works for any tracked club member)
      const snapshot = await getPlayerFromSnapshots(tag);
      if (snapshot) {
        res.json({ ...snapshot, _source: "snapshot" });
        return;
      }

      // All tiers exhausted
      res.status(429).json({
        error: "BrawlTools API daily limit reached. Try again tomorrow or use a tag of a tracked club member.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

export default router;
