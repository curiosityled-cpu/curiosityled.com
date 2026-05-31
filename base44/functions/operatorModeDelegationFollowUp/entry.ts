// deno-lint-ignore-file no-undef
/**
 * operatorModeDelegationFollowUp
 * Triggered on Friday 5pm. If manager committed to delegation but didn't follow through,
 * schedule a gentle follow-up reflection.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email = user.email } = await req.json();

    const pulses = await base44.entities.ManagerPulse.filter({ user_email, focus_category: 'delegation' }, '-created_date', 7);
    const delegationIntents = pulses.filter(p => p.focus_intention && p.focus_category === 'delegation');

    if (delegationIntents.length === 0) {
      return Response.json({ message: 'No delegation intents this week' });
    }

    const gapsDetected = pulses.filter(p => p.intent_actuals_gap === 'declared_delegation_operator_mode_detected');

    if (gapsDetected.length > 0) {
      await base44.entities.Notification.create({
        user_email, type: 'nudge', title: 'Delegation Reflection',
        message: `You mentioned delegating "${delegationIntents[0].focus_intention}" this week. Let's reflect on what happened.`,
        priority: 'medium', scheduled_for: new Date().toISOString(),
      });

      const mondayMorning = new Date();
      mondayMorning.setDate(mondayMorning.getDate() + (1 + 7 - mondayMorning.getDay()) % 7 || 7);
      mondayMorning.setHours(8, 0, 0, 0);

      await base44.entities.Notification.create({
        user_email, type: 'nudge', title: 'Delegation Debrief',
        message: 'What got in the way of delegating this week? What could help next week?',
        priority: 'low', scheduled_for: mondayMorning.toISOString(),
      });

      return Response.json({ status: 'follow_up_scheduled', notification_count: 2, delegation_gap_detected: true });
    }

    return Response.json({ message: 'No gaps detected; manager on track' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});