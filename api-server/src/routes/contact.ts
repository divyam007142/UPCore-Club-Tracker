import { Router } from "express";
import z from "zod";
import { contactMessagesCol } from "../db/index";

const router = Router();

const CONTACT_RECIPIENT = "officialecoleaf@gmail.com";

const ContactBody = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email().max(200),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

async function sendContactEmail(subject: string, html: string): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.GMAIL_USER ?? "noreply@upcore.gg";
  if (brevoApiKey) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "UPCore Tracker", email: fromEmail },
        to: [{ email: CONTACT_RECIPIENT }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Brevo API ${res.status}: ${body.slice(0, 200)}`);
    }
    return;
  }
  // Fallback: no email service configured — message is saved to DB only
}

router.post("/", async (req, res) => {
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid form data", issues: parsed.error.issues });
    return;
  }
  const { name, email, subject, message } = parsed.data;
  const year = new Date().getFullYear();
  const receivedAt = new Date();

  // Save to MongoDB
  await contactMessagesCol.insertOne({
    name, email, subject, message,
    receivedAt,
    read: false,
  });

  // Send email notification via Brevo REST API
  try {
    const safeSubject = subject.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeName    = name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeEmail   = email.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

    await sendContactEmail(`[UPCore Contact] ${subject}`, `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0f2f5">
  <tr>
    <td align="center" style="padding:40px 20px;">

      <!-- Card -->
      <table width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff"
             style="max-width:560px;width:100%;border-radius:4px;border:1px solid #dde1e7;overflow:hidden;">

        <!-- Dark branded header -->
        <tr>
          <td align="center" bgcolor="#0d0d0d" style="padding:28px 40px 24px;background:#0d0d0d;">
            <p style="margin:0 0 5px;font-size:9px;letter-spacing:6px;text-transform:uppercase;
                      color:#888888;font-family:'Courier New',Courier,monospace;">UPCORE ESPORTS</p>
            <p style="margin:0;font-size:22px;letter-spacing:7px;text-transform:uppercase;
                      color:#ffffff;font-family:Arial Black,Arial,sans-serif;font-weight:900;">TRACKER</p>
            <p style="margin:10px 0 0;font-size:10px;letter-spacing:4px;text-transform:uppercase;
                      color:#00b4ff;font-family:'Courier New',Courier,monospace;">New Contact Message</p>
          </td>
        </tr>

        <!-- Sender details -->
        <tr>
          <td style="padding:28px 36px 8px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom:16px;">
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;
                             color:#888888;font-family:'Courier New',Courier,monospace;">From</p>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#111111;font-family:Arial,sans-serif;">${safeName}</p>
                  <p style="margin:3px 0 0;font-size:12px;color:#555555;font-family:'Courier New',Courier,monospace;">${safeEmail}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:16px;">
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;
                             color:#888888;font-family:'Courier New',Courier,monospace;">Subject</p>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#222222;font-family:Arial,sans-serif;">${safeSubject}</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:4px;">
                  <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;
                             color:#888888;font-family:'Courier New',Courier,monospace;">Received</p>
                  <p style="margin:0;font-size:12px;color:#666666;font-family:'Courier New',Courier,monospace;">
                    ${receivedAt.toUTCString()}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td height="1" bgcolor="#e8eaed" style="height:1px;font-size:0;line-height:0;margin:0 36px;">&nbsp;</td></tr>

        <!-- Message body -->
        <tr>
          <td style="padding:24px 36px 28px;">
            <p style="margin:0 0 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;
                       color:#888888;font-family:'Courier New',Courier,monospace;">Message</p>
            <table cellpadding="0" cellspacing="0" width="100%" bgcolor="#f7f8fa"
                   style="border:1px solid #dde1e7;border-radius:3px;">
              <tr>
                <td style="padding:16px 20px;font-size:14px;color:#222222;
                            font-family:Arial,sans-serif;line-height:1.8;">
                  ${safeMessage}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Reply hint -->
        <tr>
          <td style="padding:0 36px 28px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="3" bgcolor="#00b4ff" style="width:3px;border-radius:2px;">&nbsp;</td>
                <td style="padding-left:14px;">
                  <p style="margin:0;font-size:12px;color:#555555;font-family:Arial,sans-serif;line-height:1.7;">
                    Reply directly to this email to respond to <strong style="color:#111111;">${safeName}</strong> at <strong style="color:#111111;">${safeEmail}</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Dark footer -->
        <tr>
          <td align="center" bgcolor="#0d0d0d" style="padding:16px 36px 18px;background:#0d0d0d;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;
                      color:#555555;font-family:'Courier New',Courier,monospace;">#RISEUP &middot; UPCORE TRACKER</p>
            <p style="margin:0;font-size:11px;color:#444444;font-family:Arial,sans-serif;">
              &copy; ${year} UPCore Esports. All rights reserved.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
      `);
  } catch (_err) {
    // Email failed but message is already saved to DB — don't fail the request
  }

  res.json({ success: true });
});

export default router;
