import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const GUIDE_URL =
  'https://base44.app/api/apps/69d4650b54be3dc79a1fd0b9/files/mp/public/69d4650b54be3dc79a1fd0b9/de3cbfb4f_Curiosity-Led-Difficult-Conversations-Field-Guide.pdf';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body.full_name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    const companyName = String(body.company_name || '').trim().slice(0, 160);
    const employeeCount = String(body.employee_count || '').trim().slice(0, 60);
    const sourcePage = String(body.source_page || '/blog').slice(0, 200);

    if (fullName.length < 2) return Response.json({ error: 'Please enter your full name.' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (companyName.length < 2) return Response.json({ error: 'Please enter your company name.' }, { status: 400 });
    if (!employeeCount) return Response.json({ error: 'Please tell us roughly how many employees you have.' }, { status: 400 });
    if (body.consent !== true) {
      return Response.json({ error: 'Please tick the consent box so we can email you the guide.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const existing = await service.entities.FieldGuideLead.filter(
      { email },
      { sort: '-created_date', limit: 1 }
    );
    const existingItems = Array.isArray(existing) ? existing : existing?.items || [];
    const latest = existingItems[0];
    const isDuplicate =
      latest && Date.now() - new Date(latest.created_date).getTime() < DUPLICATE_WINDOW_MS;

    if (!isDuplicate) {
      await service.entities.FieldGuideLead.create({
        full_name: fullName,
        email,
        company_name: companyName,
        employee_count: employeeCount,
        consent_marketing: true,
        consent_at: new Date().toISOString(),
        resource: 'Difficult Conversations Field Guide',
        source_page: sourcePage,
      });
    }

    const firstName = fullName.split(' ')[0];
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#121317;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#121317;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:#0202ff;padding:34px 36px;">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;font-weight:700;">Difficult conversations field guide</p>
<h1 style="margin:0 0 16px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:700;">Here is your field guide, ${firstName}.</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#e6e6ff;">Six scripted openers, a three-step recovery move for defensiveness, and the four gates for deciding when to bring in HR.</p>
<a href="${GUIDE_URL}" style="display:inline-block;background:#ffffff;color:#0202ff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Download the PDF</a>
</td></tr>
<tr><td style="padding:32px 36px 8px;">
<p style="margin:0;font-size:16px;line-height:1.65;color:#6b7280;">Inside: the ten-minute prep worksheet, six worked scenarios, the recovery move, the escalation decision tree, the follow-up template, and a practice prompt you can paste into your AI assistant.</p>
</td></tr>
<tr><td style="padding:24px 36px 32px;">
<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">You are receiving this because you requested the difficult conversations field guide from Curiosity Led. You can unsubscribe at any time.</p>
</td></tr>
<tr><td style="background:#0202ff;padding:22px 36px;">
<p style="margin:0;font-size:13px;color:#ffffff;font-weight:700;">Curiosity Led</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

    try {
      await service.integrations.Core.SendEmail({
        to: email,
        subject: 'Your difficult conversations field guide',
        html,
        text: `Here is your field guide, ${firstName}.\n\nDownload the PDF: ${GUIDE_URL}\n\nInside: the ten-minute prep worksheet, six worked scenarios, the recovery move, the escalation decision tree, the follow-up template, and a practice prompt you can paste into your AI assistant.\n\nYou are receiving this because you requested the difficult conversations field guide from Curiosity Led.`,
        from_name: 'Curiosity Led',
        category: 'transactional',
      });
    } catch (emailFailure) {
      return Response.json(
        { error: 'We saved your details but could not send the email. Please try again in a moment.' },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}