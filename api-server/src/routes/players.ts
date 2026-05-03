import { Router } from "express";
import { getPlayer, getPlayerFromOfficialAPI, BrawlToolsRateLimitError } from "../services/brawlstars";
import z from "zod";

const router = Router();

const PlayerParams = z.object({ tag: z.string().min(1) });

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
    const player = await getPlayer(tag);
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(player);
  } catch (err) {
    if (err instanceof BrawlToolsRateLimitError) {
      // BrawlTools rate-limited — fall back to official BS API
      const fallback = await getPlayerFromOfficialAPI(tag);
      if (fallback) {
        res.json({ ...fallback, _source: "official" });
        return;
      }
      res.status(429).json({ error: "BrawlTools API daily limit reached. Player lookups will resume tomorrow." });
      return;
    }
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

export default router;
