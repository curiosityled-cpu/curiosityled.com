import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { to_emails, name, overall, band, archetype, pdf_base64, sender_name } = await req.json();

    if (!to_emails || !to_emails.length) return Response.json({ error: "to_emails required" }, { status: 400 });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const displaySender = sender_name || name || "A leader";

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
  <div style="background:linear-gradient(to right,#0012ff,#3b30ff);border-radius:10px;padding:24px 28px;margin-bottom:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0 0 8px;">${displaySender}'s Full Leadership Profile</h1>
    <div style="margin-top:12px;">
      <span style="color:#fff;font-size:40px;font-weight:800;">${overall}%</span>
      <p style="color:#c7d2fe;font-size:14px;margin:4px 0 0;">Leadership Index · ${band}</p>
    </div>
    ${archetype ? `<div style="margin-top:10px;"><span style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;">${archetype}</span></div>` : ""}
  </div>

  <p style="font-size:14px;color:#374151;line-height:1.6;">
    ${displaySender} has shared their full leadership profile report with you. The complete report — including behavioral style, stress analysis, blind spots, daily practices, competency insights, and a personalized development plan — is attached as a PDF.
  </p>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">
    Shared via Curiosity Led Leadership Development Platform · AI-generated report
  </p>
</div>`.trim();

    const emailPayload = {
      from: "Curiosity Led <noreply@curiosityled.ai>",
      to: to_emails,
      subject: `${displaySender}'s Full Leadership Profile Report`,
      html,
    };

    // Attach PDF if provided
    if (pdf_base64) {
      const filename = `${(name || "Leadership_Profile").replace(/ /g, "_")}_Full_Leadership_Profile.pdf`;
      emailPayload.attachments = [{
        filename,
        content: pdf_base64,
      }];
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", result);
      return Response.json({ error: result.message || "Failed to send email" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("shareLeadershipProfile error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});