/**
 * computeAdaptiveTone
 *
 * Determines if Atreus should shift tone based on manager's current state.
 * 
 * Triggers tone shifts:
 * - High burnout risk (≥70): shift to warm_candid if in gentle_observant
 * - Identity friction: shift to respectfully_confronting (caring directness)
 * - Confidence declining + high overload: shift to warm_candid (grounded support)
 * - Recovery after tough period: shift to close_friend_candid (celebratory)
 *
 * Returns:
 * {
 *   should_adapt: bool,
 *   recommended_tone: string,
 *   current_tone: string,
 *   reason: string,
 *   context_flags: []
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current tone preference + recent state
    const [tonePrefs, trends, pulses] = await Promise.all([
      base44.asServiceRole.entities.TonePreference.filter({ user_email: user.email }, '-created_date', 1),
      base44.asServiceRole.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1),
      base44.asServiceRole.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 7)
    ]);

    const currentTone = tonePrefs[0]?.tone_mode || 'warm_candid';
    const trend = trends[0];
    const recentPulses = pulses || [];

    // Compute burnout risk on demand
    let burnoutScore = 0;
    if (trend) {
      const energyDrain = recentPulses.filter(p => p.energy_level === 'drained' || p.energy_level === 'stretched').length;
      const lowClarity = recentPulses.filter(p => p.mental_clarity && p.mental_clarity <= 2).length;
      
      burnoutScore = Math.min(100,
        (energyDrain / Math.max(recentPulses.length, 1)) * 30 +
        (trend.resilience_trend === 'declining' ? 25 : 0) +
        (lowClarity / Math.max(recentPulses.length, 1)) * 20 +
        (trend.identity_friction_signals > 0 ? 10 : 0) +
        (trend.overload_acknowledgment_rate > 0.7 ? 20 : 0)
      );
    }

    const contextFlags = [];
    let recommendedTone = currentTone;
    let shouldAdapt = false;

    // 1. High burnout risk override
    if (burnoutScore >= 70 && currentTone === 'gentle_observant') {
      recommendedTone = 'warm_candid';
      shouldAdapt = true;
      contextFlags.push('High burnout risk detected');
    }

    // 2. Identity friction → respectfully_confronting
    if (trend?.identity_friction_signals > 0 && currentTone !== 'respectfully_confronting') {
      recommendedTone = 'respectfully_confronting';
      shouldAdapt = true;
      contextFlags.push('Identity friction present');
    }

    // 3. Confidence declining + overload → warm_candid
    if (trend?.confidence_trend === 'declining' && trend?.overload_acknowledgment_rate > 0.6) {
      recommendedTone = 'warm_candid';
      shouldAdapt = true;
      contextFlags.push('Confidence declining under load');
    }

    // 4. Recent recovery after tough week → close_friend_candid
    const recentImprovement = trend?.resilience_trend === 'improving' && trend?.confidence_trend === 'improving';
    if (recentImprovement && currentTone !== 'close_friend_candid') {
      recommendedTone = 'close_friend_candid';
      shouldAdapt = true;
      contextFlags.push('Strong recovery trajectory');
    }

    const reason = shouldAdapt
      ? `Shifting to ${recommendedTone} to match your current state: ${contextFlags.join(', ')}`
      : `Staying with ${currentTone} — it fits your current state well`;

    return Response.json({
      should_adapt: shouldAdapt,
      recommended_tone: recommendedTone,
      current_tone: currentTone,
      reason,
      context_flags: contextFlags,
      burnout_score: Math.round(burnoutScore)
    });

  } catch (error) {
    console.error('Error computing adaptive tone:', error);
    return Response.json(
      { error: error.message, should_adapt: false },
      { status: 500 }
    );
  }
});