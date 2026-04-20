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

const client = new MongoClient(process.env.MONGODB_URI);
const database = client.db("upcore");

export const trackedClubsCol = database.collection<TrackedClubDoc>("trackedClubs");
export const clubLogsCol = database.collection<ClubLogDoc>("clubLogs");

export async function connectDb(): Promise<void> {
  await client.connect();
  await trackedClubsCol.createIndex({ tag: 1 }, { unique: true });
  await clubLogsCol.createIndex({ timestamp: -1 });
  await clubLogsCol.createIndex({ clubTag: 1 });
  logger.info("Connected to MongoDB");
}
