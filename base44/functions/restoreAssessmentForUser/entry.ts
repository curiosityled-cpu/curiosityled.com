import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, scores } = await req.json();

    // Look up user's client_id
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const targetUser = users[0] || null;
    const client_id = targetUser?.client_id || null;

    console.log(`Creating assessment for ${email}, client_id: ${client_id}`);

    const assessmentData = {
      email,
      client_id,
      response_id: scores.response_id || `manual_restore_${Date.now()}`,
      submission_ts: scores.submission_ts || new Date().toISOString(),
      overall_pct: scores.overall_pct,
      si_pct: scores.si_pct,
      dm_pct: scores.dm_pct,
      comm_pct: scores.comm_pct,
      rm_pct: scores.rm_pct,
      sm_pct: scores.sm_pct,
      pm_pct: scores.pm_pct,
      archetype_label: scores.archetype_label,
      band_overall: scores.band_overall,
      status: 'processed',
      record: {
        sector: scores.sector || null,
        role_level: scores.role_level || null,
        scoring_notes: scores.scoring_notes || null,
        qa_count: scores.qa_count || 0,
        restored: true,
        restored_at: new Date().toISOString(),
        original_webhook_id: scores.original_webhook_id || null,
      }
    };

    // Try with user-scoped client (Platform Admin has write access per RLS)
    const assessment = await base44.entities.Assessment.create(assessmentData);
    console.log('Assessment created (user-scoped):', assessment.id);

    // Verify it's readable
    const verify = await base44.asServiceRole.entities.Assessment.filter({ id: assessment.id });
    console.log('Verify read count:', verify.length);

    return Response.json({ success: true, assessment_id: assessment.id, email, client_id, verified: verify.length > 0 });
  } catch (error) {
    console.error('Error:', error.message, error.stack);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});