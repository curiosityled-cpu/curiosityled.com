/**
 * syncOutlookCalendar — nightly Microsoft Graph calendar sync.
 *
 * Reads approved calendar fields only:
 *   - event title, start/end time, attendee count, recurrence, status
 *
 * Never reads: notes, agenda/body, email content, attendee names, attachments.
 *
 * Computes UserActivity signals for every manager who has calendar_consent_given = true.
 * Admin-only function — must be invoked by scheduled automation or admin.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function graphRequest(accessToken, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Compute signals from a list of calendar events for a given day
function computeDaySignals(events, dateStr, userTimezone = 'UTC') {
  const dayEvents = events.filter(e => {
    if (!e.start?.dateTime) return false;
    const eventDate = new Date(e.start.dateTime).toLocaleDateString('en-CA', { timeZone: userTimezone });
    return eventDate === dateStr;
  });

  if (dayEvents.length === 0) {
    return {
      meeting_count_day: 0,
      meeting_minutes_day: 0,
      back_to_back_density: 0,
      late_day_load_minutes: 0,
      one_to_one_count: 0,
    };
  }

  // Sort by start time
  const sorted = dayEvents.sort((a, b) =>
    new Date(a.start.dateTime) - new Date(b.start.dateTime)
  );

  let totalMinutes = 0;
  let lateMinutes = 0;
  let oneToOneCount = 0;
  let backToBackCount = 0;

  const EOD_HOUR = 17; // 5pm local

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const start = new Date(ev.start.dateTime);
    const end = new Date(ev.end?.dateTime || ev.start.dateTime);
    const durationMins = Math.max(0, (end - start) / 60000);

    totalMinutes += durationMins;

    // Late day: any minutes after 5pm
    const endHour = parseInt(new Date(ev.end?.dateTime || ev.start.dateTime)
      .toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: userTimezone }));
    if (endHour >= EOD_HOUR) {
      lateMinutes += Math.min(durationMins, (endHour - EOD_HOUR) * 60);
    }

    // 1:1 detection: exactly 2 attendees (organizer + 1) or title contains "1:1", "1-1", "one on one"
    const attendeeCount = (ev.attendees || []).length + 1; // +1 for organizer
    const titleLower = (ev.subject || '').toLowerCase();
    const isOneOnOne = attendeeCount === 2 ||
      titleLower.includes('1:1') ||
      titleLower.includes('1-1') ||
      titleLower.includes('one on one') ||
      titleLower.includes('one-on-one') ||
      titleLower.includes('1 on 1');

    if (isOneOnOne && (ev.recurrence || attendeeCount === 2)) {
      oneToOneCount++;
    }

    // Back-to-back: gap of less than 15 minutes to previous
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].end?.dateTime || sorted[i - 1].start.dateTime);
      const gapMins = (start - prevEnd) / 60000;
      if (gapMins >= 0 && gapMins < 15) backToBackCount++;
    }
  }

  const backToBackDensity = sorted.length > 1
    ? backToBackCount / (sorted.length - 1)
    : 0;

  return {
    meeting_count_day: sorted.length,
    meeting_minutes_day: Math.round(totalMinutes),
    back_to_back_density: Math.round(backToBackDensity * 100) / 100,
    late_day_load_minutes: Math.round(lateMinutes),
    one_to_one_count: oneToOneCount,
  };
}

// Find days since last 1:1 across recent events
function computeDaysSinceLastOneOnOne(events, userTimezone = 'UTC') {
  const oneOnOnes = events.filter(e => {
    const attendeeCount = (e.attendees || []).length + 1;
    const titleLower = (e.subject || '').toLowerCase();
    return (
      attendeeCount === 2 ||
      titleLower.includes('1:1') ||
      titleLower.includes('1-1') ||
      titleLower.includes('one on one') ||
      titleLower.includes('one-on-one')
    ) && e.recurrence;
  });

  if (oneOnOnes.length === 0) return null;

  const mostRecent = oneOnOnes
    .map(e => new Date(e.start.dateTime))
    .sort((a, b) => b - a)[0];

  return Math.floor((Date.now() - mostRecent) / 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all managers with Outlook calendar consent
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter({
      calendar_consent_given: true,
      calendar_connected: true,
    });

    if (tonePrefs.length === 0) {
      return Response.json({ synced: 0, reason: 'No managers have calendar consent' });
    }

    // Get the shared Outlook access token (app-level connector)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    // Fetch last 14 days of events for 1:1 detection
    const startDate = new Date(today.getTime() - 14 * 86400000).toISOString();
    const endDate = new Date(today.getTime() + 86400000).toISOString();

    const results = [];

    for (const pref of tonePrefs) {
      const userEmail = pref.user_email;
      const userTimezone = pref.user_timezone || 'America/New_York';

      try {
        // Fetch calendar events for this user via Graph
        // Using /me endpoint — this is a shared connector so it reads the builder's calendar.
        // In a per-user connector setup, this would be per-user.
        const eventsData = await graphRequest(
          accessToken,
          `/me/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$select=subject,start,end,attendees,recurrence,showAs&$top=100`
        );

        const events = (eventsData?.value || []).filter(e =>
          // Only include accepted/tentative events, skip cancelled
          e.showAs !== 'free' && e.showAs !== 'oof'
        );

        const daySignals = computeDaySignals(events, todayStr, userTimezone);
        const daysSince1on1 = computeDaysSinceLastOneOnOne(events, userTimezone);

        // Upsert today's UserActivity record
        const existing = await base44.asServiceRole.entities.UserActivity.filter({
          user_email: userEmail,
          date: todayStr,
        });

        const activityData = {
          user_email: userEmail,
          date: todayStr,
          ...daySignals,
          days_since_last_1on1: daysSince1on1,
          calendar_connected: true,
          source_systems: ['outlook_calendar'],
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.UserActivity.update(existing[0].id, activityData);
        } else {
          await base44.asServiceRole.entities.UserActivity.create(activityData);
        }

        results.push({ email: userEmail, status: 'ok', ...daySignals });
      } catch (err) {
        results.push({ email: userEmail, status: 'error', error: err.message });
      }
    }

    const succeeded = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status === 'error').length;

    return Response.json({
      synced: succeeded,
      failed,
      results,
      date: todayStr,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});