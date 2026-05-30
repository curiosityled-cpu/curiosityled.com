// deno-lint-ignore-file no-undef
/**
 * createEmotionalStateAlerts
 * 
 * Monitors confidence, resilience, and motivation dips.
 * Creates pinned notifications when thresholds are breached.
 * Called daily by orchestrateDailyCadence.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email } = await req.json();

    if (!user_email) {
      return Response.json({ error: 'user_email required' }, { status: 400 });
    }

    const alerts = [];

    // Fetch last 14 pulses to detect trends
    const recentPulses = await base44.entities.ManagerPulse.filter(
      { user_email },
      '-created_date',
      14
    );

    if (recentPulses.length < 3) {
      return Response.json({ message: 'Not enough data for trends' });
    }

    // Get trends
    const trends = await base44.entities.ManagerTrends.filter(
      { user_email },
      null,
      1
    );
    const trend = trends[0];

    // Alert 1: Confidence dip
    if (trend?.confidence_trend === 'declining') {
      const confidenceLevels = recentPulses
        .filter(p => p.confidence_today)
        .map(p => ({ low: 1, uncertain: 2, steady: 3, high: 4 }[p.confidence_today] || 0))
        .slice(0, 7);

      const avgConfidence = confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length;

      if (avgConfidence <= 2) {
        await base44.entities.Notification.create({
          user_email,
          type: 'nudge',
          title: '⚠️ Confidence Alert',
          message: 'Your confidence has been dipping. Let\'s talk about what\'s shaking your faith in your leadership.',
          priority: 'high',
          scheduled_for: new Date().toISOString(),
        });
        alerts.push('confidence_dip');
      }
    }

    // Alert 2: Resilience depletion
    if (trend?.resilience_trend === 'declining') {
      const resilienceLevels = recentPulses
        .filter(p => p.resilience_signal)
        .map(p => ({ depleted: 1, fragile: 2, holding: 3, bouncing_back: 4 }[p.resilience_signal] || 0))
        .slice(0, 7);

      const avgResilience = resilienceLevels.reduce((a, b) => a + b, 0) / resilienceLevels.length;

      if (avgResilience <= 1.5) {
        await base44.entities.Notification.create({
          user_email,
          type: 'nudge',
          title: '🔋 Recovery Alert',
          message: 'Your resilience is low. You might be in recovery mode. Consider protecting some time for rest this week.',
          priority: 'high',
          scheduled_for: new Date().toISOString(),
        });
        alerts.push('resilience_depletion');
      }
    }

    // Alert 3: Identity friction (existential doubt)
    const identityFrictionCount = recentPulses
      .filter(p => p.identity_friction)
      .slice(0, 7).length;

    if (identityFrictionCount >= 3) {
      await base44.entities.Notification.create({
        user_email,
        type: 'nudge',
        title: '🤔 Role Identity Alert',
        message: 'You\'ve mentioned feeling uncertain about your role several times recently. This might be worth exploring with a mentor or coach.',
        priority: 'medium',
        scheduled_for: new Date().toISOString(),
      });
      alerts.push('identity_friction');
    }

    // Alert 4: Sustained operator mode
    const operatorModeCount = recentPulses
      .filter(p => p.operator_mode_response === 'very_much' || p.operator_mode_response === 'somewhat')
      .slice(0, 7).length;

    if (operatorModeCount >= 4) {
      await base44.entities.Notification.create({
        user_email,
        type: 'nudge',
        title: '⚡ Operator Mode Pattern',
        message: 'You\'ve been in operator mode (overloaded + controlling) most of this week. This is unsustainable. What needs to change?',
        priority: 'high',
        scheduled_for: new Date().toISOString(),
      });
      alerts.push('sustained_operator_mode');
    }

    return Response.json({
      status: 'alerts_created',
      alerts_triggered: alerts,
      count: alerts.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});