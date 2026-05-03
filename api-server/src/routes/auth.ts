import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import nodemailer from "nodemailer";
import { adminsCol, otpsCol } from "../db";
import { signToken, requireAdmin, recordAudit } from "../lib/auth";
import type { AdminPayload } from "../lib/auth";

// Email image base URL — must be a publicly reachable HTTPS origin (no auth).
// Set EMAIL_ASSET_BASE env var to override (e.g. after a fresh deployment).
// Defaults to the production Cloudflare Pages deployment.
const EMAIL_ASSET_BASE =
  process.env.EMAIL_ASSET_BASE?.replace(/\/$/, "") ??
  "https://upcore-club-tracker.pages.dev/email-assets";

const router = Router();

function buildAdminPayload(doc: {
  email: string;
  name: string;
  displayName?: string;
  profilePicUrl?: string;
}): AdminPayload {
  return {
    email: doc.email,
    name: doc.name,
    displayName: doc.displayName,
    profilePicUrl: doc.profilePicUrl,
  };
}

function serializeAdmin(doc: {
  email: string;
  name: string;
  displayName?: string;
  profilePicUrl?: string;
  playerTag?: string;
}) {
  return {
    email: doc.email,
    name: doc.name,
    displayName: doc.displayName ?? null,
    profilePicUrl: doc.profilePicUrl ?? null,
    playerTag: doc.playerTag ?? null,
  };
}

function getMailer() {
  // Primary: Brevo SMTP relay — works from any cloud server IP (unlike Gmail direct SMTP).
  // Sign up free at brevo.com → SMTP & API → copy login + generate SMTP key.
  const brevoLogin = process.env.BREVO_SMTP_LOGIN;
  const brevoKey   = process.env.BREVO_SMTP_KEY;
  if (brevoLogin && brevoKey) {
    return nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user: brevoLogin, pass: brevoKey },
    });
  }

  // Fallback: Gmail direct SMTP (works locally; may be blocked by cloud hosts).
  const user = process.env.GMAIL_USER;
  const pass = process.env.APP_PASSWORD ?? process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function getFromAddress(): string {
  const brevoLogin = process.env.BREVO_SMTP_LOGIN;
  const gmail      = process.env.GMAIL_USER;
  // Brevo lets you send from any verified sender — use Gmail address if available.
  return gmail ?? brevoLogin ?? "noreply@upcore.gg";
}

