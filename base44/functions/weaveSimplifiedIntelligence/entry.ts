/**
 * weaveSimplifiedIntelligence
 * 
 * Enriches manager trend narratives with Situational Intelligence (SI) context.
 * SI is woven in as supporting context, not the headline.
 * 
 * Returns: { enhanced_narrative, si_status, si_score, original_narrative }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userEmail = body.user_email || user.email;

    // 1. Fetch current trend narrative
    const trends = await base44.entities.ManagerTrends.filter(
      { user_email: userEmail },
      '-last_trend_computed_at',
      1
    );
    const trend = trends[0];

    if (!trend) {
      return Response.json({
        enhanced_narrative: null,
        si_status: 'no_trend_data',
        si_score: null,
        original_narrative: null
      });
    }

    const baseNarrative = trend.trend_narrative || trend.summary_7d;
    if (!baseNarrative) {
      return Response.json({
        enhanced_narrative: null,
        si_status: 'no_narrative',
        si_score: null,
        original_narrative: null
      });
    }

    // 2. Fetch SI score from latest assessment insights
    let siScore = null;
    let siPct = null;
    try {
      const insights = await base44.entities.AssessmentInsights.filter(
        { user_email: userEmail },
        '-created_date',
        1
      );
      if (insights[0]?.situational_intelligence_score) {
        siScore = insights[0].situational_intelligence_score;
      }
    } catch {}

    // Try raw assessment if no insight record
    if (!siScore) {
      try {
        const assessments = await base44.entities.Assessment.filter(
          { email: userEmail },
          '-created_date',
          1
        );
        if (assessments[0]?.si_pct) {
          siPct = assessments[0].si_pct;
          siScore = siPct;
        }
      } catch {}
    }

    // 3. If no SI data, return base narrative unchanged
    if (!siScore) {
      return Response.json({
        enhanced_narrative: baseNarrative,
        si_status: 'no_si_data',
        si_score: null,
        original_narrative: baseNarrative
      });
    }

    // 4. Weave SI context into narrative based on score level and current patterns
    const siLevel = siScore > 75 ? 'high' : siScore > 50 ? 'medium' : 'low';

    // Only enrich if there's a meaningful overload/delegation pattern to contextualize
    const hasOverloadPattern = (trend.overload_pattern_strength || 0) > 40;
    const hasDelegationGap = (trend.delegation_gap_count_7d || 0) >= 1;
    const hasIdentityFriction = trend.identity_friction_active;

    let siContext = null;

    if (siLevel === 'high' && hasOverloadPattern) {
      siContext = "Your situational read is sharp — you notice complexity quickly. The catch is that high SI can mean you absorb problems others haven't spotted yet, which quietly adds to your load.";
    } else if (siLevel === 'medium' && hasDelegationGap) {
      siContext = "In ambiguous or fast-moving situations, you sometimes take back work you've started to hand off. That's not a failure of intent — it's a situational response worth naming.";
    } else if (siLevel === 'low' && hasOverloadPattern) {
      siContext = "When situations feel unclear, the pull toward control is natural. Building your situational read can help you decide what actually needs your attention versus what the team can own.";
    } else if (hasIdentityFriction) {
      siContext = "Identity friction often emerges when your situational awareness is high but your role constraints feel misaligned with what you're seeing. That tension is real and worth sitting with.";
    }

    const enhancedNarrative = siContext
      ? `${baseNarrative} ${siContext}`
      : baseNarrative;

    // 5. Log access for audit trail
    try {
      await base44.asServiceRole.entities.PulseAccessLog.create({
        accessed_by: user.email,
        target_email: userEmail,
        entity_accessed: 'ManagerTrends',
        fields_accessed: ['trend_narrative', 'summary_7d', 'overload_pattern_strength'],
        reason_code: 'atreus_context',
        function_name: 'weaveSimplifiedIntelligence',
        timestamp: new Date().toISOString(),
        record_count: 1,
      });
    } catch {}

    return Response.json({
      enhanced_narrative: enhancedNarrative,
      si_status: siContext ? 'enriched' : 'no_relevant_context',
      si_score: siScore,
      si_level: siLevel,
      original_narrative: baseNarrative,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});