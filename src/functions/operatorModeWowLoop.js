/**
 * operatorModeWowLoop
 *
 * Orchestrates the "operator mode" closed loop:
 * 1. Detect overload + overcontrol pattern (from evening actuals)
 * 2. Create follow-up notification for Friday
 * 3. Auto-schedule Monday morning debrief
 * 4. Track whether delegation commitment was fulfilled
 *
 * Called by computeEveningActuals automation trigger
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

    const { user_email = user.email } = await req.json();

    // Fetch today's pulses to detect operator mode
    const today = new Date().toISOString().split('T')[0];
    const todayPulses = await base44.entities.ManagerPulse.filter(
      { user_email },
      '-created_date',
      20
    ).catch(() => []);

    const todayPulse = todayPulses.find(p =>
      p.created_date.startsWith(today)
    );

    if (!todayPulse) {
      return Response.json({ message: 'No pulse data for today' });
    }

    // Detect operator mode: overload + overcontrol
    const isOverloaded = todayPulse.perceived_load === 'unsustainable' ||
      todayPulse.perceived_load === 'heavy';
    const isOvercontrolling = todayPulse.operator_mode_response === 'very_much' ||
      todayPulse.operator_mode_response === 'somewhat';

    const operatorModeDetected = isOverloaded && isOvercontrolling;

    // Fetch tone preference for tone-aware messaging
    const tonePrefs = await base44.entities.TonePreference.filter(
      { user_email },
      null,
      1
    ).catch(() => []);

    const tonePref = tonePrefs[0]?.tone_mode || 'warm_candid';

    // If operator mode detected, schedule Friday follow-up
    if (operatorModeDetected) {
      const fridayDate = new Date();
      const daysUntilFriday = (5 - fridayDate.getDay() + 7) % 7 || 7;
      fridayDate.setDate(fridayDate.getDate() + daysUntilFriday);
      fridayDate.setHours(17, 0, 0, 0); // 5pm

      // Create notification for Friday reflection
      await base44.entities.Notification.create({
        user_email,
        type: 'nudge',
        priority: 'high',
        title: 'Operator Mode Check-in',
        message: 'This week you\'ve been in operator mode (overloaded + controlling). Friday reflection: what needs to change?',
        scheduled_for: fridayDate.toISOString(),
      }).catch(() => {});

      // Schedule Monday morning debrief (next Monday 8am)
      const mondayDate = new Date();
      const daysUntilMonday = (1 - mondayDate.getDay() + 7) % 7 || 7;
      mondayDate.setDate(mondayDate.getDate() + daysUntilMonday);
      mondayDate.setHours(8, 0, 0, 0);

      await base44.entities.Notification.create({
        user_email,
        type: 'nudge',
        priority: 'medium',
        title: 'Operator Mode Debrief',
        message: 'Let\'s debrief: what caused the overload this week? What can we delegate or deprioritize next week?',
        scheduled_for: mondayDate.toISOString(),
      }).catch(() => {});

      // If delegation was mentioned, track it
      if (todayPulse.delegation_commitment) {
        // Mark for end-of-week follow-up
        const endOfWeekDate = new Date();
        endOfWeekDate.setDate(endOfWeekDate.getDate() + daysUntilFriday);
        endOfWeekDate.setHours(17, 30, 0, 0); // 5:30pm Friday

        await base44.entities.Notification.create({
          user_email,
          type: 'nudge',
          priority: 'low',
          title: 'Delegation Follow-up',
          message: `You committed to: "${todayPulse.delegation_commitment}". Did it move forward this week?`,
          scheduled_for: endOfWeekDate.toISOString(),
        }).catch(() => {});
      }
    }

    // Check for sustained operator mode (3+ days this week)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekPulses = await base44.entities.ManagerPulse.filter(
      { user_email },
      null,
      100
    ).catch(() => []);

    const weekOperatorModeDays = weekPulses.filter(p => {
      const pDate = new Date(p.created_date);
      return pDate >= weekStart &&
        (p.perceived_load === 'unsustainable' || p.perceived_load === 'heavy') &&
        (p.operator_mode_response === 'very_much' || p.operator_mode_response === 'somewhat');
    }).length;

    if (weekOperatorModeDays >= 3) {
      // Escalate to high-priority alert
      await base44.entities.Notification.create({
        user_email,
        type: 'nudge',
        priority: 'high',
        title: '⚠️ Sustained Operator Mode Alert',
        message: `You've been in operator mode ${weekOperatorModeDays} days this week. This pattern is unsustainable. Let's talk to Atreus about breaking it.`,
        scheduled_for: new Date().toISOString(),
      }).catch(() => {});
    }

    return Response.json({
      status: 'loop_orchestrated',
      operator_mode_detected: operatorModeDetected,
      sustained_operator_days: weekOperatorModeDays,
      tone_mode: tonePref,
      actions_scheduled: operatorModeDetected ? ['friday_check_in', 'monday_debrief', 'delegation_follow_up'] : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});