/**
 * sendOneOnOneReminders
 * Runs every 5 minutes (via scheduled automation).
 * Sends reminder notifications for upcoming 1-on-1 sessions:
 *   - 24 hours before (to both coach and coachee)
 *   - 15 minutes before (to both coach and coachee)
 *
 * Reminders are sent as in-app Notifications (Atreus chat).
 * In future, Slack/Teams integrations would be handled here instead.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin or scheduled call
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== "admin" && user.app_role !== "Platform Admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // Windows: 24h ± 5 min and 15min ± 5 min
    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 55 * 60 * 1000); // 23h55m from now
    const window24hEnd   = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5  * 60 * 1000); // 24h05m from now
    const window15mStart = new Date(now.getTime() + 10 * 60 * 1000); // 10m from now
    const window15mEnd   = new Date(now.getTime() + 20 * 60 * 1000); // 20m from now

    // Fetch upcoming scheduled sessions in the next ~25 hours
    const lookAheadEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
    const lookAheadStart = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

    const sessions = await base44.asServiceRole.entities.CoachingSession.filter(
      { status: "scheduled" },
      "scheduled_date",
      200
    );

    const upcoming = sessions.filter(s => {
      const d = s.scheduled_date || s.session_date;
      if (!d) return false;
      return d >= lookAheadStart && d <= lookAheadEnd;
    });

    let sent = 0;
    const errors = [];

    for (const session of upcoming) {
      const sessionDate = new Date(session.scheduled_date || session.session_date);
      const coachEmail   = session.coach_email;
      const coacheeEmail = session.coachee_email || session.participant_email;
      if (!coachEmail || !coacheeEmail) continue;

      const is24h = sessionDate >= window24hStart && sessionDate <= window24hEnd;
      const is15m = sessionDate >= window15mStart && sessionDate <= window15mEnd;

      if (!is24h && !is15m) continue;

      const timeLabel = is15m ? "in 15 minutes" : "tomorrow";
      const sessionLabel = `1-on-1 with ${coacheeEmail}`;
      const coacheeLabel = `1-on-1 with ${coachEmail}`;
      const dateStr = sessionDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const reminderKey = `${session.id}_${is15m ? "15m" : "24h"}`;

      // De-duplicate: check if we already sent this reminder (using reminder_key tag in notification)
      const existing = await base44.asServiceRole.entities.Notification.filter(
        { type: "1on1_reminder" },
        "-created_date",
        500
      ).catch(() => []);

      const alreadySent = existing.some(n => n.metadata?.reminder_key === reminderKey);
      if (alreadySent) continue;

      const recipients = [
        {
          email: coachEmail,
          title: `Reminder: ${sessionLabel} ${timeLabel}`,
          message: `Your 1-on-1 with ${coacheeEmail} is scheduled for ${dateStr}.${session.meeting_link ? ` Join: ${session.meeting_link}` : ""} ${is24h && session.check_in_requested ? "Check the Check-In tab to review their submission before the meeting." : ""}`,
        },
        {
          email: coacheeEmail,
          title: `Reminder: ${coacheeLabel} ${timeLabel}`,
          message: `Your 1-on-1 with ${coachEmail} is scheduled for ${dateStr}.${session.meeting_link ? ` Join: ${session.meeting_link}` : ""} ${is24h && session.check_in_requested ? "Don't forget to submit your Check-In before the meeting." : ""}`,
        },
      ];

      for (const r of recipients) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: r.email,
            title: r.title,
            message: r.message,
            type: "1on1_reminder",
            is_read: false,
            scheduled_for: new Date().toISOString(),
            metadata: { reminder_key: reminderKey, session_id: session.id },
          });
          sent++;
        } catch (e) {
          errors.push(`${r.email}: ${e.message}`);
        }
      }
    }

    return Response.json({ ok: true, sent, sessions_checked: upcoming.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});