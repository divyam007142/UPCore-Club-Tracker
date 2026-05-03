# UPCore Club Tracker

Tracks Brawl Stars clubs, member activity, and trophy standings for the UPCore organization.

## Architecture

Monorepo (`pnpm`) with two artifacts:

- **`upcore-tracker`** (`/`) — React + Vite frontend.
- **`api-server`** (`/api`) — Express 5 backend with MongoDB and a Brawl Stars poller.

The frontend's Vite dev server proxies `/api` to the API server (`API_PORT`, default 8080).

## Backend

- **MongoDB collections:** `trackedClubs`, `clubLogs`, `admins`, `auditLogs`, `contactMessages`, `clubSnapshots`, `otps`.
- **Poller** (`services/poller.ts`) runs every 5 minutes per club, snapshots
  members (`tag → { role, name }`), and writes diffs (`join`, `leave`, `kick`,
  `promotion`, `demotion`, `role_change`) to `clubLogs`. The previous snapshot
  retains the player's name so `leave` events show the real name, not the tag.
  Falls back to `clubSnapshots` (last-known-good data) if BS/BrawlTools APIs are unavailable.
- **Routes** under `/api`:
  - `GET /clubs`, `POST /clubs`, `DELETE /clubs/:tag`, `PATCH /clubs/:tag/toggle`
    (mutations require admin auth; each one writes an `auditLogs` entry).
  - `GET /clubs/overview/all`, `GET /clubs/:tag/overview`
  - `GET /clubs/leaderboard` — public, sorted by trophies desc.
  - `GET /logs`, `GET /logs/summary`
  - `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/verify-otp`, `POST /auth/reset-password`
  - `GET /audit-logs` (admin-only).
- **Auth:** JWT (`JWT_SECRET`, 8h TTL). Admin accounts are seeded on startup
  from `lib/auth.ts` (9 fixed UPCore Gmail accounts; passwords hashed with
  bcryptjs). New admins can only be added by editing `SEED_ADMINS`.
- **OTP password reset:** 6-digit codes stored in MongoDB `otps` collection with a
  TTL index (auto-deleted after 5 min). Persists across server restarts.
- **Email:** Nodemailer via Gmail (`GMAIL_USER` + `APP_PASSWORD`). Favicon is
  embedded as a base64 data URI in the email HTML — loaded from `dist/assets/favicon.png`
  in production (copied there by `build.mjs`) or `src/assets/favicon.png` in dev.

## Frontend

- Routes:
  - Public: `/`, `/logs`, `/overview`, `/leaderboard`, `/stats`, `/about`, `/login`.
  - Admin (require login): `/admin`, `/admin/settings`, `/admin/audit`.
  - `/settings` → redirect to `/admin/settings`.
- **Auth state** (`context/AuthContext.tsx`) lives in `localStorage`, so sessions
  survive page refreshes and tabs. The admin token is auto-attached to every
  generated API call via `setAuthTokenGetter`.
- **Admin panel** (`pages/admin/`) has four tabs:
  - **Dashboard** — welcome, stats, recent audit activity.
  - **Club Settings** — add/remove/toggle clubs, inline rename (pencil icon), live trophies/members/online stats per club, force re-poll button.
  - **Members** — live collapsible view of every member across all tracked clubs, sortable by role or trophies.
  - **Audit Logs** — full admin action history.
- A startup migration in `index.ts` renames clubs in the DB on first boot (e.g. "UPC Main" → "UPCore eSports").

## Production build notes

- `api-server/build.mjs` uses esbuild + copies `src/assets/` → `dist/assets/` so the email favicon PNG is available at runtime.
- CORS restricted to `https://upcore-club-tracker.pages.dev` + all `*.replit.*` dev domains.
- OTPs are MongoDB-persisted — safe on autoscale (no in-memory state lost on restart).

## Required secrets

- `MONGODB_URI`, `BRAWL_STARS_API_KEY`, `JWT_SECRET`, `GMAIL_USER`, `APP_PASSWORD`.
