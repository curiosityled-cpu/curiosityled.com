/**
 * scheduleWeeklyReflection
 *
 * Runs daily and prompts each person to reflect once a week, on the day the
 * organization chose in Organization Settings → Check-in Rhythm
 * (`weekly_reflection_day`). The day is read per tenant, so different
 * organizations can reflect on different days.
 *
 * Idempotent: one prompt per person per ISO week.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { authorizeScheduledTask } from "../../shared/scheduledTaskAuth.ts";
import {
  loadClientsById,
  settingsForUser,
  isReflectionDay,
  weekKey,
} from "../../shared/orgNotificationSettings.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const auth = await authorizeScheduledTask(req, base44);
    if (!auth.authorized) return auth.response;

    const now = new Date();
    const clientsById = await loadClientsById(base44);
    const users = await base44.asServiceRole.entities.User.list("-created_date", 1000).catch(() => []);

    let sent = 0;
    let skipped = 0;
    const thisWeek = weekKey(now);

    for (const user of users) {
      const email = user.email;
      if (!email) continue;

      const settings = settingsForUser(user, clientsById);

      // Only people in a tenant that reflects today.
      if (!isReflectionDay(settings, now)) {
        skipped++;
        continue;
      }

      const cycleKey = `weekly_reflection_${thisWeek}`;
      const recent = await base44.asServiceRole.entities.Notification.filter(
        { user_email: email, type: "atreus_checkin" },
        "-created_date",
        10
      ).catch(() => []);
      if (recent.some((n) => n.metadata?.cycle_key === cycleKey)) {
        skipped++;
        continue;
      }

      // Intent vs. actuals for the closing week, so the prompt says something
      // about this person's week rather than being generic.
      const pulses = await base44.asServiceRole.entities.ManagerPulse.filter(
        { user_email: email },
        "-created_date",
        28
      ).catch(() => []);

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekPulses = pulses.filter((p) => p.created_date && new Date(p.created_date) >= sevenDaysAgo);
      const intentions = weekPulses.filter((p) => p.prompt_type === "morning_intent").length;
      const actuals = weekPulses.filter((p) => p.prompt_type === "evening_actuals").length;
      const gaps = weekPulses.filter(
        (p) => p.intent_actuals_gap && p.intent_actuals_gap !== "no_gap_detected"
      ).length;

      const context =
        intentions || actuals
          ? ` This week: ${intentions} intention${intentions === 1 ? "" : "s"} logged, ${actuals} actual${actuals === 1 ? "" : "s"} recorded${gaps ? `, ${gaps} gap${gaps === 1 ? "" : "s"} between the two` : ""}.`
          : "";

      await base44.asServiceRole.entities.Notification.create({
        user_email: email,
        type: "atreus_checkin",
        title: "Weekly Focus Reflection",
        message: `Take 5 minutes to reflect on this week: What went well? What surprised you? What did you learn?${context}`,
        scheduled_for: now.toISOString(),
        status: "pending",
        priority: "medium",
        action_url: "/today",
        metadata: { cycle_key: cycleKey, week_summary: { intentions, actuals, gaps } },
      });

      sent++;
    }

    return Response.json({
      ok: true,
      week: thisWeek,
      reminders_sent: sent,
      skipped,
      total_users_checked: users.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});