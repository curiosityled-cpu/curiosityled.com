import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { escapeHtml } from '../../shared/safeResponses.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { to_emails, name, overall, band, archetype, sender_name } = await req.json();

    if (!to_emails || !to_emails.length) return Response.json({ error: "to_emails required" }, { status: 400 });

    // Security: cap recipients to prevent bulk spam abuse.
    const MAX_RECIPIENTS = 10;
    const recipients = Array.isArray(to_emails) ? to_emails : [to_emails];
    if (recipients.length > MAX_RECIPIENTS) {
      return Response.json({ error: `Cannot share with more than ${MAX_RECIPIENTS} recipients at once.` }, { status: 400 });
    }

    // Security: Restrict recipients to registered app users only — prevents
    // the platform from being used as an open mail relay to arbitrary
    // external addresses for phishing.
    const normalizedRecipients = recipients.map(e => e.trim().toLowerCase()).filter(Boolean);
    const registeredUsers = await base44.asServiceRole.entities.User.filter({
      email: { $in: normalizedRecipients }
    });
    const registeredEmails = new Set(registeredUsers.map(u => u.email.toLowerCase()));
    const validRecipients = normalizedRecipients.filter(e => registeredEmails.has(e));
    if (validRecipients.length === 0) {
      return Response.json({ error: "Recipients must be registered users of the platform." }, { status: 403 });
    }

    // Security: HTML-escape all interpolated values to prevent XSS / content
    // spoofing inside the branded email.
    const displaySender = escapeHtml(sender_name || name || "A leader");
    const safeName = escapeHtml(name || "");
    const safeOverall = escapeHtml(overall || "");
    const safeBand = escapeHtml(band || "");
    const safeArchetype = escapeHtml(archetype || "");

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
  <div style="background:linear-gradient(to right,#0012ff,#3b30ff);border-radius:10px;padding:24px 28px;margin-bottom:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0 0 8px;">${displaySender}'s Full Leadership Profile</h1>
    <div style="margin-top:12px;">
      <span style="color:#fff;font-size:40px;font-weight:800;">${safeOverall}%</span>
      <p style="color:#c7d2fe;font-size:14px;margin:4px 0 0;">Leadership Index · ${safeBand}</p>
    </div>
    ${archetype ? `<div style="margin-top:10px;"><span style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">${safeArchetype}</span></div>` : ""}
  </div>

  <p style="font-size:14px;color:#374151;line-height:1.6;">
    ${displaySender} has shared their full leadership profile report with you. The complete report — including behavioral style, stress analysis, blind spots, daily practices, competency insights, and a personalized development plan — is available in the platform.
  </p>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
    Shared via Curiosity Led Leadership Development Platform · AI-generated report
  </p>
</div>`.trim();

    // Security: Use Core.SendEmail (enforces recipient/attachment policies)
    // instead of the raw Resend API. Client-supplied attachment bytes
    // (pdf_base64) are no longer accepted — they enabled malware delivery
    // from the platform's mail domain. PDFs are generated server-side only.
    for (const email of validRecipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `${sender_name || name || "A leader"}'s Full Leadership Profile Report`,
        body: html,
      });
    }

    return Response.json({ success: true, sent_to: validRecipients });
  } catch (error) {
    console.error("shareLeadershipProfile error:", error);
    return Response.json({ error: "Failed to share leadership profile." }, { status: 500 });
  }
});