import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const WORKBOOK_URL =
  'https://base44.app/api/apps/69d4650b54be3dc79a1fd0b9/files/mp/public/69d4650b54be3dc79a1fd0b9/e9982f6b0_Curiosity-Led-Succession-Planning-Workbook.pdf';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body.full_name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const phoneDigits = phone.replace(/[^\d]/g, '');
    const sourcePage = String(body.source_page || '/succession-planning-template').slice(0, 200);

    if (fullName.length < 2) return Response.json({ error: 'Please enter your full name.' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return Response.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }
    if (body.consent !== true) {
      return Response.json({ error: 'Consent is required before we can send the workbook.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const existing = await service.entities.WorkbookLead.filter(
      { email },
      { sort: '-created_date', limit: 1 }
    );
    const existingItems = Array.isArray(existing) ? existing : existing?.items || [];
    const latest = existingItems[0];
    const isDuplicate =
      latest && Date.now() - new Date(latest.created_date).getTime() < DUPLICATE_WINDOW_MS;

    if (!isDuplicate) {
      await service.entities.WorkbookLead.create({
        full_name: fullName,
        email,
        phone,
        consent_marketing: true,
        consent_at: new Date().toISOString(),
        source_page: sourcePage,
        source_article: 'Template for Succession Planning: Fill-in-the-Blank Guide',
        email_status: 'skipped',
      });
    }

    const firstName = fullName.split(' ')[0];
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#121317;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#121317;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:#0202ff;padding:34px 36px;">
<p style="margin:0 0 12px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;font-weight:700;">Succession planning workbook</p>
<h1 style="margin:0 0 16px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:700;">Here is your workbook, ${firstName}.</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#e6e6ff;">Seven sections per critical role, each shipped with a completed worked example, so you can copy a filled-in template and defend your bench strength.</p>
<a href="${WORKBOOK_URL}" style="display:inline-block;background:#ffffff;color:#0202ff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Download the PDF</a>
</td></tr>
<tr><td style="padding:32px 36px 8px;">
<p style="margin:0;font-size:16px;line-height:1.65;color:#6b7280;">Inside: the seven sections a board will ask about, a worked ICU example, the readiness scale that makes each rating auditable, and the review cadence that keeps the slate honest.</p>
</td></tr>
<tr><td style="padding:24px 36px 32px;">
<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">You are receiving this because you requested the succession planning workbook from Curiosity Led.</p>
</td></tr>
<tr><td style="background:#0202ff;padding:22px 36px;">
<p style="margin:0;font-size:13px;color:#ffffff;font-weight:700;">Curiosity Led</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

    let emailSent = false;
    let emailError = '';
    try {
      await service.integrations.Core.SendEmail({
        to: email,
        subject: 'Your succession planning workbook',
        html,
        text: `Here is your workbook, ${firstName}.\n\nDownload the PDF: ${WORKBOOK_URL}\n\nInside: the seven sections a board will ask about, a worked ICU example, the readiness rule that makes every rating auditable, and the review cadence that keeps the slate honest.\n\nYou are receiving this because you requested the succession planning workbook from Curiosity Led.`,
        from_name: 'Curiosity Led',
        category: 'transactional',
      });
      emailSent = true;
    } catch (emailFailure) {
      emailError = (emailFailure?.message || 'Email could not be sent').slice(0, 500);
    }

    if (!isDuplicate) {
      const afterCreate = await service.entities.WorkbookLead.filter(
        { email },
        { sort: '-created_date', limit: 1 }
      );
      const leadItems = Array.isArray(afterCreate) ? afterCreate : afterCreate?.items || [];
      if (leadItems[0]) {
        await service.entities.WorkbookLead.update(leadItems[0].id, {
          email_status: emailSent ? 'sent' : 'failed',
          email_error: emailError || undefined,
        });
      }
    }

    return Response.json({ success: true, download_url: WORKBOOK_URL, email_sent: emailSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}