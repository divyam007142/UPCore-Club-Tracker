import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "silent";
    },
  }),
);
const ALLOWED_ORIGINS = new Set([
  "https://upcore-club-tracker.pages.dev",
  ...(process.env.EXTRA_CORS_ORIGINS ?? "").split(",").filter(Boolean),
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin requests (no Origin header) and all *.replit.* dev domains
      if (!origin || origin.includes(".replit.") || ALLOWED_ORIGINS.has(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve email assets publicly so Gmail can load them as HTTPS image URLs
app.use("/email-assets", express.static(path.join(__dirname, "assets"), {
  maxAge: "7d",
  immutable: false,
}));

app.use("/api", router);

export default app;
