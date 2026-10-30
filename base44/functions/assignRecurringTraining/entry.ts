import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Opens a fresh training cycle for anyone whose completion of a course with a
 * recertification interval has gone stale.
 *
 * Called by the "Recurring Annual Training" scheduled workflow. Re-running is safe:
 * a learner only gets a new cycle once their previous one has actually lapsed, and
 * opening it resets the working row while the append-only record keeps the earlier
 * completion exactly as it was.
 */

const onePage = (result) => (Array.isArray(result) ? result : result?.items || []);
const isoDate = (value) => new Date(value).toISOString().slice(0, 10);

/** Adds months to a date, clamping to the last day of a shorter month. */
function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const daysInTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, daysInTarget)));
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    const service = base44.asServiceRole;
    const now = new Date();
    const nowIso = now.toISOString();

    const courses = onePage(await service.entities.Course.filter({ status: 'published' }));
    const recurring = courses.filter((course) => Number(course.recertification_interval_months) > 0);

    const summary = {
      courses_checked: recurring.length,
      cycles_opened: 0,
      preserved: 0,
      failed: [] as { learner_email: string; error: string }[],
    };

    for (const course of recurring) {
      const months = Number(course.recertification_interval_months);
      const rows = onePage(await service.entities.CourseProgress.filter({ course_id: course.id }));

      for (const row of rows) {
        if (row.status !== 'completed' || !row.completed_at) continue;

        // A held or archived record is preserved as it stands: the next cycle is
        // opened once the hold is released, never on top of a legal preservation.
        if (row.legal_hold || row.retention_state === 'archived') {
          summary.preserved += 1;
          continue;
        }

        const dueAt = addMonths(new Date(row.completed_at), months);
        if (dueAt.getTime() > now.getTime()) continue;

        const cycle = Number(row.assignment_basis_detail?.cycle || 1) + 1;
        const dueDate = isoDate(dueAt);

        try {
          await service.entities.CourseProgress.update(row.id, {
            status: 'not_started',
            overall_percentage: 0,
            completed_lessons: [],
            completed_at: null,
            last_accessed_at: nowIso,
            last_lesson_id: null,
            enrolled_at: nowIso,
            assigned_by: 'system',
            assignment_basis: 'recurring',
            assignment_basis_label: `Recurring training — ${months}-month refresh (cycle ${cycle})`,
            assignment_basis_detail: {
              cycle,
              interval_months: months,
              previous_completed_at: row.completed_at,
            },
            due_date: dueDate,
            due_date_original: dueDate,
            extension_granted_days: 0,
            extension_reason: null,
            extension_granted_by: null,
            extension_granted_at: null,
            reminder_sent_at: null,
            waiver_status: 'none',
          });

          await service.entities.LearningRecordEvent.create({
            client_id: row.client_id || course.client_id || null,
            event_type: 'course_enrolled',
            learner_email: row.learner_email,
            learner_name: row.learner_name || null,
            actor_email: 'system',
            actor_role: 'system',
            source: 'system',
            course_id: course.id,
            course_title: course.title,
            occurred_at: nowIso,
            metadata: {
              via: 'recurring_training',
              cycle,
              interval_months: months,
              previous_completed_at: row.completed_at,
              due_date: dueDate,
            },
          });

          await service.entities.Notification.create({
            user_email: row.learner_email,
            type: 'learning_assigned',
            title: `Refresh due: ${course.title}`,
            message: `Your completion of "${course.title}" is due for renewal (due ${dueDate}).`,
            related_entity_type: 'Course',
            related_entity_id: course.id,
            action_url: '/my-development',
            priority: 'medium',
            status: 'pending',
          }).catch((error) => console.warn('Recurring training notification failed:', error.message));

          summary.cycles_opened += 1;
        } catch (error) {
          summary.failed.push({ learner_email: row.learner_email, error: error.message });
        }
      }
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    console.error('assignRecurringTraining error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}