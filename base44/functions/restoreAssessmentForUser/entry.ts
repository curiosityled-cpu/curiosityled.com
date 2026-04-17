import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * One-time admin utility to manually create Assessment + AssessmentInsights
 * for a user whose webhook submission failed to persist.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    console.log('Auth user:', JSON.stringify({ email: user?.email, role: user?.role, app_role: user?.app_role }));

    // Accept Platform Admin by either role field
    const isAdmin = user?.role === 'admin' || user?.app_role === 'Platform Admin';
    if (!user || !isAdmin) {
      return Response.json({ error: 'Forbidden', user_role: user?.role, user_app_role: user?.app_role }, { status: 403 });
    }

    const body = await req.json();
    const { email, scores } = body;

    if (!email || !scores) {
      return Response.json({ error: 'email and scores required' }, { status: 400 });
    }

    // Look up target user's data
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const targetUser = users[0];
    const client_id = targetUser?.client_id || targetUser?.data?.client_id || null;
    console.log(`Target user found: ${!!targetUser}, client_id: ${client_id}`);

    // Check for existing assessment to avoid duplicates
    const existing = await base44.asServiceRole.entities.Assessment.filter({ email, response_id: scores.response_id });
    if (existing.length > 0) {
      console.log('Assessment already exists:', existing[0].id);
      // Check if insight exists too
      const existingInsight = await base44.asServiceRole.entities.AssessmentInsights.filter({ assessment_id: existing[0].id });
      return Response.json({
        success: true,
        already_existed: true,
        assessment_id: existing[0].id,
        insight_id: existingInsight[0]?.id || null,
        email,
      });
    }

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

    console.log('Creating Assessment...');
    const assessment = await base44.asServiceRole.entities.Assessment.create(assessmentData);
    console.log('Assessment created:', assessment.id);

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

    console.log('Creating AssessmentInsights...');
    const insight = await base44.asServiceRole.entities.AssessmentInsights.create(insightData);
    console.log('AssessmentInsights created:', insight.id);

    return Response.json({
      success: true,
      assessment_id: assessment.id,
      insight_id: insight.id,
      email,
    });
  } catch (error) {
    console.error('Error:', error.message, error.stack);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});