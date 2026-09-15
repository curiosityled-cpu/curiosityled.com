/**
 * createOneOnOneCalendarEvent
 * Creates a real 1:1 calendar event on the manager's connected calendar
 * (Google Calendar first, Outlook fallback) and invites the attendee.
 * Returns the event id, source, and online-meeting join link.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      attendee_email,
      attendee_name,
      title = '1:1 Meeting',
      description = '',
      start_time,        // ISO 8601
      duration_minutes = 30,
      timezone = 'America/New_York'
    } = body;

    if (!start_time) return Response.json({ error: 'start_time is required' }, { status: 400 });

    const start = new Date(start_time);
    const end = new Date(start.getTime() + duration_minutes * 60000);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const summary = title || '1:1 Meeting';
    const desc = description
      ? `${description}\n\n— Scheduled via Curiosity Led 1:1 Hub`
      : `1:1 meeting${attendee_name ? ` with ${attendee_name}` : ''}.\n\n— Scheduled via Curiosity Led 1:1 Hub`;

    // 1) Try Google Calendar
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      const gcalBody = {
        summary,
        description: desc,
        start: { dateTime: startISO, timeZone: timezone },
        end: { dateTime: endISO, timeZone: timezone },
        attendees: attendee_email ? [{ email: attendee_email }] : [],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(gcalBody)
        }
      );
      if (res.ok) {
        const data = await res.json();
        return Response.json({
          success: true,
          source: 'google',
          event_id: data.id,
          join_link: data.hangoutLink || null,
          start: startISO,
          end: endISO
        });
      }
    } catch (_gErr) { /* fall through to outlook */ }

    // 2) Try Outlook
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
      const outlookBody = {
        subject: summary,
        body: { contentType: 'HTML', content: desc.replace(/\n/g, '<br>') },
        start: { dateTime: startISO, timeZone: timezone },
        end: { dateTime: endISO, timeZone: timezone },
        attendees: attendee_email
          ? [{ emailAddress: { address: attendee_email, name: attendee_name || attendee_email }, type: 'required' }]
          : [],
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      };
      const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(outlookBody)
      });
      if (res.ok) {
        const data = await res.json();
        return Response.json({
          success: true,
          source: 'outlook',
          event_id: data.id,
          join_link: data.onlineMeeting?.joinUrl || null,
          start: startISO,
          end: endISO
        });
      }
    } catch (_oErr) { /* no calendar connected */ }

    return Response.json({
      error: 'No calendar connected. Connect Outlook or Google Calendar to schedule 1:1s.'
    }, { status: 400 });
  } catch (error) {
    console.error('createOneOnOneCalendarEvent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}