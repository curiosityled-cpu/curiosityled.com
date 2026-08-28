import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * sendSessionPrepReminders
 * Scheduled automation (daily). Finds CoachingSessions scheduled in the next 24 hours
 * and sends two notifications: a prep-brief to the coach and a pre-work reminder to the coachee.
 * Also sends emails where possible via the SendEmail integration.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString(); // 20h from now
    const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString();  // 28h from now

    // Fetch scheduled sessions in the look-ahead window
    const sessions = await base44.asServiceRole.entities.CoachingSession.filter(
      { status: 'scheduled' },
      'scheduled_date',
      200
    );

    const upcoming = sessions.filter(s => {
      const d = s.scheduled_date;
      if (!d) return false;
      return d >= windowStart && d <= windowEnd;
    });

    let sent = 0;
    const errors = [];

    for (const session of upcoming) {
      const coachEmail = session.coach_email;
      const coacheeEmail = session.coachee_email;
      if (!coachEmail || !coacheeEmail) continue;

      const sessionDate = new Date(session.scheduled_date);
      const dateStr = sessionDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      const reminderKey = `prep_${session.id}`;

      // De-duplicate: skip if already sent
      const existing = await base44.asServiceRole.entities.Notification.filter(
        { type: 'coaching_prep_reminder' },
        '-created_date',
        50
      ).catch(() => []);
      if (existing.some(n => n.metadata?.reminder_key === reminderKey)) continue;

      // Coach prep-brief notification
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: coachEmail,
          type: 'coaching_prep_reminder',
          title: `Session prep: ${coacheeEmail} ${dateStr}`,
          message: `Your coaching session with ${coacheeEmail} is coming up. Review their prep brief before the session.`,
          is_read: false,
          scheduled_for: new Date().toISOString(),
          action_url: `/coaching?tab=prep&engagement=${session.engagement_id || ''}`,
          related_entity_type: 'CoachingSession',
          related_entity_id: session.id,
          priority: 'medium',
          metadata: { reminder_key: reminderKey, role: 'coach' },
        });
        sent++;
      } catch (e) {
        errors.push(`coach notif: ${e.message}`);
      }

      // Coachee pre-work reminder notification
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: coacheeEmail,
          type: 'coaching_prep_reminder',
          title: `Coaching session reminder: ${dateStr}`,
          message: `Your coaching session is coming up on ${dateStr}. Take a moment to reflect on what you'd like to discuss.`,
          is_read: false,
          scheduled_for: new Date().toISOString(),
          action_url: '/coaching',
          related_entity_type: 'CoachingSession',
          related_entity_id: session.id,
          priority: 'medium',
          metadata: { reminder_key: reminderKey, role: 'coachee' },
        });
        sent++;
      } catch (e) {
        errors.push(`coachee notif: ${e.message}`);
      }

      // Send emails (best-effort)
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: coachEmail,
          subject: `Session prep: ${coacheeEmail} — ${dateStr}`,
          body: `Your coaching session with ${coacheeEmail} is scheduled for ${dateStr}.\n\nReview the prep brief in your Coaching workspace before the session.`,
        });
      } catch (e) {
        errors.push(`coach email: ${e.message}`);
      }

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: coacheeEmail,
          subject: `Coaching session reminder — ${dateStr}`,
          body: `Your coaching session is coming up on ${dateStr}.\n\nTake a moment to reflect on what you'd like to discuss with your coach.`,
        });
      } catch (e) {
        errors.push(`coachee email: ${e.message}`);
      }
    }

    return Response.json({ ok: true, sent, sessions_checked: upcoming.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}