/**
 * getUpcomingMeetings — Fetch upcoming calendar events for friction detection.
 * Tries Google Calendar first, falls back to Outlook.
 * Returns next 7 days of events with title, start time, and attendee count.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date().toISOString();
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString();
    let events = [];

    // Try Google Calendar
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(weekAhead)}&maxResults=25&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        events = (data.items || []).map(e => ({
          id: e.id,
          title: e.summary || 'Untitled',
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          attendees: e.attendees?.length || 0,
          source: 'google',
        }));
      }
    } catch (_gcalErr) {
      // Try Outlook as fallback
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection("outlook");
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(now)}&endDateTime=${encodeURIComponent(weekAhead)}&$top=25&$select=subject,start,end,attendees&$orderby=start/dateTime`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          events = (data.value || []).map(e => ({
            id: e.id,
            title: e.subject || 'Untitled',
            start: e.start?.dateTime,
            end: e.end?.dateTime,
            attendees: e.attendees?.length || 0,
            source: 'outlook',
          }));
        }
      } catch (_outlookErr) {
        // No calendar connected
      }
    }

    return Response.json({ events, connected: events.length > 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});