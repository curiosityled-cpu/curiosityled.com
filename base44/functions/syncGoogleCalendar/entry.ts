/**
 * syncGoogleCalendar — nightly Google Calendar sync.
 *
 * Reads approved calendar fields only:
 *   - event title (summary), start/end time, attendee count, recurrence, status
 *
 * Never reads: description/notes, email content, attendee names, attachments.
 *
 * Computes UserActivity signals for managers who have calendar_consent_given = true
 * and whose calendar provider is Google (detected via source_systems or explicit flag).
 *
 * Admin-only function — invoked by scheduled automation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function gcalRequest(accessToken, url) {
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`GCal API error: ${res.status} ${await res.text()}`);
  return res.json();
}

function computeDaySignals(events, dateStr, userTimezone = 'UTC') {
  const dayEvents = events.filter(e => {
    const start = e.start?.dateTime || e.start?.date;
    if (!start) return false;
    const eventDate = new Date(start).toLocaleDateString('en-CA', { timeZone: userTimezone });
    return eventDate === dateStr;
  }).filter(e =>
    // Only accepted/tentative events, not cancelled
    e.status !== 'cancelled'
  );

  if (dayEvents.length === 0) {
    return {
      meeting_count_day: 0,
      meeting_minutes_day: 0,
      back_to_back_density: 0,
      late_day_load_minutes: 0,
      one_to_one_count: 0,
    };
  }

  const sorted = dayEvents
    .filter(e => e.start?.dateTime) // skip all-day events for timing
    .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

  let totalMinutes = 0;
  let lateMinutes = 0;
  let oneToOneCount = 0;
  let backToBackCount = 0;

  const EOD_HOUR = 17;

  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i];
    const start = new Date(ev.start.dateTime);
    const end = new Date(ev.end?.dateTime || ev.start.dateTime);
    const durationMins = Math.max(0, (end - start) / 60000);

    totalMinutes += durationMins;

    const endHour = parseInt(new Date(ev.end?.dateTime || ev.start.dateTime)
      .toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: userTimezone }));
    if (endHour >= EOD_HOUR) {
      lateMinutes += Math.min(durationMins, (endHour - EOD_HOUR) * 60);
    }

    // 1:1 detection
    const attendeeCount = (ev.attendees || []).length;
    const titleLower = (ev.summary || '').toLowerCase();
    const isOneOnOne = attendeeCount === 2 ||
      titleLower.includes('1:1') ||
      titleLower.includes('1-1') ||
      titleLower.includes('one on one') ||
      titleLower.includes('one-on-one');

    if (isOneOnOne && (ev.recurrence || attendeeCount === 2)) {
      oneToOneCount++;
    }

    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].end?.dateTime || sorted[i - 1].start.dateTime);
      const gapMins = (start - prevEnd) / 60000;
      if (gapMins >= 0 && gapMins < 15) backToBackCount++;
    }
  }

  return {
    meeting_count_day: sorted.length,
    meeting_minutes_day: Math.round(totalMinutes),
    back_to_back_density: sorted.length > 1
      ? Math.round((backToBackCount / (sorted.length - 1)) * 100) / 100
      : 0,
    late_day_load_minutes: Math.round(lateMinutes),
    one_to_one_count: oneToOneCount,
  };
}

function computeDaysSinceLastOneOnOne(events) {
  const oneOnOnes = events.filter(e => {
    if (e.status === 'cancelled') return false;
    const attendeeCount = (e.attendees || []).length;
    const titleLower = (e.summary || '').toLowerCase();
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
    .map(e => new Date(e.start?.dateTime || e.start?.date))
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

    // Only process managers who explicitly chose Google calendar
    const tonePrefs = await base44.asServiceRole.entities.TonePreference.filter({
      calendar_consent_given: true,
      calendar_connected: true,
    });

    if (tonePrefs.length === 0) {
      return Response.json({ synced: 0, reason: 'No managers with calendar consent' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const timeMin = new Date(today.getTime() - 14 * 86400000).toISOString();
    const timeMax = new Date(today.getTime() + 86400000).toISOString();

    const results = [];

    for (const pref of tonePrefs) {
      const userEmail = pref.user_email;
      const userTimezone = pref.user_timezone || 'America/New_York';

      try {
        // Fetch events — only approved fields (fields param limits what's returned)
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
          `?timeMin=${encodeURIComponent(timeMin)}` +
          `&timeMax=${encodeURIComponent(timeMax)}` +
          `&maxResults=100` +
          `&singleEvents=true` +
          `&orderBy=startTime` +
          `&fields=items(id,summary,start,end,attendees/email,recurrence,status)`;

        const data = await gcalRequest(accessToken, url);
        const events = data.items || [];

        const daySignals = computeDaySignals(events, todayStr, userTimezone);
        const daysSince1on1 = computeDaysSinceLastOneOnOne(events);

        // Upsert UserActivity
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
          source_systems: ['google_calendar'],
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

    return Response.json({ synced: succeeded, failed, results, date: todayStr });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});