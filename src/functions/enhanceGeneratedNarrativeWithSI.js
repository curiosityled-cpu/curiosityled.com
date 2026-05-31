// deno-lint-ignore-file no-undef
/**
 * enhanceGeneratedNarrativeWithSI
 * 
 * Wraps generateEnhancedPatternNarrative output to weave in SI context
 * Called by Atreus when generating pattern summaries
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { 
  weaveSIContext, 
  buildSIAwareIntervention, 
  generateSIContextualSummary 
} from '@/components/intelligence/SituationalIntelligenceWeaver.js';
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email, trend_period = '28d' } = await req.json();

    // Fetch trends and SI metrics
    const [trendRows, assessmentRows] = await Promise.all([
      base44.entities.ManagerTrends.filter({ user_email }, '-last_trend_computed_at', 1),
      base44.entities.AssessmentInsights.filter({ user_email }, '-created_date', 1),
    ]);

    const trends = trendRows[0];
    const siMetrics = assessmentRows[0];

    if (!trends) {
      return Response.json({ error: 'No trend data found' }, { status: 404 });
    }

    // Get base narrative from Atreus
    const baseNarrative = trends.trend_narrative || '';
    const summaryKey = trend_period === '28d' ? 'summary_28d' : 'summary_7d';
    const baseSummary = trends[summaryKey] || '';

    // Weave SI context
    const siAwareNarrative = weaveSIContext(
      baseNarrative,
      siMetrics?.top_strengths?.includes('Situational Intelligence') ? 75 : 50,
      [] // contextual events would come from calendar
    );

    const siAwareSummary = generateSIContextualSummary(trends, {
      situational_intelligence_score: siMetrics?.top_strengths?.includes('Situational Intelligence') ? 75 : 45,
    });

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