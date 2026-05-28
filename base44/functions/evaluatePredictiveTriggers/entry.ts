/**
 * evaluatePredictiveTriggers — proactive coaching intervention engine.
 *
 * Runs after computeBehaviorTrends (nightly). Reads each manager's ManagerTrends
 * and fires targeted coaching nudges when behavioural thresholds are crossed.
 *
 * Trigger rules:
 *   1. CONFIDENCE_DIP     — confidence_trend = 'declining' AND ≥2 consecutive low/uncertain pulses
 *   2. LEARNING_STALL     — learning_stall_detected AND learning_inertia_days > 7
 *   3. DELEGATION_GAP     — delegation_gap_count_7d ≥ 2 (declared but didn't do)
 *   4. SUSTAINED_OVERLOAD — overload_pattern_strength ≥ 70 AND operator_risk_trajectory = 'increasing'
 *   5. IDENTITY_FRICTION  — identity_friction_signals ≥ 2 in last 7 days
 *
 * Each trigger:
 *   - Is rate-limited (one nudge per trigger type per 7 days per manager)
 *   - Creates a Notification record (in-product delivery)
 *   - Optionally writes a system ManagerPulse to surface coaching prompt
 *   - Logs in PulseAccessLog for audit
 *
 * Admin-only. Invoked by scheduled automation nightly after computeBehaviorTrends.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Trigger definitions ──────────────────────────────────────────────────────

const TRIGGERS = {
  confidence_dip: {
    check: (trends, recentPulses) => {
      if (trends.confidence_trend !== 'declining') return false;
      const lowConf = recentPulses
        .slice(0, 5)
        .filter(p => ['low', 'uncertain'].includes(p.confidence_today));
      return lowConf.length >= 2;
    },
    notification: {
      type: 'atreus_checkin',
      priority: 'high',
      title: 'Atreus noticed something',
      message: "Your confidence has been dipping over the last few check-ins. Atreus has a short reflection waiting for you.",
      action_url: '/my-leadership',
    },
    pulse_prompt_type: 'contextual',
    coaching_context: 'confidence_dip',
  },
  learning_stall: {
    check: (trends, recentPulses, recentActivity) => {
      return trends.learning_stall_detected === true &&
        (recentActivity[0]?.learning_inertia_days || 0) > 7;
    },
    notification: {
      type: 'atreus_checkin',
      priority: 'medium',
      title: "It's been a while since your last learning moment",
      message: "Atreus noticed your development momentum has slowed. A small action now can reset the pattern.",
      action_url: '/my-development',
    },
    pulse_prompt_type: null, // surfaces in MyDevelopment, not check-in
    coaching_context: 'learning_stall',
  },
  delegation_gap: {
    check: (trends) => {
      return (trends.delegation_gap_count_7d || 0) >= 2;
    },
    notification: {
      type: 'atreus_checkin',
      priority: 'high',
      title: "Your delegation intentions aren't landing",
      message: "You've said you want to delegate more — but it's not showing up in how your week plays out. Atreus wants to explore why.",
      action_url: '/my-leadership',
    },
    pulse_prompt_type: 'follow_up',
    coaching_context: 'delegation_gap',
  },
  sustained_overload: {
    check: (trends) => {
      return trends.overload_pattern_strength >= 70 &&
        trends.operator_risk_trajectory === 'increasing';
    },
    notification: {
      type: 'atreus_checkin',
      priority: 'urgent',
      title: 'A pattern Atreus wants to name',
      message: "Your overload signals have been building and your risk trajectory is climbing. This is the pattern that matters most to address now.",
      action_url: '/my-leadership',
    },
    pulse_prompt_type: 'overload_check',
    coaching_context: 'sustained_overload',
  },
  identity_friction: {
    check: (trends, recentPulses) => {
      const frictionPulses = recentPulses
        .slice(0, 10)
        .filter(p => p.identity_friction === true);
      return frictionPulses.length >= 2;
    },
    notification: {
      type: 'atreus_checkin',
      priority: 'high',
      title: 'Something in your role might be shifting',
      message: "Atreus has picked up signs of friction with how your role feels right now. It's worth a quick conversation.",
      action_url: '/my-leadership',
    },
    pulse_prompt_type: 'contextual',
    coaching_context: 'identity_friction',
  },
};

// ─── Rate-limit check: was this trigger fired in the last 7 days? ─────────────

function wasRecentlyFired(recentNotifs, triggerKey) {
  const cutoff = new Date(Date.now() - 7 * 86400000);
  return recentNotifs.some(n =>
    n.related_entity_type === 'predictive_trigger' &&
    n.related_entity_id === triggerKey &&
    n.created_date && new Date(n.created_date) > cutoff
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const date7dAgo = new Date(now.getTime() - 7 * 86400000);

    // All managers with a TonePreference (= have completed onboarding)
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.list('-created_date', 200);
    const managerEmails = [...new Set(tonePrefs.map(t => t.user_email).filter(Boolean))];

    if (managerEmails.length === 0) {
      return Response.json({ processed: 0, reason: 'No onboarded managers found' });
    }

    const results = [];

    for (const email of managerEmails) {
      try {
        // Fetch manager's current trends
        const [trendsArr, recentPulses, recentActivity, recentNotifs] = await Promise.all([
          base44.asServiceRole.entities.ManagerTrends.filter({ user_email: email }, '-last_trend_computed_at', 1),
          base44.asServiceRole.entities.ManagerPulse.filter({ user_email: email }, '-created_date', 15),
          base44.asServiceRole.entities.UserActivity.filter({ user_email: email }, '-date', 3),
          base44.asServiceRole.entities.Notification.filter({ user_email: email }, '-created_date', 20),
        ]);

        const trends = trendsArr[0];
        if (!trends) {
          results.push({ email, status: 'skipped', reason: 'No trends computed yet' });
          continue;
        }

        // Minimum data gate — need at least 3 data points
        if ((trends.data_points_14d || 0) < 3) {
          results.push({ email, status: 'skipped', reason: 'Insufficient data points' });
          continue;
        }

        const fired = [];

        // Evaluate each trigger
        for (const [triggerKey, trigger] of Object.entries(TRIGGERS)) {
          // Rate limit: skip if fired in last 7 days
          if (wasRecentlyFired(recentNotifs, triggerKey)) {
            continue;
          }

          const shouldFire = trigger.check(trends, recentPulses, recentActivity);
          if (!shouldFire) continue;

          // Create notification
          await base44.asServiceRole.entities.Notification.create({
            user_email: email,
            type: trigger.notification.type,
            title: trigger.notification.title,
            message: trigger.notification.message,
            status: 'sent',
            sent_at: now.toISOString(),
            priority: trigger.notification.priority,
            related_entity_type: 'predictive_trigger',
            related_entity_id: triggerKey,
            action_url: trigger.notification.action_url,
            is_read: false,
          });

          // Optionally write a system pulse marker to surface targeted check-in
          if (trigger.pulse_prompt_type) {
            await base44.asServiceRole.entities.ManagerPulse.create({
              user_email: email,
              source: 'system',
              prompt_type: trigger.pulse_prompt_type,
              biggest_weight_today: `trigger:${triggerKey}:${now.toISOString().split('T')[0]}`,
            });
          }

          fired.push(triggerKey);
        }

        // Audit log
        await base44.asServiceRole.entities.PulseAccessLog.create({
          accessed_by: 'system:evaluatePredictiveTriggers',
          target_email: email,
          entity_accessed: 'ManagerTrends',
          fields_accessed: ['confidence_trend', 'learning_stall_detected', 'delegation_gap_count_7d', 'overload_pattern_strength', 'operator_risk_trajectory'],
          reason_code: 'computeBehaviorTrends',
          function_name: 'evaluatePredictiveTriggers',
          timestamp: now.toISOString(),
          record_count: 1,
        });

        results.push({ email, status: 'ok', triggers_fired: fired });

      } catch (err) {
        results.push({ email, status: 'error', error: err.message });
      }
    }

    return Response.json({
      processed: results.filter(r => r.status === 'ok').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'error').length,
      triggers_total: results.reduce((a, r) => a + (r.triggers_fired?.length || 0), 0),
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});