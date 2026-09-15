/**
 * createOneOnOneCalendarEvent
 * Creates, updates, or cancels a real 1:1 calendar event on the manager's
 * connected calendar (Google Calendar first, Outlook fallback) and invites the attendee.
 *
 * body.action: 'create' (default) | 'update' | 'delete'
 *   - create: needs start_time, duration_minutes, etc. → returns event id, source, join link
 *   - update: needs event_id + calendar_source + new start_time/duration/recurrence
 *   - delete: needs event_id + calendar_source
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      action = 'create',
      attendee_email,
      attendee_name,
      title = '1:1 Meeting',
      description = '',
      start_time,        // ISO 8601
      duration_minutes = 30,
      timezone = 'America/New_York',
      recurrence = 'none', // 'none' | 'weekly' | 'biweekly' | 'monthly'
      event_id,          // required for update / delete
      calendar_source    // 'google' | 'outlook' — required for update / delete
    } = body;

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!event_id || !calendar_source) return Response.json({ error: 'event_id and calendar_source are required to delete' }, { status: 400 });
      if (calendar_source === 'google') {
        try {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event_id)}?sendUpdates=all`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (res.ok || res.status === 410) return Response.json({ success: true, source: 'google', deleted: true });
          const err = await res.text();
          return Response.json({ error: `Google delete failed: ${res.status} ${err}` }, { status: 502 });
        } catch (e) { return Response.json({ error: `Google delete failed: ${e.message}` }, { status: 502 }); }
      }
      if (calendar_source === 'outlook') {
        try {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(event_id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (res.ok || res.status === 204) return Response.json({ success: true, source: 'outlook', deleted: true });
          const err = await res.text();
          return Response.json({ error: `Outlook delete failed: ${res.status} ${err}` }, { status: 502 });
        } catch (e) { return Response.json({ error: `Outlook delete failed: ${e.message}` }, { status: 502 }); }
      }
      return Response.json({ error: `Unsupported calendar_source: ${calendar_source}` }, { status: 400 });
    }

    // ── CREATE / UPDATE — shared event body ─────────────────────────────────
    if (!start_time) return Response.json({ error: 'start_time is required' }, { status: 400 });

    const start = new Date(start_time);
    const end = new Date(start.getTime() + duration_minutes * 60000);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Recurrence rules
    const gDays = ['SU','MO','TU','WE','TH','FR','SA'];
    const oDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dow = start.getUTCDay();
    const gcalRecurrence = [];
    let outlookRecurrence;
    if (recurrence === 'weekly') {
      gcalRecurrence.push(`RRULE:FREQ=WEEKLY;BYDAY=${gDays[dow]}`);
      outlookRecurrence = { pattern: { type: 'weekly', interval: 1, daysOfWeek: [oDays[dow]] }, range: { type: 'noEnd' } };
    } else if (recurrence === 'biweekly') {
      gcalRecurrence.push(`RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=${gDays[dow]}`);
      outlookRecurrence = { pattern: { type: 'weekly', interval: 2, daysOfWeek: [oDays[dow]] }, range: { type: 'noEnd' } };
    } else if (recurrence === 'monthly') {
      gcalRecurrence.push('RRULE:FREQ=MONTHLY');
      outlookRecurrence = { pattern: { type: 'absoluteMonthly', interval: 1, dayOfMonth: start.getUTCDate() }, range: { type: 'noEnd' } };
    }

    const summary = title || '1:1 Meeting';
    const desc = description
      ? `${description}\n\n— Scheduled via Curiosity Led 1:1 Hub`
      : `1:1 meeting${attendee_name ? ` with ${attendee_name}` : ''}.\n\n— Scheduled via Curiosity Led 1:1 Hub`;

    const isUpdate = action === 'update';

    // 1) Try Google Calendar
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      const gcalBody = {
        summary,
        description: desc,
        start: { dateTime: startISO, timeZone: timezone },
        end: { dateTime: endISO, timeZone: timezone },
        attendees: attendee_email ? [{ email: attendee_email }] : [],
        ...(gcalRecurrence.length ? { recurrence: gcalRecurrence } : {})
      };
      let url, method;
      if (isUpdate && calendar_source === 'google' && event_id) {
        url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event_id)}?conferenceDataVersion=1&sendUpdates=all`;
        method = 'PUT';
      } else {
        gcalBody.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
        url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all';
        method = 'POST';
      }
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalBody)
      });
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
        onlineMeetingProvider: 'teamsForBusiness',
        ...(outlookRecurrence ? { recurrence: outlookRecurrence } : {})
      };
      let url, method;
      if (isUpdate && calendar_source === 'outlook' && event_id) {
        url = `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(event_id)}`;
        method = 'PATCH';
      } else {
        url = 'https://graph.microsoft.com/v1.0/me/events';
        method = 'POST';
      }
      const res = await fetch(url, {
        method,
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