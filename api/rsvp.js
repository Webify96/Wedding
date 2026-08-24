// Vercel serverless function — receives RSVP submissions from the site's
// RSVP form and emails a notification via Resend.
//
// Required environment variables (set these in the Vercel project dashboard —
// never commit them to a file):
//   RESEND_API_KEY     — secret API key from resend.com/api-keys
//   RSVP_NOTIFY_EMAIL   — inbox that should receive each RSVP notification
//
// Sends from webify.joburg, a domain verified on this Resend account, so
// notifications can go to any recipient (not just the account owner).

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml({ name, email, attending, guests, dietary, message, submittedAt }) {
  const isAttending = attending === "yes";
  const badgeColor = isAttending ? "#3f6b46" : "#8a6a35";
  const badgeLabel = isAttending ? "Joyfully accepts" : "Regretfully declines";

  const row = (label, value) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e9ddc9;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#a67c3d;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e9ddc9;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#362a1f;vertical-align:top;">${value}</td>
    </tr>`;

  return `
  <div style="background:#f3ebdc;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:560px;margin:0 auto;background:#faf6ef;border-radius:8px;overflow:hidden;box-shadow:0 4px 18px rgba(44,32,21,0.08);">
      <div style="background:#2c2015;padding:22px 28px;text-align:center;">
        <span style="font-size:20px;letter-spacing:0.15em;color:#f3ebdc;">Y <span style="color:#c9a15b;font-style:italic;">&amp;</span> M</span>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#a67c3d;">New RSVP received</p>
        <h1 style="margin:0 0 18px;font-size:26px;color:#362a1f;font-weight:500;">${escapeHtml(name)}</h1>
        <span style="display:inline-block;padding:6px 16px;border-radius:999px;background:${badgeColor};color:#fff;font-size:13px;letter-spacing:0.06em;margin-bottom:22px;">${badgeLabel}</span>
        <table style="width:100%;border-collapse:collapse;margin-top:6px;">
          ${row("Email", escapeHtml(email))}
          ${row("Guests", escapeHtml(guests))}
          ${row("Dietary", escapeHtml(dietary) || "None specified")}
          ${row("Message", message ? escapeHtml(message) : "&mdash;")}
        </table>
        <p style="margin:26px 0 0;font-size:12px;color:#6b5d4d;">Submitted ${escapeHtml(submittedAt)}</p>
      </div>
    </div>
  </div>`;
}

function buildEmailText({ name, email, attending, guests, dietary, message, submittedAt }) {
  const attendingLabel = attending === "yes" ? "Joyfully accepts" : "Regretfully declines";
  return [
    `New RSVP received — ${name}`,
    `Status: ${attendingLabel}`,
    `Email: ${email}`,
    `Guests: ${guests}`,
    `Dietary: ${dietary || "None specified"}`,
    `Message: ${message || "—"}`,
    `Submitted: ${submittedAt}`,
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, attending, guests, dietary, message } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.RSVP_NOTIFY_EMAIL;

  if (!apiKey || !notifyEmail) {
    console.error("RSVP function misconfigured: missing RESEND_API_KEY or RSVP_NOTIFY_EMAIL");
    return res.status(500).json({ error: "Server not configured" });
  }

  const submittedAt = new Date().toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });

  const emailData = { name, email, attending, guests, dietary, message, submittedAt };
  const attendingWord = attending === "yes" ? "Attending" : "Declined";

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Y & M Wedding RSVP <rsvp@webify.joburg>",
        to: notifyEmail,
        reply_to: email,
        subject: `RSVP — ${name} (${attendingWord})`,
        html: buildEmailHtml(emailData),
        text: buildEmailText(emailData),
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errText);
      return res.status(502).json({ error: "Failed to send notification email" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("RSVP handler error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
