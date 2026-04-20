import app from "./app";
import { logger } from "./lib/logger";
import { connectDb } from "./db";
import { runPoller } from "./services/poller";

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

async function start() {
  await connectDb();
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
