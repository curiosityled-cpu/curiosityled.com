/**
 * enhanceGeneratedNarrativeWithSI
 * 
 * Wraps generateEnhancedPatternNarrative output to weave in SI context
 * Called by Atreus when generating pattern summaries
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Inlined SI weaving — local component imports cannot be resolved in Deno deploy
function weaveSIContext(narrative, siScore) {
  if (!narrative) return narrative;
  if (siScore < 40) return narrative + ' Your situational flexibility is currently low — consider slowing down to read the room before acting.';
  if (siScore < 60) return narrative + ' Your situational adaptability is moderate — trust your instincts more in familiar contexts.';
  return narrative + ' Your situational intelligence is strong — lean into that edge when navigating complexity.';
}

function generateSIContextualSummary(trends, siData) {
  const siScore = siData?.situational_intelligence_score || 50;
  const parts = [];
  if (trends.operator_risk_trajectory === 'increasing' && siScore < 50) {
    parts.push('Operator mode risk is rising; low SI may be limiting your ability to delegate.');
  }
  if (trends.learning_stall_detected && siScore < 45) {
    parts.push('Learning has stalled; low SI may mean you\'re not spotting new approaches.');
  }
  if (trends.resilience_trend === 'declining' && siScore < 55) {
    parts.push('Resilience is dipping; building situational awareness can help recovery.');
  }
  return parts.length > 0 ? parts.join(' ') : 'No critical SI-pattern intersections detected.';
}

// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, trend_period = '28d' } = await req.json();

    const [trendRows, assessmentRows] = await Promise.all([
      base44.entities.ManagerTrends.filter({ user_email }, '-last_trend_computed_at', 1),
      base44.entities.AssessmentInsights.filter({ user_email }, '-created_date', 1),
    ]);

    const trends = trendRows[0];
    const siMetrics = assessmentRows[0];

    if (!trends) {
      return Response.json({ error: 'No trend data found' }, { status: 404 });
    }

    const baseNarrative = trends.trend_narrative || '';
    const summaryKey = trend_period === '28d' ? 'summary_28d' : 'summary_7d';
    const siScore = siMetrics?.top_strengths?.includes('Situational Intelligence') ? 75 : 50;

    const siAwareNarrative = weaveSIContext(baseNarrative, siScore);
    const siAwareSummary = generateSIContextualSummary(trends, { situational_intelligence_score: siScore - 5 });

    return Response.json({
      original_narrative: baseNarrative,
      si_woven_narrative: siAwareNarrative,
      contextual_summary: siAwareSummary,
      si_metrics: siMetrics?.top_strengths || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});