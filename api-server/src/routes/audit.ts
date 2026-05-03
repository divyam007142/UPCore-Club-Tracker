import { Router } from "express";
import { auditLogsCol, AuditLogDoc } from "../db";
import { WithId } from "mongodb";
import { requireAdmin } from "../lib/auth";

const router = Router();

function serialize(l: WithId<AuditLogDoc>) {
  return {
    id: l._id.toString(),
    adminEmail: l.adminEmail,
    adminName: l.adminName,
    adminDisplayName: l.adminDisplayName ?? l.adminName,
    adminProfilePicUrl: l.adminProfilePicUrl ?? null,
    action: l.action,
    details: l.details,
    timestamp: l.timestamp.toISOString(),
  };
}

router.get("/", requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);
  const [logs, total] = await Promise.all([
    auditLogsCol.find().sort({ timestamp: -1 }).skip(offset).limit(limit).toArray(),
    auditLogsCol.countDocuments({}),
  ]);
  res.json({ logs: logs.map(serialize), total });
});

export default router;
