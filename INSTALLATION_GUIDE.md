# Installation & Deployment Guide

This guide covers deploying UPCore Club Tracker on **Render** (recommended), but the steps apply to any Node.js platform.

---

## Prerequisites

- [Node.js](https://nodejs.org) v20 or later
- [pnpm](https://pnpm.io) v9 or later (`npm install -g pnpm`)
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free tier works)
- A [Brawl Stars Developer API](https://developer.brawlstars.com) key

---

## Step 1 — MongoDB Atlas Setup

1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user with **read + write** access
3. Under **Network Access**, add IP `0.0.0.0/0` temporarily (you will restrict this later)
4. Click **Connect → Drivers** and copy the connection string:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/upcore?retryWrites=true&w=majority
   ```
5. Keep this string handy — it becomes `MONGODB_URI`

---

## Step 2 — Brawl Stars API Key

1. Go to https://developer.brawlstars.com and log in
2. Create a new API key
3. You **must** whitelist your server's public IP — you will get this IP from the API server logs on startup (look for the `Server public IP` log line)
4. Copy the key — it becomes `BRAWL_STARS_API_KEY`

> **Note:** After deploying, check the API server logs for the public IP and add it to your Brawl Stars key allowlist. Without this, the poller will receive 403 errors.

---

## Step 3 — Local Development

```bash
# Install dependencies
pnpm install

# Terminal 1 — API server
MONGODB_URI="your-uri" \
BRAWL_STARS_API_KEY="your-key" \
PORT=8080 \
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
PORT=5173 \
pnpm --filter @workspace/upcore-tracker run dev
```

Open http://localhost:5173 in your browser.

---

## Step 4 — Deploy on Render

The project runs as **two separate Render services**: one Web Service for the API, and one Static Site for the frontend.

### 4a — Deploy the API Server

1. Go to https://dashboard.render.com → **New → Web Service**
2. Connect your GitHub repository
3. Configure:

   | Setting | Value |
   |---|---|
   | **Root Directory** | `api-server` |
   | **Runtime** | Node |
   | **Build Command** | `npm install -g pnpm && pnpm install && pnpm run build` |
   | **Start Command** | `node dist/index.mjs` |
   | **Instance Type** | Starter ($7/mo) or higher — the background poller needs a persistent process |

4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | Your Atlas connection string |
   | `BRAWL_STARS_API_KEY` | Your API key |
   | `NODE_ENV` | `production` |
   | `PORT` | (leave blank — Render sets this automatically) |

5. Deploy and wait for the service to start. Check the logs for:
   ```
   Connected to MongoDB
   Server listening  port: 8080
   Server public IP — whitelist this in MongoDB Atlas and Brawl Stars API
   ```

6. **Copy the public IP** shown in the logs and:
   - Add it to your Brawl Stars API key allowlist
   - Add it to MongoDB Atlas → Network Access

7. Note your API URL — it will look like `https://upcore-api.onrender.com`

---

### 4b — Deploy the Frontend

1. Go to **New → Static Site**
2. Connect the same repository
3. Configure:

   | Setting | Value |
   |---|---|
   | **Root Directory** | `upcore-tracker` |
   | **Build Command** | `npm install -g pnpm && pnpm install && pnpm run build` |
   | **Publish Directory** | `dist/public` |

4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | Your API service URL (e.g. `https://upcore-api.onrender.com`) |

   > **Important:** You also need to update `vite.config.ts` to proxy `/api` to `VITE_API_URL` for the production build, OR configure the frontend to use the full API URL. The simplest approach is to put both services behind a single domain using Render's **Private Network** feature so the proxy works without CORS issues.

5. Add a **Rewrite Rule** for SPA routing:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite

6. Deploy. Your site will be live at `https://upcore-tracker.onrender.com`

---

## Step 5 — Connecting Frontend to API (Production)

Since the frontend and API are on different domains, you have two options:

### Option A — Single Render Web Service (Recommended)

Serve the built frontend from the Express API server:

```ts
// Add to api-server/src/app.ts (before the /api routes)
import path from "path";
import express from "express";

const frontendDist = path.join(import.meta.dirname, "../../upcore-tracker/dist/public");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});
```

Then deploy just **one** Web Service pointing at the repo root with:
- **Build Command:** `npm install -g pnpm && pnpm install && pnpm -r run build`
- **Start Command:** `node api-server/dist/index.mjs`

The API and frontend are served from the same URL — no CORS or proxy issues.

### Option B — Two Separate Services + CORS

If you keep two services, add the CORS origin to the API:

```ts
// api-server/src/app.ts
app.use(cors({ origin: "https://your-frontend.onrender.com" }));
```

And update the frontend to call the full API URL:
```ts
// upcore-tracker/src/api/index.ts — update the base URL
const API_BASE = import.meta.env.VITE_API_URL ?? "";
```

---

## Keeping the Free Tier Alive

Render's free tier spins down services after 15 minutes of inactivity. Since the poller runs every 5 minutes, the API server will stay warm automatically. If you're on the free tier, add a health-check ping to keep it alive:

```bash
# Simple keep-alive via cron (external service like cron-job.org)
GET https://your-api.onrender.com/api/health
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| All clubs show loading skeleton | Poller hasn't warmed up yet | Wait 20–30 seconds and refresh |
| 403 errors in API logs | Server IP not whitelisted | Add the logged IP to Brawl Stars API key |
| MongoDB connection failed | Wrong URI or IP not whitelisted | Check Atlas Network Access |
| Frontend shows blank page | SPA rewrite rule missing | Add `/* → /index.html` rewrite in Render |
| Clubs not updating | Poller crashed | Check API server logs for errors |
