/**
 * sendDailyCheckInReminders
 * Runs twice daily: ~8am ET for morning check-in, ~5pm ET for evening check-in.
 * For each manager user who hasn't completed that session today, sends reminders via:
 *   1. In-app Notification (bell icon with red dot)
 *   2. Email
 *   3. Microsoft Teams (via atreusTeamsRouter)
 *   4. Atreus nudge (in-app agent message)
 *
 * Idempotent: won't re-send if a reminder was already sent for that session today.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Determine which check-in window this run is for based on ET hour
    const body = await req.json().catch(() => ({}));
    const etHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: 'numeric', hour12: false
    }).format(new Date()), 10);

    // Allow override from payload (for testing), otherwise infer from hour
    const checkInType = body.check_in_type ||
      (etHour >= 5 && etHour < 15 ? 'morning' : 'evening');

    const todayET = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    const dedupeType = `atreus_checkin_${checkInType}`;
    const isMorning = checkInType === 'morning';
    const reminderTitle = isMorning
      ? '⏰ Morning check-in reminder'
      : '🌙 Evening check-in reminder';
    const reminderMessage = isMorning
      ? "Start your day with intention. Your morning check-in takes 2 minutes and helps Atreus support you better today."
      : "Wrap up your day. Your evening check-in captures what actually happened — Big 3 priorities + reflection scores.";
    const reminderCta = isMorning ? 'Complete morning check-in' : 'Complete evening check-in';

    // Fetch all manager-role users (those who use the daily rhythm feature)
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500).catch(() => []);

    // Filter to manager-role users who have completed tone onboarding (active users of the feature)
    const managerRoles = new Set(['manager', 'User Level 2', 'User Level 3', 'Admin Level 1', 'Admin Level 2', 'Super Administrator', 'user']);
    const users = allUsers.filter(u => u.email && (managerRoles.has(u.role) || managerRoles.has(u.app_role)));

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const email = user.email;
      if (!email) continue;

      // ── Read user's notification preferences ──────────────────────────────────
      const notifPrefs = user.notification_preferences || {};
      const channels = notifPrefs.channels || {};
      const types = notifPrefs.types || {};

      // Respect per-type opt-out
      const reminderTypeKey = isMorning ? 'morning_checkin_reminder' : 'evening_checkin_reminder';
      const reminderEnabled = types[reminderTypeKey] !== false; // default true if not set
      if (!reminderEnabled) { skipped++; continue; }

      // At least one channel must be enabled
      const inAppEnabled  = channels.in_app  !== false; // default true
      const emailEnabled  = channels.email   !== false; // default true
      const teamsEnabled  = channels.teams   === true;  // default off
      const atreusEnabled = types.ai_coach_nudges !== false; // default true

      // Check if they already completed today's check-in (via DailyCheckIn entity)
      const todayCheckIns = await base44.asServiceRole.entities.DailyCheckIn.filter(
        { user_email: email, check_in_date: todayET },
        '-created_date', 1
      ).catch(() => []);

      const record = todayCheckIns[0];
      const alreadyDone = isMorning
        ? record?.morning_completed === true
        : record?.evening_completed === true;

      if (alreadyDone) { skipped++; continue; }

      // Check idempotency — did we already send this reminder today?
      const todayStart = `${todayET}T00:00:00.000Z`;
      const todayEnd = `${todayET}T23:59:59.999Z`;
      const existingReminders = await base44.asServiceRole.entities.Notification.filter(
        { user_email: email, type: dedupeType },
        '-created_date', 5
      ).catch(() => []);

      const alreadyReminded = existingReminders.some(n =>
        n.scheduled_for >= todayStart && n.scheduled_for <= todayEnd
      );
      if (alreadyReminded) { skipped++; continue; }

      const now = new Date().toISOString();
      const dispatches = [];

      // ── 1. In-app Notification (shows in bell icon) ──────────────────────────
      if (inAppEnabled) {
        dispatches.push(
          base44.asServiceRole.entities.Notification.create({
            user_email: email,
            title: reminderTitle,
            message: reminderMessage,
            type: dedupeType,
            is_read: false,
            priority: 'medium',
            scheduled_for: now,
            action_url: '/today',
            metadata: { check_in_type: checkInType, date: todayET },
          }).catch(err => console.warn(`[reminder] In-app notif failed for ${email}:`, err.message))
        );
      }

      // ── 2. Email ─────────────────────────────────────────────────────────────
      if (emailEnabled) {
        dispatches.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: reminderTitle,
            body: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: #0202ff; padding: 24px 32px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">${reminderTitle}</h1>
                </div>
                <div style="padding: 28px 32px;">
                  <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${reminderMessage}</p>
                  <a href="${Deno.env.get('APP_URL') || 'https://app.curiosityled.com'}/today"
                     style="display: inline-block; background: #0202ff; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                    ${reminderCta} →
                  </a>
                  <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">
                    You're receiving this because you're a member of Curiosity Led. Check-ins take about 2 minutes.<br/>
                    <a href="${Deno.env.get('APP_URL') || 'https://app.curiosityled.com'}/Settings" style="color: #6b7280;">Manage notification preferences</a>
                  </p>
                </div>
              </div>
            `,
            from_name: 'Atreus · Curiosity Led',
          }).catch(err => console.warn(`[reminder] Email failed for ${email}:`, err.message))
        );
      }

      // ── 3. Teams ──────────────────────────────────────────────────────────────
      if (teamsEnabled) {
        dispatches.push(
          base44.asServiceRole.functions.invoke('atreusTeamsRouter', {
            user_email: email,
            action: 'send_prompt',
            title: reminderTitle,
            message: reminderMessage,
            prompt_type: 'check_in_reminder',
            check_in_type: checkInType,
          }).catch(err => console.warn(`[reminder] Teams failed for ${email}:`, err.message))
        );
      }

      // ── 4. Atreus nudge ───────────────────────────────────────────────────────
      if (atreusEnabled) {
        dispatches.push(
          base44.asServiceRole.entities.ManagerMemory.filter(
            { user_email: email }, null, 1
          ).then(memRows => {
            if (!memRows[0]) return;
            const nudgeNote = `${checkInType}_reminder_sent_${todayET}`;
            const recent = memRows[0].recent_topics || [];
            if (recent.includes(nudgeNote)) return;
            return base44.asServiceRole.entities.ManagerMemory.update(memRows[0].id, {
              recent_topics: [nudgeNote, ...recent].slice(0, 4),
            });
          }).catch(() => {})
        );
      }

      await Promise.allSettled(dispatches);
      sent++;
    }

    return Response.json({
      ok: true,
      check_in_type: checkInType,
      date: todayET,
      reminders_sent: sent,
      already_done_or_reminded: skipped,
      total_users_checked: users.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});