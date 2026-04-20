import { Router } from "express";
import { clubLogsCol, ClubLogDoc } from "../db";
import { WithId } from "mongodb";
import { GetLogsQueryParams } from "../zod";

const router = Router();

function serializeLog(l: WithId<ClubLogDoc>) {
  return {
    id: l._id.toString(),
    clubTag: l.clubTag,
    clubName: l.clubName,
    playerTag: l.playerTag,
    playerName: l.playerName,
    eventType: l.eventType,
    roleFrom: l.roleFrom ?? null,
    roleTo: l.roleTo ?? null,
    timestamp: l.timestamp.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const parsed = GetLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { club, eventType, search, dateFrom, dateTo, limit = 50, offset = 0 } = parsed.data;

  const filter: Record<string, unknown> = {};
  if (club) filter["clubTag"] = club;
  if (eventType) filter["eventType"] = eventType;
  if (search) filter["playerName"] = { $regex: search, $options: "i" };
  if (dateFrom || dateTo) {
    const tsFilter: Record<string, Date> = {};
    if (dateFrom) tsFilter["$gte"] = new Date(dateFrom);
    if (dateTo) tsFilter["$lte"] = new Date(dateTo);
    filter["timestamp"] = tsFilter;
  }

  const [logs, total] = await Promise.all([
    clubLogsCol
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(offset ?? 0)
      .limit(limit ?? 50)
      .toArray(),
    clubLogsCol.countDocuments(filter),
  ]);

  res.json({ logs: logs.map(serializeLog), total });
});

router.get("/summary", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalCount, todayCount, typeCounts, recentLogs] = await Promise.all([
    clubLogsCol.countDocuments({}),
    clubLogsCol.countDocuments({ timestamp: { $gte: today } }),
    clubLogsCol
      .aggregate<{ _id: string; total: number }>([
        { $group: { _id: "$eventType", total: { $sum: 1 } } },
      ])
      .toArray(),
    clubLogsCol.find().sort({ timestamp: -1 }).limit(10).toArray(),
  ]);

  const counts: Record<string, number> = {};
  for (const row of typeCounts) {
    counts[row._id] = row.total;
  }

  res.json({
    totalLogs: totalCount,
    todayLogs: todayCount,
    joinCount: counts["join"] ?? 0,
    leaveCount: counts["leave"] ?? 0,
    kickCount: counts["kick"] ?? 0,
    promotionCount: counts["promotion"] ?? 0,
    demotionCount: counts["demotion"] ?? 0,
    roleChangeCount: counts["role_change"] ?? 0,
    recentActivity: recentLogs.map(serializeLog),
  });
});

export default router;
