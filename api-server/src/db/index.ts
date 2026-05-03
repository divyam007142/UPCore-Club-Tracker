import { MongoClient, ObjectId } from "mongodb";
import { logger } from "../lib/logger";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be set. Add it to your secrets.");
}

export interface TrackedClubDoc {
  _id?: ObjectId;
  tag: string;
  name: string;
  loggingEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubLogDoc {
  _id?: ObjectId;
  clubTag: string;
  clubName: string;
  playerTag: string;
  playerName: string;
  eventType: "join" | "leave" | "kick" | "promotion" | "demotion" | "role_change";
  roleFrom: string | null;
  roleTo: string | null;
  timestamp: Date;
}

export interface AdminDoc {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  /** Optional display name shown in audit logs and UI */
  displayName?: string;
  /** Profile picture URL */
  profilePicUrl?: string;
  /** Brawl Stars player tag (optional) */
  playerTag?: string;
}

export interface AuditLogDoc {
  _id?: ObjectId;
  adminEmail: string;
  adminName: string;
  /** Resolved display name at the time of the action (displayName ?? name) */
  adminDisplayName?: string;
  /** Profile picture URL at the time of the action */
  adminProfilePicUrl?: string;
  action: string;
  details: string;
  timestamp: Date;
}

const client = new MongoClient(process.env.MONGODB_URI);
const database = client.db("upcore");

export interface ContactMessageDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  receivedAt: Date;
  read: boolean;
}

/** Last-known-good snapshot of a club's full BrawlTools data, persisted across restarts */
export interface ClubSnapshotDoc {
  _id?: ObjectId;
  tag: string;
  data: Record<string, unknown>;
  savedAt: Date;
}

/** Password-reset OTP — persisted so restarts don't invalidate in-flight codes */
export interface OtpDoc {
  _id?: ObjectId;
  email: string;
  otp: string;
  expiresAt: Date;
}

export const trackedClubsCol   = database.collection<TrackedClubDoc>("trackedClubs");
export const clubLogsCol        = database.collection<ClubLogDoc>("clubLogs");
export const adminsCol          = database.collection<AdminDoc>("admins");
export const auditLogsCol       = database.collection<AuditLogDoc>("auditLogs");
export const contactMessagesCol = database.collection<ContactMessageDoc>("contactMessages");
export const clubSnapshotsCol   = database.collection<ClubSnapshotDoc>("clubSnapshots");
export const otpsCol            = database.collection<OtpDoc>("otps");

export async function connectDb(): Promise<void> {
  await client.connect();
  await trackedClubsCol.createIndex({ tag: 1 }, { unique: true });
  await clubLogsCol.createIndex({ timestamp: -1 });
  await clubLogsCol.createIndex({ clubTag: 1 });
  await adminsCol.createIndex({ email: 1 }, { unique: true });
  await auditLogsCol.createIndex({ timestamp: -1 });
  await contactMessagesCol.createIndex({ receivedAt: -1 });
  await clubSnapshotsCol.createIndex({ tag: 1 }, { unique: true });
  // TTL index — MongoDB automatically deletes expired OTP documents
  await otpsCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await otpsCol.createIndex({ email: 1 }, { unique: true });
  logger.info("Connected to MongoDB");
}
