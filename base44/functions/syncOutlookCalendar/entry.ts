/**
 * syncOutlookCalendar — Outlook/Microsoft Graph calendar integration.
 *
 * Reads ONLY approved calendar fields per the pilot privacy specification:
 * - Event titles, start/end times
 * - Attendee COUNT (not who they are)
 * - Whether a meeting is recurring
 * - Whether a meeting was accepted/declined/cancelled
 *
 * NEVER reads: notes, agendas, email content, attendee names, attachments.
 *
 * Writes calendar-derived signals to UserActivity:
 * - meeting_count_day, meeting_minutes_day, back_to_back_density
 * - late_day_load_minutes, one_to_one_count, days_since_last_1on1
 *
 * Requires: TonePreference.calendar_consent_given = true before running for any user.
 * Uses Microsoft Graph via OAuth — requires Outlook app connector to be authorized.
 *
 * Phase: Sprint 4. Currently a scaffold — wire to Microsoft Graph connector
 * once app connector is authorized in the Curiosity Led workspace.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Calendar signal computation ──────────────────────────────────────────────

function computeCalendarSignals(events, date, lateHour = 17) {
  if (!events || events.length === 0) {
    return {
      meeting_count_day: 0,
      meeting_minutes_day: 0,
      back_to_back_density: 0,
      late_day_load_minutes: 0,
      one_to_one_count: 0,
    };
  }

  // Sort events by start time
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));

  let totalMinutes = 0;
  let lateMinutes = 0;
  let oneToOneCount = 0;
  let backToBackPairs = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const durationMinutes = Math.max(0, (end - start) / 60000);
    totalMinutes += durationMinutes;

    // Late-day load: meeting ending after lateHour (default 5pm)
    const endHour = end.getHours() + end.getMinutes() / 60;
    if (endHour > lateHour) {
      const lateStart = Math.max(start.getHours() + start.getMinutes() / 60, lateHour);
      lateMinutes += (endHour - lateStart) * 60;
    }

    // 1:1 detection: recurring + ≤ 2 attendees
    if (ev.isRecurring && (ev.attendeeCount || 0) <= 2) {
      oneToOneCount++;
    }

    // Back-to-back: gap < 15 min between consecutive meetings
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].end);
      const gapMinutes = (start - prevEnd) / 60000;
      if (gapMinutes >= 0 && gapMinutes < 15) {
        backToBackPairs++;
      }
    }
  }

  const backToBackDensity = sorted.length > 1
    ? backToBackPairs / (sorted.length - 1)
    : 0;

  return {
    meeting_count_day: sorted.length,
    meeting_minutes_day: Math.round(totalMinutes),
    back_to_back_density: Math.round(backToBackDensity * 100) / 100,
    late_day_load_minutes: Math.round(lateMinutes),
    one_to_one_count: oneToOneCount,
  };
}

function computeDaysSinceLast1on1(recentDays) {
  for (let i = 0; i < recentDays.length; i++) {
    if ((recentDays[i].one_to_one_count || 0) > 0) {
      return i; // days ago
    }
  }
  return recentDays.length; // haven't had one in all tracked days
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

    // Get managers with calendar consent
    let managers = [];
    if (targetEmail) {
      managers = [{ email: targetEmail }];
    } else {
      const allUsers = await base44.asServiceRole.entities.User.filter(
        { app_role: { $in: ['User Level 1', 'User Level 2'] } }, null, 500
      );
      managers = allUsers.map(u => ({ email: u.email }));
    }

    const results = [];

    for (const manager of managers) {
      const email = manager.email;

      // Check calendar consent — NEVER sync without explicit consent
      const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter(
        { user_email: email }, '-created_date', 1
      );
      const hasConsent = tonePrefs[0]?.calendar_consent_given === true;

      if (!hasConsent) {
        results.push({ email, skipped: true, reason: 'no_calendar_consent' });
        continue;
      }

      // ── Microsoft Graph OAuth (scaffold) ──────────────────────────────────
      // TODO: Uncomment and wire once Outlook connector is authorized.
      // const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
      //
      // const calendarRes = await fetch(
      //   `https://graph.microsoft.com/v1.0/users/${email}/calendarView?startDateTime=${today}T00:00:00Z&endDateTime=${today}T23:59:59Z&$select=subject,start,end,attendees,recurrence,isCancelled,isOrganizer&$top=50`,
      //   { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      // );
      // const calendarData = await calendarRes.json();
      //
      // Map Graph events to our approved signal format:
      // const events = (calendarData.value || [])
      //   .filter(ev => !ev.isCancelled) // exclude cancelled/declined
      //   .map(ev => ({
      //     start: ev.start.dateTime,
      //     end: ev.end.dateTime,
      //     attendeeCount: (ev.attendees || []).length,
      //     isRecurring: !!ev.recurrence,
      //     // NOTE: ev.subject is used ONLY for 1:1 heuristic if needed; never stored
      //   }));
      //
      // For now, return scaffolded zero-data until connector is authorized:

      const events = []; // Replace with Graph API call above
      const calendarSignals = computeCalendarSignals(events, today);

      // Get recent UserActivity for days_since_last_1on1
      const recentActivity = await base44.asServiceRole.entities.UserActivity.filter(
        { user_email: email }, '-date', 14
      );
      const daysSince1on1 = computeDaysSinceLast1on1(recentActivity);

      // Update UserActivity with calendar signals
      const existingToday = recentActivity.find(a => a.date === today);
      const calendarUpdate = {
        ...calendarSignals,
        days_since_last_1on1: daysSince1on1,
        calendar_connected: true,
        source_systems: ['base44_goals', 'base44_learning', 'outlook_calendar'],
      };

      if (existingToday) {
        await base44.asServiceRole.entities.UserActivity.update(existingToday.id, calendarUpdate);
      } else {
        await base44.asServiceRole.entities.UserActivity.create({
          user_email: email,
          date: today,
          ...calendarUpdate,
        });
      }

      results.push({
        email,
        processed: true,
        calendar_synced: false, // Will be true once Graph API is wired
        scaffold_ready: true,
        consent_given: true,
        ...calendarSignals,
      });
    }

    return Response.json({
      processed: results.filter(r => r.processed).length,
      skipped: results.filter(r => r.skipped).length,
      date: today,
      note: 'Microsoft Graph connector pending authorization. Calendar signals scaffold ready. Wire connector and uncomment Graph API calls to activate.',
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});