/* ── Login ─────────────────────────────────────────────────────── */
router.post("/login", async (req, res) => {
  const body = req.body as { email?: unknown; password?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const admin = await adminsCol.findOne({ email });
  if (!admin) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const payload = buildAdminPayload(admin);
  const token = signToken(payload);
  await recordAudit(payload, "auth.login", `Signed in`);
  res.json({ token, admin: serializeAdmin(admin) });
});

/* ── Logout (records audit trail) ──────────────────────────────── */
router.post("/logout", requireAdmin, async (req, res) => {
  await recordAudit(req.admin!, "auth.logout", `Signed out`);
  res.json({ success: true });
});

/* ── Me ─────────────────────────────────────────────────────────── */
router.get("/me", requireAdmin, async (req, res) => {
  const doc = await adminsCol.findOne({ email: req.admin!.email });
  if (!doc) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  res.json({ admin: serializeAdmin(doc) });
});

/* ── Update profile ─────────────────────────────────────────────── */
router.patch("/profile", requireAdmin, async (req, res) => {
  const body = req.body as {
    displayName?: unknown;
    profilePicUrl?: unknown;
    playerTag?: unknown;
  } | undefined;

  const displayName   = typeof body?.displayName   === "string" ? body.displayName.trim()   || null : undefined;
  const profilePicUrl = typeof body?.profilePicUrl === "string" ? body.profilePicUrl.trim() || null : undefined;
  const playerTag     = typeof body?.playerTag     === "string" ? body.playerTag.trim()     || null : undefined;

  const $set: Record<string, unknown> = {};
  if (displayName   !== undefined) $set.displayName   = displayName   ?? "";
  if (profilePicUrl !== undefined) $set.profilePicUrl = profilePicUrl ?? "";
  if (playerTag     !== undefined) $set.playerTag     = playerTag     ?? "";

  await adminsCol.updateOne({ email: req.admin!.email }, { $set });

  const updated = await adminsCol.findOne({ email: req.admin!.email });
  if (!updated) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const payload = buildAdminPayload(updated);
  const token = signToken(payload);
  await recordAudit(payload, "profile.update", `Updated profile settings`);
  res.json({ token, admin: serializeAdmin(updated) });
});

/* ── Forgot password: send OTP ──────────────────────────────────── */
router.post("/forgot-password", async (req, res) => {
  const body = req.body as { email?: unknown };
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const admin = await adminsCol.findOne({ email });
  if (!admin) {
    res.status(404).json({ error: "No admin account found with that email." });
    return;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  // Persist OTP in MongoDB — survives server restarts; TTL index auto-deletes after 5 min
  await otpsCol.replaceOne(
    { email },
    { email, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    { upsert: true },
  );

  const mailer = getMailer();
  if (!mailer) {
    res.status(503).json({ error: "Email service not configured" });
    return;
  }

  const displayName = (admin.displayName?.trim() || admin.name?.trim() || email.split("@")[0]);
  const year = new Date().getFullYear();
  // Individual digit cells — table row never wraps regardless of email client width
  const otpCells = otp.split("").map(d =>
    `<td align="center" valign="middle"
         style="padding:0 6px;font-size:40px;font-weight:900;color:#ffffff;
                font-family:Arial Black,Arial,sans-serif;line-height:1;white-space:nowrap;">${d}</td>`
  ).join("");

  // HTTPS image URLs served from the production Cloudflare Pages deployment.
  // That domain is fully public — Gmail's image proxy can reach it without any auth.
  const logoUrl    = `${EMAIL_ASSET_BASE}/upcore-logo.png`;
  const discordUrl = `${EMAIL_ASSET_BASE}/discord-icon.png`;
  const twitterUrl = `${EMAIL_ASSET_BASE}/twitter-icon.png`;
  const gmailUrl   = `${EMAIL_ASSET_BASE}/gmail-icon.png`;

  try {
    await Promise.race([
      mailer.sendMail({
      from: `"UPCore Tracker" <${getFromAddress()}>`,
      to: email,
      subject: `UPCore — Password Reset Code for ${displayName}`,
      html: `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>UPCore Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0f2f5">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <!-- Card -->
      <table width="480" cellpadding="0" cellspacing="0"
             style="max-width:480px;width:100%;background:#ffffff;border-radius:8px;
                    overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">

        <!-- Dark header — logo links to app -->
        <tr>
          <td align="center" bgcolor="#0d1117"
              style="background:#0d1117;padding:32px 40px 28px;">
            <a href="https://upcore-club-tracker.pages.dev" target="_blank"
               style="display:block;text-decoration:none;">
              <img src="${logoUrl}" alt="UPCore" width="56" height="56"
                   style="width:56px;height:56px;display:block;margin:0 auto 14px;">
            </a>
            <p style="margin:0;font-size:20px;font-weight:900;letter-spacing:6px;
                      text-transform:uppercase;color:#ffffff;
                      font-family:Arial Black,Arial,sans-serif;">UPCORE</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:4px;text-transform:uppercase;
                      color:#6272a4;font-family:Arial,sans-serif;">CLUB TRACKER</p>
          </td>
        </tr>

        <!-- White body -->
        <tr>
          <td align="center" style="padding:36px 40px 16px;">
            <p style="margin:0 0 10px;font-size:22px;font-weight:700;color:#0d1117;
                      font-family:Arial Black,Arial,sans-serif;">Password Reset</p>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;
                      font-family:Arial,sans-serif;">
              Use the verification code below to reset your password.<br>
              Requested for <strong style="color:#374151;">${displayName}</strong>.
            </p>
          </td>
        </tr>

        <!-- Blue OTP box -->
        <tr>
          <td align="center" style="padding:8px 32px 8px;">
            <table cellpadding="0" cellspacing="0" width="100%" style="max-width:400px;margin:0 auto;">
              <tr>
                <td align="center" bgcolor="#1d9bf0"
                    style="background:#1d9bf0;border-radius:10px;padding:24px 16px;">
                  <table cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;">
                    <tr>${otpCells}</tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Expiry notice -->
        <tr>
          <td align="center" style="padding:18px 40px 28px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;
                      font-family:Arial,sans-serif;">
              This code will expire in <strong style="color:#6b7280;">5 minutes</strong>.<br>
              If you didn&rsquo;t request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer divider -->
        <tr><td height="1" bgcolor="#e5e7eb" style="height:1px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background:#ffffff;padding:28px 40px 32px;">

            <!-- Tagline -->
            <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.5;
                      font-family:Arial,sans-serif;">
              Real-time club intelligence for UPCore Brawl Stars &mdash; #RISEUP
            </p>

            <!-- Clickable social icons — real brand marks, gray monochrome -->
            <table cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;margin-bottom:20px;">
              <tr>
                <td style="padding:0 10px;">
                  <a href="https://discord.com/users/bittu00" target="_blank" style="display:block;text-decoration:none;">
                    <img src="${discordUrl}" width="24" height="24" alt="Discord"
                         style="width:24px;height:24px;display:block;border:0;">
                  </a>
                </td>
                <td style="padding:0 10px;">
                  <a href="https://x.com/26dsingh" target="_blank" style="display:block;text-decoration:none;">
                    <img src="${twitterUrl}" width="24" height="24" alt="X / Twitter"
                         style="width:24px;height:24px;display:block;border:0;">
                  </a>
                </td>
                <td style="padding:0 10px;">
                  <a href="mailto:officialecoleaf@gmail.com" style="display:block;text-decoration:none;">
                    <img src="${gmailUrl}" width="24" height="24" alt="Email"
                         style="width:24px;height:24px;display:block;border:0;">
                  </a>
                </td>
              </tr>
            </table>

            <!-- Copyright -->
            <p style="margin:0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">
              &copy; ${year} UPCore Esports. All rights reserved.
            </p>

          </td>
        </tr>

      </table>
      <!-- End card -->

    </td>
  </tr>
</table>

</body>
</html>
      `,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Email send timed out")), 12000)
      ),
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send email";
    res.status(500).json({ error: `Failed to send email: ${msg}` });
    return;
  }

  res.json({ success: true });
});

/* ── Change password (logged-in admin, requires current password) ── */
router.post("/change-password", requireAdmin, async (req, res) => {
  const body = req.body as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword     = typeof body?.newPassword     === "string" ? body.newPassword     : "";

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const admin = await adminsCol.findOne({ email: req.admin!.email });
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await adminsCol.updateOne({ email: req.admin!.email }, { $set: { passwordHash: hash } });
  await recordAudit(buildAdminPayload(admin), "auth.password_change", `Changed password from admin panel`);
  res.json({ success: true });
});

/* ── Verify OTP only (check code, don't reset yet) ──────────────── */
router.post("/verify-otp", async (req, res) => {
  const body = req.body as { email?: unknown; otp?: unknown };
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const otp   = typeof body?.otp   === "string" ? body.otp.trim() : "";

  if (!email || !otp) {
    res.status(400).json({ error: "Email and code are required" });
    return;
  }

  const stored = await otpsCol.findOne({ email });
  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt.getTime()) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }

  res.json({ valid: true });
});

/* ── Reset password (after OTP verified) ───────────────────────── */
router.post("/reset-password", async (req, res) => {
  const body = req.body as { email?: unknown; otp?: unknown; newPassword?: unknown };
  const email       = typeof body?.email       === "string" ? body.email.trim().toLowerCase() : "";
  const otp         = typeof body?.otp         === "string" ? body.otp.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!email || !otp || !newPassword) {
    res.status(400).json({ error: "Email, OTP, and new password are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const stored = await otpsCol.findOne({ email });
  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt.getTime()) {
    res.status(400).json({ error: "Code expired. Please request a new one." });
    return;
  }

  const admin = await adminsCol.findOne({ email });
  if (!admin) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await adminsCol.updateOne({ email }, { $set: { passwordHash: hash } });
  await otpsCol.deleteOne({ email });

  await recordAudit(buildAdminPayload(admin), "auth.password_reset", `Reset password via OTP email`);
  res.json({ success: true });
});

export default router;
