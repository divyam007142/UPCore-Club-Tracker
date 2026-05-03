import app from "./app";
import { logger } from "./lib/logger";
import { connectDb, trackedClubsCol } from "./db";
import { runPoller } from "./services/poller";
import { seedAdmins } from "./lib/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function getPublicIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json() as { ip: string };
    return data.ip;
  } catch {
    return "unavailable";
  }
}

async function runMigrations() {
  const renames: Array<{ from: string; to: string }> = [
    { from: "UPC Heroes",  to: "UPCore Heroes"  },
    { from: "UPC Paradise", to: "UPCore Paradise" },
    { from: "UPC Elites",  to: "UPCore Elite"   },
    { from: "UPC Main",    to: "UPCore eSports"  },
  ];
  for (const { from, to } of renames) {
    const result = await trackedClubsCol.updateOne(
      { name: from },
      { $set: { name: to, updatedAt: new Date() } },
    );
    if (result.modifiedCount > 0) {
      logger.info({ from, to }, "Migrated club name");
    }
  }
}

async function start() {
  await connectDb();
  await seedAdmins();
  await runMigrations();
  app.listen(port, async (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    const publicIp = await getPublicIp();
    logger.info({ publicIp }, "Server public IP — whitelist this in MongoDB Atlas and Brawl Stars API");
    void runPoller();
  });
}

start().catch((err) => {
  logger.error({ err }, "Startup failed");
  process.exit(1);
});
