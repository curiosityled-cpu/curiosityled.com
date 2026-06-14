/**
 * computeEveningActuals — 5pm local-time intent vs actuals comparison.
 *
 * For each manager who declared a morning intent today:
 *   1. Reads today's UserActivity signals.
 *   2. Compares against declared focus_category.
 *   3. Writes intent_actuals_gap to a new ManagerPulse record.
 *   4. Schedules the evening follow-up prompt via sendTeamsPrompt.
 *
 * Supported v1 comparisons:
 *   - delegation vs operator mode
 *   - strategic_work vs tactical overload (meeting-heavy day)
 *   - team_support vs long gap since 1:1
 *
 * Respects user timezone. Does not fire when insufficient same-day context exists.
 * Admin-only. Invoked by scheduled automation at 17:00 UTC (adjust per tenant TZ).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function detectGap(focusCategory, activity, morningPulse) {
  if (!activity) return 'insufficient_data';

  const meetingMinutes = activity.meeting_minutes_day || 0;
  const stalledGoals = activity.stalled_strategic_goals || 0;
  const backToBacks = activity.back_to_back_density || 0;
  const daysSince1on1 = activity.days_since_last_1on1;

  // Operator mode proxy: heavy meetings + stalled strategic goals
  const operatorModeSignal = meetingMinutes > 240 && stalledGoals >= 1;
  // Tactical overload: extremely packed calendar
  const tacticalOverloadSignal = meetingMinutes > 300 || backToBacks > 0.6;
  // Low 1:1: hasn't had 1:1 in over 10 days
  const low1on1Signal = daysSince1on1 != null && daysSince1on1 > 10;

  switch (focusCategory) {
    case 'delegation':
      return operatorModeSignal
        ? 'declared_delegation_operator_mode_detected'
        : 'no_gap_detected';

    case 'strategic_work':
      return tacticalOverloadSignal
        ? 'declared_strategic_tactical_overload_detected'
        : 'no_gap_detected';

    case 'team_support':
      return low1on1Signal
        ? 'declared_team_support_low_1on1_detected'
        : 'no_gap_detected';

    default:
      return 'no_gap_detected';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const results = [];

    // Find all managers who declared a morning intent today
    const todayIntents = await base44.asServiceRole.entities.ManagerPulse.filter(
      { prompt_type: 'morning_intent' }, '-created_date', 200
    );

    const todayMorningIntents = todayIntents.filter(p =>
      p.created_date?.toString().startsWith(todayStr) && p.focus_category
    );

    if (todayMorningIntents.length === 0) {
      return Response.json({ processed: 0, reason: 'No morning intents found for today' });
    }

    // Deduplicate by email (use the most recent intent per manager)
    const byEmail = {};
    for (const pulse of todayMorningIntents) {
      if (!byEmail[pulse.user_email] || new Date(pulse.created_date) > new Date(byEmail[pulse.user_email].created_date)) {
        byEmail[pulse.user_email] = pulse;
      }
    }

    for (const [email, morningPulse] of Object.entries(byEmail)) {
      try {
        // Check timezone — skip if it's not yet 5pm for this manager
        const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
          { user_email: email }, '-created_date', 1
        );
        const userTimezone = tonePrefs[0]?.user_timezone || 'America/New_York';
        const localHour = parseInt(
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: userTimezone })
        );

        if (localHour < 16) {
          results.push({ email, status: 'skipped', reason: `Not yet 4pm local time (${localHour}:xx)` });
          continue;
        }

        // Check we haven't already processed actuals today for this manager
        const existingActuals = await base44.asServiceRole.entities.ManagerPulse.filter(
          { user_email: email, prompt_type: 'evening_actuals' }, '-created_date', 5
        );
        const alreadyDoneToday = existingActuals.some(p =>
          p.created_date?.toString().startsWith(todayStr)
        );
        if (alreadyDoneToday) {
          results.push({ email, status: 'skipped', reason: 'Already processed today' });
          continue;
        }

        // Fetch today's activity
        const activityRecords = await base44.asServiceRole.entities.UserActivity.filter(
          { user_email: email, date: todayStr }, '-date', 1
        );
        const todayActivity = activityRecords[0] || null;

        // Detect gap
        const gap = detectGap(morningPulse.focus_category, todayActivity, morningPulse);

        // Write evening actuals pulse
        await base44.asServiceRole.entities.ManagerPulse.create({
          user_email: email,
          source: 'system',
          prompt_type: 'evening_actuals',
          intent_actuals_gap: gap,
          focus_category: morningPulse.focus_category,
          follow_up_sent: false,
        });

        // Log access
        await base44.asServiceRole.entities.PulseAccessLog.create({
          accessed_by: 'system:computeEveningActuals',
          target_email: email,
          entity_accessed: 'ManagerPulse',
          fields_accessed: ['focus_category', 'intent_actuals_gap'],
          reason_code: 'computeEveningActuals',
          function_name: 'computeEveningActuals',
          timestamp: new Date().toISOString(),
          record_count: 1,
        });

        // If mismatch detected — trigger evening follow-up prompt
        if (gap !== 'no_gap_detected' && gap !== 'insufficient_data') {
          await base44.asServiceRole.functions.invoke('sendTeamsPrompt', {
            user_email: email,
            prompt_type: 'follow_up',
            morning_intent: morningPulse.focus_category,
            force: true,
          });
        }

        results.push({ email, status: 'ok', gap, focus_category: morningPulse.focus_category });

      } catch (err) {
        results.push({ email, status: 'error', error: err.message });
      }
    }

    return Response.json({
      processed: results.filter(r => r.status === 'ok').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});