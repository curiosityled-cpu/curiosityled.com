// deno-lint-ignore-file no-undef
/**
 * weaveSimplifiedIntelligence
 * Merges SI (situational intelligence) signals into pattern narratives.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email = user.email, trend_narrative, trend_data } = await req.json();

    const assessments = await base44.entities.AssessmentInsights.filter({ user_email }, '-created_date', 1).catch(() => []);

    if (assessments.length === 0) {
      return Response.json({ status: 'no_si_data', narrative: trend_narrative, woven_narrative: trend_narrative });
    }

    const assessment = assessments[0];
    const siScores = assessment.record?.si_pct || null;

    if (!siScores) {
      return Response.json({ status: 'no_si_scores', narrative: trend_narrative });
    }

    const siContext = siScores < 40
      ? 'Your situational flexibility is currently low'
      : siScores < 60
      ? 'Your situational adaptability is moderate'
      : 'Your situational intelligence is strong';

    let wovenNarrative = trend_narrative;
    if (trend_data?.operator_risk_trajectory === 'increasing' && siScores < 50) {
      wovenNarrative += ` You're entering operator mode, and your SI scores suggest you may be overthinking situations — try delegating more to recover flexibility.`;
    }
    if (trend_data?.learning_stall_detected && siScores < 45) {
      wovenNarrative += ` Your learning has stalled, and low SI may mean you're not reading the room for new approaches — seek feedback this week.`;
    }
    if (trend_data?.resilience_trend === 'declining' && siScores < 55) {
      wovenNarrative += ` Your resilience is dipping. Building situational awareness can help recovery.`;
    }

    await base44.entities.PulseAccessLog.create({
      accessed_by: user.email,
      target_email: user_email,
      entity_accessed: 'ManagerTrends',
      fields_accessed: ['trend_narrative', 'si_context'],
      reason_code: 'atreus_context',
      function_name: 'weaveSimplifiedIntelligence',
      timestamp: new Date().toISOString(),
      record_count: 1,
    }).catch(() => {});

    return Response.json({ status: 'woven', original_narrative: trend_narrative, woven_narrative: wovenNarrative, si_score: siScores, si_context: siContext });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});