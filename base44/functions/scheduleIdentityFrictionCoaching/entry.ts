/**
 * scheduleIdentityFrictionCoaching — targeted intervention for role identity transitions
 * 
 * Fires when identity_friction_signals >= 2 in 7 days
 * Creates differentiated coaching messages based on friction type and resilience state
 * Integrates with evaluatePredictiveTriggers (called when identity_friction trigger fires)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Coaching pathways based on identity friction + resilience combo
const IDENTITY_COACHING_PATHS = {
  role_uncertainty_strong_resilience: {
    theme: "Role clarity & confidence",
    message: "You've mentioned some friction with your role lately. You're handling it well so far — let's name what's shifting and what you need from it.",
    follow_up_prompt: "What part of your role feels different or uncertain right now?",
    recommendation: "1-1 with coach or manager to clarify expectations and fit"
  },
  role_uncertainty_fragile_resilience: {
    theme: "Role clarity & support",
    message: "Some tension with your role has shown up in your check-ins, and you're feeling a bit stretched. This is worth naming before it compounds.",
    follow_up_prompt: "Is there something in your role that no longer fits, or something you need support with?",
    recommendation: "Immediate 1-1 to assess fit and adjust workload or support"
  },
  identity_transition: {
    theme: "Identity transition support",
    message: "You've mentioned feeling uncertain about who you are in this role lately. That often means something real is shifting — and that's okay to name.",
    follow_up_prompt: "What's changing about how you see yourself as a leader?",
    recommendation: "Coaching focus: leadership identity workshop or reflection series"
  },
  role_mismatch_with_goals: {
    theme: "Bridging role and intent",
    message: "Your stated intentions haven't matched your actual days, and you're also reporting some role friction. These might be connected.",
    follow_up_prompt: "Is the friction about your role, or about how your role is being used?",
    recommendation: "Goal realignment + role clarity conversation"
  }
};

function selectCoachingPath(recentPulses, trends, recentActivity) {
  const frictionPulses = recentPulses.filter(p => p.identity_friction === true);
  const latestResilient = recentPulses[0]?.resilience_signal || 'holding';
  const latestEnergy = recentPulses[0]?.energy_level || 'steady';
  const hasGoalStall = (recentActivity[0]?.stalled_strategic_goals || 0) > 0;
  const hasDelegationGap = (trends.delegation_gap_count_7d || 0) > 0;

  // If resilience is fragile + high stress → urgency
  if ((latestResilient === 'depleted' || latestResilient === 'fragile') && 
      (latestEnergy === 'drained' || latestEnergy === 'stretched')) {
    return IDENTITY_COACHING_PATHS.role_uncertainty_fragile_resilience;
  }

  // If goal stall + identity friction → role mismatch
  if (hasGoalStall && frictionPulses.length >= 2) {
    return IDENTITY_COACHING_PATHS.role_mismatch_with_goals;
  }

  // If identity friction notes suggest transition → specialization
  const frictionNote = frictionPulses.find(p => p.identity_friction_note)?.identity_friction_note || '';
  if (frictionNote.toLowerCase().includes('transition') || 
      frictionNote.toLowerCase().includes('who i am') ||
      frictionNote.toLowerCase().includes('identity')) {
    return IDENTITY_COACHING_PATHS.identity_transition;
  }

  // Default: role uncertainty with good resilience
  return IDENTITY_COACHING_PATHS.role_uncertainty_strong_resilience;
}

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

    // Fetch manager's recent data
    const [pulses, trends, activity] = await Promise.all([
      base44.asServiceRole.entities.ManagerPulse.filter(
        { user_email: manager_email }, '-created_date', 15
      ),
      base44.asServiceRole.entities.ManagerTrends.filter(
        { user_email: manager_email }, '-last_trend_computed_at', 1
      ),
      base44.asServiceRole.entities.UserActivity.filter(
        { user_email: manager_email }, '-date', 3
      )
    ]);

    // Check if identity friction exists
    const frictionPulses = pulses.filter(p => p.identity_friction === true);
    if (frictionPulses.length < 2) {
      return Response.json({
        success: false,
        reason: 'Insufficient identity friction signals',
        friction_count: frictionPulses.length
      });
    }

    // Select appropriate coaching pathway
    const coachingPath = selectCoachingPath(pulses, trends[0] || {}, activity);

    // Create notification for manager
    const now = new Date();
    await base44.asServiceRole.entities.Notification.create({
      user_email: manager_email,
      type: 'atreus_checkin',
      priority: 'high',
      title: `Atreus: ${coachingPath.theme}`,
      message: coachingPath.message,
      action_url: '/my-leadership',
      status: 'sent',
      sent_at: now.toISOString(),
      related_entity_type: 'identity_friction_coaching',
      related_entity_id: coachingPath.theme.replace(/\s+/g, '_').toLowerCase()
    });

    // Create coaching context pulse
    await base44.asServiceRole.entities.ManagerPulse.create({
      user_email: manager_email,
      source: 'system',
      prompt_type: 'contextual',
      biggest_weight_today: `identity_coaching:${coachingPath.theme}`,
      identity_friction: true,
      identity_friction_note: `Coaching pathway: ${coachingPath.theme}`
    });

    // Log coaching intervention
    await base44.asServiceRole.entities.PulseAccessLog.create({
      accessed_by: 'system:scheduleIdentityFrictionCoaching',
      target_email: manager_email,
      entity_accessed: 'ManagerPulse',
      fields_accessed: ['identity_friction', 'identity_friction_note', 'resilience_signal'],
      reason_code: 'atreus_context',
      function_name: 'scheduleIdentityFrictionCoaching',
      timestamp: now.toISOString(),
      record_count: frictionPulses.length
    });

    return Response.json({
      success: true,
      coaching_path: coachingPath.theme,
      message: coachingPath.message,
      follow_up: coachingPath.follow_up_prompt,
      recommendation: coachingPath.recommendation,
      friction_signals_detected: frictionPulses.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});