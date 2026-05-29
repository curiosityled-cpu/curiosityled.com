/**
 * weaveSimplifiedIntelligence
 *
 * Merges SI (situational intelligence) signals into pattern narratives.
 * Called by generateEnhancedPatternNarrative to inject contextual SI observations.
 *
 * Flow:
 * 1. Get manager's recent SI scores from assessment
 * 2. Map SI dimensions to current behavioral patterns
 * 3. Weave SI context into 7d/28d trend narratives
 * 4. Example: "You're in operator mode (pattern) because your SI flexibility is low (assessment)"
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email = user.email, trend_narrative, trend_data } = await req.json();

    // Fetch most recent SI assessment score
    const assessments = await base44.entities.AssessmentInsights.filter(
      { user_email },
      '-created_date',
      1
    ).catch(() => []);

    if (assessments.length === 0) {
      // No SI data available, return original narrative
      return Response.json({
        status: 'no_si_data',
        narrative: trend_narrative,
        woven_narrative: trend_narrative,
      });
    }

    const assessment = assessments[0];
    const siScores = assessment.record?.si_pct || null;

    if (!siScores) {
      return Response.json({
        status: 'no_si_scores',
        narrative: trend_narrative,
      });
    }

    // Map SI score to contextual observation
    const siContext = [];

    if (siScores < 40) {
      siContext.push('Your situational flexibility is currently low');
    } else if (siScores < 60) {
      siContext.push('Your situational adaptability is moderate');
    } else {
      siContext.push('Your situational intelligence is strong');
    }

    // Weave SI into narrative based on observed patterns
    let wovenNarrative = trend_narrative;

    if (trend_data?.operator_risk_trajectory === 'increasing' && siScores < 50) {
      wovenNarrative += ` You're entering operator mode, and your SI scores suggest you may be overthinking situations—try delegating more to recover flexibility.`;
    }

    if (trend_data?.learning_stall_detected && siScores < 45) {
      wovenNarrative += ` Your learning has stalled, and low SI may mean you're not reading the room for new approaches—seek feedback this week.`;
    }

    if (trend_data?.resilience_trend === 'declining' && siScores < 55) {
      wovenNarrative += ` Your resilience is dipping. Building situational awareness (noticing what's actually in front of you) can help recovery.`;
    }

    // Log the weaving for audit
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

    return Response.json({
      status: 'woven',
      original_narrative: trend_narrative,
      woven_narrative: wovenNarrative,
      si_score: siScores,
      si_context: siContext.join('; '),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});