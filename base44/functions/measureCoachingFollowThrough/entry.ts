/**
 * measureCoachingFollowThrough — measure coaching effectiveness by comparing declared intent to observed outcomes
 * 
 * Runs nightly after computeBehaviorTrends. Measures:
 * - Stated vs actual focus (morning intent vs evening actuals)
 * - Recommendation adoption (did manager follow through on suggestions)
 * - Pattern recognition (what coaching themes are actually landing)
 * 
 * Integrates follow-through rate into ManagerTrends to inform future trigger decisions
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { manager_email } = payload;

    if (!manager_email) {
      return Response.json({ error: 'Missing manager_email' }, { status: 400 });
    }

    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 86400000);

    // Fetch manager's pulses and trends
    const [pulses, trends, activity] = await Promise.all([
      base44.asServiceRole.entities.ManagerPulse.filter(
        { user_email: manager_email }, '-created_date', 30
      ),
      base44.asServiceRole.entities.ManagerTrends.filter(
        { user_email: manager_email }, '-last_trend_computed_at', 1
      ),
      base44.asServiceRole.entities.UserActivity.filter(
        { user_email: manager_email }, '-date', 7
      )
    ]);

    const recentPulses = pulses.filter(p => p.created_date && new Date(p.created_date) >= last7d);
    const trendRecord = trends[0];

    if (!trendRecord) {
      return Response.json({
        success: false,
        reason: 'No trend record found'
      });
    }

    // ─── Measure follow-through patterns ───────────────────────────────────

    // 1. Intent-actuals alignment (morning_intent → evening_actuals)
    const intentPulses = recentPulses.filter(p => p.prompt_type === 'morning_intent');
    const actualsPulses = recentPulses.filter(p => p.prompt_type === 'evening_actuals');

    let intentActualsAlignment = 'no_data';
    if (intentPulses.length > 0 && actualsPulses.length > 0) {
      const gapCount = actualsPulses.filter(p => p.intent_actuals_gap).length;
      const totalActuals = actualsPulses.length;
      // Alignment = (1 - gap_rate) × 100
      intentActualsAlignment = Math.round(((totalActuals - gapCount) / totalActuals) * 100);
    }

    // 2. Delegation follow-through
    const delegationIntents = intentPulses.filter(p => p.focus_category === 'delegation').length;
    const delegationGaps = trendRecord.delegation_gap_count_7d || 0;
    const delegation_followthrough_rate = delegationIntents > 0
      ? Math.round(((delegationIntents - delegationGaps) / delegationIntents) * 100)
      : null;

    // 3. Overload acknowledgment → action signals
    const overloadPulses = recentPulses.filter(p => p.prompt_type === 'overload_check');
    const overloadAcknowledged = overloadPulses.filter(p => 
      p.operator_mode_response && ['very_much', 'somewhat'].includes(p.operator_mode_response)
    ).length;
    
    // Check if manager actually reduced load after acknowledging
    const afterOverloadAck = recentPulses.filter(p => 
      p.created_date && p.source !== 'system' && 
      p.energy_level && ['steady', 'strong'].includes(p.energy_level)
    ).length;
    
    const overload_action_signal = overloadAcknowledged > 0
      ? (afterOverloadAck / overloadAcknowledged)
      : null;

    // 4. Coaching theme resonance
    const coachingPulses = recentPulses.filter(p => p.biggest_weight_today?.startsWith('trigger:'));
    const coachingThemeCount = coachingPulses.length;
    const resonanceThemes = {};
    coachingPulses.forEach(p => {
      const theme = p.biggest_weight_today?.split(':')[1];
      if (theme) {
        resonanceThemes[theme] = (resonanceThemes[theme] || 0) + 1;
      }
    });

    // ─── Update ManagerTrends with follow-through metrics ──────────────────

    const updatePayload = {
      ...trendRecord,
      // New fields tracking follow-through
      intent_actuals_alignment: typeof intentActualsAlignment === 'number' ? intentActualsAlignment : null,
      delegation_followthrough_rate,
      overload_action_signal: overload_action_signal !== null ? Math.round(overload_action_signal * 100) : null,
      coaching_theme_resonance: Object.keys(resonanceThemes).length > 0 ? resonanceThemes : null,
      coaching_followthrough_score: Math.round(
        ((intentActualsAlignment !== 'no_data' ? intentActualsAlignment : 50) +
         (delegation_followthrough_rate || 50) +
         (overload_action_signal !== null ? overload_action_signal * 100 : 50)) / 3
      ),
      last_trend_computed_at: now.toISOString()
    };

    await base44.asServiceRole.entities.ManagerTrends.update(trendRecord.id, updatePayload);

    // Log the measurement
    await base44.asServiceRole.entities.PulseAccessLog.create({
      accessed_by: 'system:measureCoachingFollowThrough',
      target_email: manager_email,
      entity_accessed: 'ManagerTrends',
      fields_accessed: ['intent_actuals_alignment', 'delegation_followthrough_rate', 'coaching_followthrough_score'],
      reason_code: 'computeBehaviorTrends',
      function_name: 'measureCoachingFollowThrough',
      timestamp: now.toISOString(),
      record_count: recentPulses.length
    });

    return Response.json({
      success: true,
      manager_email,
      follow_through_metrics: {
        intent_actuals_alignment,
        delegation_followthrough_rate,
        overload_action_signal: overload_action_signal !== null ? Math.round(overload_action_signal * 100) : null,
        coaching_followthrough_score: updatePayload.coaching_followthrough_score,
        resonant_themes: resonanceThemes
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});