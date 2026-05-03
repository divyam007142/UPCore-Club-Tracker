import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "../zod";
import { clubDataCache } from "../services/poller";
import { trackedClubsCol, clubLogsCol } from "../db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const startTime = Date.now();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/api-status", requireAdmin, async (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  let dbOk = false;
  let trackedClubCount = 0;
  let totalLogs = 0;
  try {
    trackedClubCount = await trackedClubsCol.countDocuments();
    totalLogs = await clubLogsCol.countDocuments();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  let brawlToolsOk = false;
  let brawlToolsLatencyMs: number | null = null;
  try {
    const t0 = Date.now();
    const r = await fetch("https://api.brawltools.net/clubs/%23PCUVVQGV", {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    brawlToolsLatencyMs = Date.now() - t0;
    brawlToolsOk = r.ok;
  } catch {
    brawlToolsOk = false;
  }

  const clubsInCache = clubDataCache.size;
  const allCached = trackedClubCount > 0 && clubsInCache >= trackedClubCount;

  res.json({
    status: dbOk && brawlToolsOk ? "ok" : "degraded",
    uptimeSeconds,
    db: { connected: dbOk, trackedClubs: trackedClubCount, totalLogs },
    brawlTools: { reachable: brawlToolsOk, latencyMs: brawlToolsLatencyMs },
    poller: {
      clubsInCache,
      trackedClubs: trackedClubCount,
      allCached,
      pollIntervalSeconds: 300,
    },
  });
});

export default router;
