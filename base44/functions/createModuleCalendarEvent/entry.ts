import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * createModuleCalendarEvent
 * Puts one follow-through event on the app-connected calendar after a learner
 * approves an action proposed inside a conversational learning module.
 * Only the learner who approved it is invited — never arbitrary attendees.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const title = String(body.title || '').trim().slice(0, 140);
    const description = String(body.description || '').trim().slice(0, 1000);
    const durationMinutes = Math.min(Math.max(Number(body.duration_minutes) || 30, 5), 480);
    const timeZone = String(body.timezone || '').trim() || 'America/New_York';

    if (!title) return Response.json({ error: 'A title is required' }, { status: 400 });
    if (!body.start_time) return Response.json({ error: 'A start time is required' }, { status: 400 });

    const start = new Date(body.start_time);
    if (isNaN(start.getTime())) {
      return Response.json({ error: 'That start time is not a valid date' }, { status: 400 });
    }
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const note = description ? `${description}\n\n` : '';
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title,
        description: `${note}Added from Curiosity Led at ${user.email}'s request.`.trim(),
        start: { dateTime: start.toISOString(), timeZone },
        end: { dateTime: end.toISOString(), timeZone },
        attendees: [{ email: user.email }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || `The calendar refused the event (${res.status})` },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      title: data.summary || title,
      event_id: data.id,
      event_link: data.htmlLink || null,
      start_time: start.toISOString(),
      duration_minutes: durationMinutes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}