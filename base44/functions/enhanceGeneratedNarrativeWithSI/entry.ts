// deno-lint-ignore-file no-undef
/**
 * enhanceGeneratedNarrativeWithSI
 * Wraps generateEnhancedPatternNarrative output to weave in SI context.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const baseSummary = trends[summaryKey] || '';
    const siScore = siMetrics?.top_strengths?.includes('Situational Intelligence') ? 75 : 50;

    let wovenNarrative = baseNarrative;
    if (siScore < 50) {
      wovenNarrative += ' Your situational adaptability is moderate — building more contextual awareness may help.';
    } else {
      wovenNarrative += ' Your situational intelligence appears strong, which supports adaptive leadership.';
    }

    return Response.json({
      original_narrative: baseNarrative,
      si_woven_narrative: wovenNarrative,
      contextual_summary: baseSummary,
      si_metrics: siMetrics?.top_strengths || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});