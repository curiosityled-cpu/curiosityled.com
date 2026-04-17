import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * One-time admin utility to manually create an Assessment + trigger insights
 * for a user whose webhook submission failed to persist.
 * Requires Platform Admin role.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.app_role !== 'Platform Admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, scores } = body;

    if (!email || !scores) {
      return Response.json({ error: 'email and scores required' }, { status: 400 });
    }

    // Look up user's client_id
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const client_id = users[0]?.client_id || null;

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
      }
    };

    const assessment = await base44.asServiceRole.entities.Assessment.create(assessmentData);
    console.log('Assessment created:', assessment.id);

    // Now create the AssessmentInsights record directly (no need to trigger automation)
    const insightData = {
      assessment_id: assessment.id,
      user_email: email,
      client_id,
      archetype: scores.archetype_label,
      top_strengths: scores.top_strengths || [],
      development_areas: scores.development_areas || [],
      risk_flags: scores.risk_flags || [],
      summary: scores.summary || scores.scoring_notes || '',
      recommendations: scores.recommendations || [],
      status: 'generated',
    };

    const insight = await base44.asServiceRole.entities.AssessmentInsights.create(insightData);
    console.log('AssessmentInsights created:', insight.id);

    return Response.json({
      success: true,
      assessment_id: assessment.id,
      insight_id: insight.id,
      email,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});