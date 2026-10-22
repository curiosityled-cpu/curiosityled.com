import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Sends one due-soon / overdue reminder per enrolment.
 * Called by the "Course Due-Date Reminders" scheduled workflow.
 * Idempotent: CourseProgress.reminder_sent_at is stamped on every send, so a
 * learner is reminded at most once per assignment.
 */

const isoDate = (value) => new Date(value).toISOString().slice(0, 10);
const APP_URL = 'https://curiosityled.ai';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const service = base44.asServiceRole;
    const today = isoDate(Date.now());
    const warnOn = isoDate(Date.now() + 3 * 86400000);

    const open = await service.entities.CourseProgress.filter({ status: { $ne: 'completed' } });
    const due = open.filter((row) => row.due_date && !row.reminder_sent_at && row.due_date <= warnOn);

    const results = { checked: open.length, due: due.length, notified: 0, emailed: 0, failed: [] };

    for (const row of due) {
      const overdue = row.due_date < today;
      const title = row.course_title || 'your assigned course';
      const message = overdue
        ? `"${title}" was due ${row.due_date} and is not finished yet — you are ${Math.round(
            row.overall_percentage || 0
          )}% complete.`
        : `"${title}" is due ${row.due_date} — you are ${Math.round(
            row.overall_percentage || 0
          )}% complete.`;

      try {
        await service.entities.Notification.create({
          user_email: row.learner_email,
          type: 'reminder',
          title: overdue ? `Overdue: ${title}` : `Due ${row.due_date}: ${title}`,
          message,
          related_entity_type: 'Course',
          related_entity_id: row.course_id,
          action_url: '/my-development',
          priority: overdue ? 'high' : 'medium',
          status: 'pending',
        });
        results.notified += 1;
      } catch (error) {
        results.failed.push({ progress_id: row.id, step: 'notification', error: error.message });
        continue;
      }

      try {
        await base44.integrations.Core.SendEmail({
          to: row.learner_email,
          subject: overdue ? `Overdue: ${title}` : `Due soon: ${title}`,
          body: `${message}\n\nContinue here: ${APP_URL}/my-development`,
        });
        results.emailed += 1;
      } catch (error) {
        // Email is best effort — the in-app reminder is already delivered.
        results.failed.push({ progress_id: row.id, step: 'email', error: error.message });
      }

      await service.entities.CourseProgress.update(row.id, { reminder_sent_at: new Date().toISOString() });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('sendCourseDueDateReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}