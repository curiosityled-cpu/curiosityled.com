/**
 * computeEveningActuals — compares morning intent against observed behavior.
 *
 * Runs at ~5pm local time per manager. If the manager declared a morning intent
 * earlier that day, this function checks whether their calendar + goal signals
 * match what they said they'd focus on.
 *
 * When a gap is detected, it writes an evening_actuals ManagerPulse record and
 * can trigger a follow-up prompt via sendTeamsPrompt.
 *
 * Schedule: 9pm UTC daily (allows for various timezones).
 * Fine-grained local-time handling uses TonePreference.user_timezone.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Gap detection logic ──────────────────────────────────────────────────────

function detectGap(focusCategory, todayActivity) {
  if (!todayActivity) return 'insufficient_data';

  const meetingHeavy = (todayActivity.meeting_minutes_day || 0) > 240; // 4+ hours
  const stalledGoals = (todayActivity.stalled_strategic_goals || 0) >= 1;
  const highMeetingCount = (todayActivity.meeting_count_day || 0) >= 7;
  const longSince1on1 = (todayActivity.days_since_last_1on1 || 0) > 10;

  switch (focusCategory) {
    case 'delegation':
      // Operator mode signals: heavy meetings + stalled strategic goals
      if ((meetingHeavy || highMeetingCount) && stalledGoals) {
        return 'declared_delegation_operator_mode_detected';
      }
      break;

    case 'strategic_work':
      // Tactical overload: too much meeting time to do strategic work
      if (meetingHeavy && highMeetingCount) {
        return 'declared_strategic_tactical_overload_detected';
      }
      break;

    case 'team_support':
      // No 1:1 contact despite team support intent
      if (longSince1on1) {
        return 'declared_team_support_low_1on1_detected';
      }
      break;

    default:
      break;
  }

  return 'no_gap_detected';
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (user && user.app_role !== 'Platform Admin' && user.app_role !== 'Super Administrator' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.user_email || null;
    const today = new Date().toISOString().split('T')[0];

    let managers = [];
    if (targetEmail) {
      managers = [{ email: targetEmail }];
    } else {
      const allUsers = await base44.asServiceRole.entities.User.filter(
        { app_role: { $in: ['User Level 1', 'User Level 2'] } },
        null, 500
      );
      managers = allUsers.map(u => ({ email: u.email }));
    }

    const results = [];

    for (const manager of managers) {
      const email = manager.email;

      // Find today's morning intent
      const todayPulses = await base44.asServiceRole.entities.ManagerPulse.filter(
        { user_email: email }, '-created_date', 10
      );

      const morningIntent = todayPulses.find(p =>
        p.prompt_type === 'morning_intent' &&
        p.created_date?.toString().startsWith(today)
      );

      if (!morningIntent || !morningIntent.focus_category) {
        results.push({ email, skipped: true, reason: 'no_morning_intent_today' });
        continue;
      }

      // Check if we already ran evening actuals today
      const alreadyRan = todayPulses.find(p =>
        p.prompt_type === 'evening_actuals' &&
        p.created_date?.toString().startsWith(today)
      );

      if (alreadyRan) {
        results.push({ email, skipped: true, reason: 'already_ran_today' });
        continue;
      }

      // Get today's activity
      const todayActivity = await base44.asServiceRole.entities.UserActivity.filter(
        { user_email: email, date: today }, '-created_date', 1
      ).then(r => r[0] || null);

      // Detect the gap
      const gap = detectGap(morningIntent.focus_category, todayActivity);

      // Log the access
      await base44.asServiceRole.entities.PulseAccessLog.create({
        accessed_by: 'system:computeEveningActuals',
        target_email: email,
        entity_accessed: 'ManagerPulse',
        fields_accessed: ['focus_category', 'focus_intention', 'prompt_type'],
        reason_code: 'computeEveningActuals',
        function_name: 'computeEveningActuals',
        timestamp: new Date().toISOString(),
        record_count: todayPulses.length,
      }).catch(() => null);

      // Write evening actuals record
      await base44.asServiceRole.entities.ManagerPulse.create({
        user_email: email,
        source: 'system',
        prompt_type: 'evening_actuals',
        focus_category: morningIntent.focus_category,
        intent_actuals_gap: gap,
      });

      // If a gap was detected, trigger a follow-up prompt
      if (gap !== 'no_gap_detected' && gap !== 'insufficient_data') {
        await base44.asServiceRole.functions.invoke('sendTeamsPrompt', {
          user_email: email,
          prompt_type: 'follow_up',
          evening_gap: gap,
          morning_intent: morningIntent.focus_category,
          force: false,
        }).catch(e => console.warn(`Follow-up prompt failed for ${email}:`, e.message));
      }

      results.push({
        email,
        processed: true,
        focus_category: morningIntent.focus_category,
        gap_detected: gap,
        follow_up_triggered: gap !== 'no_gap_detected' && gap !== 'insufficient_data',
      });
    }

    return Response.json({
      processed: results.filter(r => r.processed).length,
      skipped: results.filter(r => r.skipped).length,
      date: today,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});