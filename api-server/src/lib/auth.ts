import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { adminsCol, auditLogsCol } from "../db";
import { logger } from "./logger";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface AdminPayload {
  email: string;
  name: string;
  displayName?: string;
  profilePicUrl?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function signToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as AdminPayload & {
      iat: number;
      exp: number;
    };
    return {
      email: decoded.email,
      name: decoded.name,
      displayName: decoded.displayName,
      profilePicUrl: decoded.profilePicUrl,
    };
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.admin = payload;
  next();
}

export async function recordAudit(
  admin: AdminPayload,
  action: string,
  details: string,
): Promise<void> {
  try {
    await auditLogsCol.insertOne({
      adminEmail: admin.email,
      adminName: admin.name,
      adminDisplayName: admin.displayName ?? admin.name,
      adminProfilePicUrl: admin.profilePicUrl,
      action,
      details,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.warn({ err }, "Failed to record audit log");
  }
}

interface SeedAdmin {
  email: string;
  password: string;
  name: string;
}

const SEED_ADMINS: SeedAdmin[] = [
  { email: "sunnybookupcore@gmail.com",  password: "Sunnybook@911", name: "Sunnybook" },
  { email: "nimarupcore@gmail.com",      password: "Nimar@3721",    name: "Nimar" },
  { email: "bittusharkupcore@gmail.com", password: "Bittu@9798",    name: "Bittushark" },
  { email: "tanmayupcore@gmail.com",     password: "Tanmay@18",     name: "Tanmay" },
  { email: "saketsamupcore@gmail.com",   password: "Saket@007700",  name: "Saketsam" },
  { email: "penguinupcore@gmail.com",    password: "Divyansh@890",  name: "Divyansh" },
  { email: "adityaupcore@gmail.com",     password: "Aditya@356",    name: "Aditya" },
  { email: "rawfireupcore@gmail.com",    password: "Rawfire@276",   name: "Rawfire" },
  { email: "quiveupcore@gmail.com",      password: "Quive@87",      name: "Quive" },
];

export async function seedAdmins(): Promise<void> {
  for (const a of SEED_ADMINS) {
    const email = a.email.toLowerCase();
    const passwordHash = await bcrypt.hash(a.password, 10);
    await adminsCol.updateOne(
      { email },
      {
        $set: { passwordHash, name: a.name },
        $setOnInsert: { email, createdAt: new Date() },
      },
      { upsert: true },
    );
  }
  logger.info({ count: SEED_ADMINS.length }, "Seeded admin accounts");
}
