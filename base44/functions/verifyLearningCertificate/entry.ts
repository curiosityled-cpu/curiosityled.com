import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Public certificate verification.
 *
 * Anyone holding a verification code can confirm that a certificate was issued by
 * this workspace and whether it still stands. The code is the bearer secret, so the
 * lookup is exact-match only and the response carries what is printed on the
 * certificate (learner name, course, issue date, status) and nothing else — never
 * an email address, tenant id, or other record detail.
 */

const onePage = (result) => (Array.isArray(result) ? result : result?.items || []);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || '').trim();

    if (!code || code.length < 8) return Response.json({ found: false });

    const rows = onePage(
      await base44.asServiceRole.entities.LearningCertificate.filter({ verification_code: code })
    );
    const certificate = rows[0];
    if (!certificate) return Response.json({ found: false });

    return Response.json({
      found: true,
      status: certificate.status === 'revoked' ? 'revoked' : 'valid',
      title: certificate.title,
      certificate_type: certificate.certificate_type || null,
      learner_name: certificate.metadata?.learner_name || null,
      course_title: certificate.metadata?.course_title || null,
      issued_date: certificate.issued_date,
      competencies: certificate.competencies_demonstrated || [],
      revoked_at: certificate.revoked_at || null,
      verification_code: certificate.verification_code,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Verification failed' }, { status: 500 });
  }
}