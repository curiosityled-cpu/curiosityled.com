/**
 * scheduleRecurringCheckIns
 * Runs daily. For any cadenced 1-on-1 sessions (weekly, biweekly, monthly)
 * that are coming up in the next 48 hours, creates a check-in request
 * notification if one hasn't been sent for this cycle yet.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const window48hStart = now.toISOString();
    const window48hEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // Find cadenced sessions coming up in the next 48 hours
    const sessions = await base44.asServiceRole.entities.CoachingSession.filter(
      { status: "scheduled" },
      "scheduled_date",
      200
    );

    const cadencedSessions = sessions.filter(s => {
      const d = s.scheduled_date || s.session_date;
      if (!d) return false;
      const hasCadence = s.cadence && s.cadence !== "none";
      const inWindow = d >= window48hStart && d <= window48hEnd;
      const checkInRequested = s.check_in_requested === true;
      return hasCadence && inWindow && checkInRequested;
    });

    let created = 0;

    for (const session of cadencedSessions) {
      const coachEmail   = session.coach_email;
      const coacheeEmail = session.coachee_email || session.participant_email;
      if (!coachEmail || !coacheeEmail) continue;

      const sessionDate = new Date(session.scheduled_date || session.session_date);
      const weekOf = sessionDate.toISOString().split("T")[0];
      const cycleKey = `${session.id}_checkin_${weekOf}`;

      // Check if a check-in for this cycle already exists
      const existingCheckIns = await base44.asServiceRole.entities.WeeklyCheckIn.filter(
        { coaching_session_id: session.id, week_of: weekOf },
        "-created_date",
        1
      ).catch(() => []);

      if (existingCheckIns.length > 0) continue; // already submitted for this cycle

      // Check if we already sent the 48h prework notification for this cycle
      const existingNotifs = await base44.asServiceRole.entities.Notification.filter(
        { user_email: coacheeEmail, type: "checkin_prework" },
        "-created_date",
        100
      ).catch(() => []);

      const alreadyNotified = existingNotifs.some(n => n.metadata?.cycle_key === cycleKey);
      if (alreadyNotified) continue;

      // Send notification to direct report
      await base44.asServiceRole.entities.Notification.create({
        user_email: coacheeEmail,
        title: "Check-In Due Before Your 1-on-1",
        message: `Your recurring 1-on-1 with ${coachEmail} is coming up. Please complete your weekly check-in in the Performance tab before the meeting.`,
        type: "checkin_prework",
        is_read: false,
        scheduled_for: new Date().toISOString(),
        metadata: { cycle_key: cycleKey, session_id: session.id, week_of: weekOf },
      });

      created++;
    }

    return Response.json({ ok: true, notifications_created: created, cadenced_sessions_checked: cadencedSessions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});