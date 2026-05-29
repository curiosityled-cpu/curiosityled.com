/**
 * computeBurnoutRisk
 *
 * Calculates composite burnout risk score (0-100) from:
 * - Sustained energy drain (14d pattern)
 * - Low/declining resilience
 * - High cognitive overload (mental clarity drops)
 * - Unrecovery (no bounce-back days in recent window)
 * - Identity friction (disconnection from role)
 * - Chronically high operator mode risk
 *
 * Returns:
 * {
 *   burnout_risk_score: 0-100,
 *   risk_level: 'low' | 'moderate' | 'elevated' | 'high',
 *   components: { energy, resilience, cognitive_load, recovery, identity, operator_mode },
 *   warning_flags: [...],
 *   recommendation: "string"
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all required data
    const [trends, pulses, activity] = await Promise.all([
      base44.asServiceRole.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1),
      base44.asServiceRole.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 28),
      base44.asServiceRole.entities.UserActivity.filter({ user_email: user.email }, '-date', 14),
    ]);

    const trend = trends[0];
    const recentPulses = pulses || [];
    const recentActivity = activity || [];

    if (!trend || recentPulses.length < 3) {
      return Response.json({
        burnout_risk_score: 0,
        risk_level: 'insufficient_data',
        components: {},
        warning_flags: ['Not enough check-in data'],
        recommendation: 'Check back after more check-ins.'
      });
    }

    const components = {};

    // 1. ENERGY DRAIN (0-30 points)
    const energyDrainCount = recentPulses.filter(p => p.energy_level === 'drained' || p.energy_level === 'stretched').length;
    const energyDrainRate = energyDrainCount / Math.max(recentPulses.length, 1);
    components.energy = Math.min(30, Math.round(energyDrainRate * 40));

    // 2. RESILIENCE DECLINE (0-25 points)
    let resilienceScore = 0;
    if (trend.resilience_trend === 'declining') {
      resilienceScore = 25;
    } else if (trend.resilience_trend === 'stable') {
      resilienceScore = 10;
    }
    components.resilience = resilienceScore;

    // 3. COGNITIVE OVERLOAD (0-20 points)
    const lowClarityPulses = recentPulses.filter(p => p.mental_clarity && p.mental_clarity <= 2).length;
    const clarityDecline = trend.confidence_trend === 'declining' ? 10 : 0;
    components.cognitive_load = Math.min(20, Math.round((lowClarityPulses / Math.max(recentPulses.length, 1)) * 15 + clarityDecline));

    // 4. UNRECOVERY / NO BOUNCE-BACK (0-15 points)
    const strongDays = recentPulses.filter(p => p.energy_level === 'strong' || p.resilience_signal === 'bouncing_back').length;
    const hasRecovery = strongDays > 0;
    components.recovery = hasRecovery ? 0 : 15;

    // 5. IDENTITY FRICTION (0-10 points)
    components.identity = trend.identity_friction_signals > 0 ? 10 : 0;

    // 6. CHRONIC OPERATOR MODE (0-20 points)
    const operatorModeAcknowledgments = recentPulses.filter(p => p.operator_mode_response === 'very_much' || p.operator_mode_response === 'somewhat').length;
    const operatorRate = operatorModeAcknowledgments / Math.max(recentPulses.length, 1);
    components.operator_mode = trend.overload_acknowledgment_rate > 0.7 ? Math.min(20, Math.round(operatorRate * 25)) : Math.min(10, Math.round(operatorRate * 12));

    // Compute total
    const totalScore = Object.values(components).reduce((a, b) => a + b, 0);
    const burnoutScore = Math.min(100, totalScore);

    // Determine risk level
    let riskLevel = 'low';
    if (burnoutScore >= 70) riskLevel = 'high';
    else if (burnoutScore >= 50) riskLevel = 'elevated';
    else if (burnoutScore >= 30) riskLevel = 'moderate';

    // Collect warning flags
    const warningFlags = [];
    if (components.energy >= 20) warningFlags.push('Sustained energy drain detected');
    if (components.resilience >= 20) warningFlags.push('Resilience declining');
    if (components.cognitive_load >= 15) warningFlags.push('Cognitive clarity dropping');
    if (!hasRecovery) warningFlags.push('No bounce-back days in recent window');
    if (components.identity >= 5) warningFlags.push('Identity friction present');
    if (components.operator_mode >= 15) warningFlags.push('Chronic overcontrol pattern');

    // Generate recommendation
    let recommendation = '';
    if (burnoutScore >= 70) {
      recommendation = 'High burnout risk detected. Consider: delegation deep-dive, calendar reset, conversation with manager/HR.';
    } else if (burnoutScore >= 50) {
      recommendation = 'Elevated burnout risk. Focus on: recovery days, strategic delegation, energy management.';
    } else if (burnoutScore >= 30) {
      recommendation = 'Moderate stress signals. Monitor energy trends and ensure adequate recovery time.';
    } else {
      recommendation = 'Burnout risk is low. Continue current patterns.';
    }

    return Response.json({
      burnout_risk_score: burnoutScore,
      risk_level: riskLevel,
      components,
      warning_flags: warningFlags,
      recommendation,
      data_points_used: recentPulses.length
    });

  } catch (error) {
    console.error('Error computing burnout risk:', error);
    return Response.json(
      { error: error.message, burnout_risk_score: 0, risk_level: 'error' },
      { status: 500 }
    );
  }
});