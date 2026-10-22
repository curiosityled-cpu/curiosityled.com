import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Admin roster + progress for one course.
 *
 * action: 'list'        → summary strip, per-module completion, per-learner rows
 *         'remind'      → in-app reminder notifications to the selected learners
 *         'set_due_date'→ set (or clear) the due date for the selected learners
 *         'unassign'    → remove enrolments and keep Course.assigned_to_emails in sync
 *
 * Admin-only. All reads/writes run as service role so the caller's row-level
 * rules cannot silently hide learners from the roster.
 */

const ADMIN_ROLES = [
  'admin',
  'Platform Admin',
  'Super Administrator',
  'Admin Level 1',
  'Admin Level 2',
  'Partner Business Administrator',
];

const isoDate = (value) => new Date(value).toISOString().slice(0, 10);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = [user.role, user.app_role].filter(Boolean);
    const isPlatformAdmin = roles.includes('Platform Admin') || roles.includes('admin');
    if (!roles.some((role) => ADMIN_ROLES.includes(role))) {
      return Response.json({ error: 'Forbidden - admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { course_id, action = 'list', progress_ids = [], due_date = null } = body || {};
    if (!course_id) return Response.json({ error: 'course_id is required' }, { status: 400 });

    const service = base44.asServiceRole;
    const course = await service.entities.Course.get(course_id).catch(() => null);
    if (!course) return Response.json({ error: 'Course not found' }, { status: 404 });

    if (!isPlatformAdmin) {
      const clientId = user.client_id || user.data?.client_id;
      if (course.client_id && clientId && course.client_id !== clientId) {
        return Response.json({ error: 'Forbidden - course is outside your organization' }, { status: 403 });
      }
    }

    // ── remind ──────────────────────────────────────────────────────────────
    if (action === 'remind') {
      if (!progress_ids.length) {
        return Response.json({ error: 'progress_ids is required' }, { status: 400 });
      }
      const rows = await service.entities.CourseProgress.filter({ id: { $in: progress_ids } });
      const notifications = rows
        .filter((row) => row.learner_email)
        .map((row) => ({
          user_email: row.learner_email,
          type: 'reminder',
          title: `Reminder: ${row.course_title || course.title}`,
          message: row.due_date
            ? `"${row.course_title || course.title}" is due ${row.due_date}. You are ${
                Math.round(row.overall_percentage || 0)
              }% complete.`
            : `A reminder from your program team to continue "${
                row.course_title || course.title
              }" — you are ${Math.round(row.overall_percentage || 0)}% complete.`,
          related_entity_type: 'Course',
          related_entity_id: course_id,
          action_url: '/my-development',
          priority: 'medium',
          status: 'pending',
        }));
      if (notifications.length) await service.entities.Notification.bulkCreate(notifications);
      return Response.json({ success: true, reminded: notifications.length });
    }

    // ── set_due_date ────────────────────────────────────────────────────────
    if (action === 'set_due_date') {
      if (!progress_ids.length) {
        return Response.json({ error: 'progress_ids is required' }, { status: 400 });
      }
      await service.entities.CourseProgress.updateMany(
        { id: { $in: progress_ids } },
        { $set: { due_date: due_date || null, reminder_sent_at: null } }
      );
      return Response.json({ success: true, updated: progress_ids.length });
    }

    // ── unassign ────────────────────────────────────────────────────────────
    if (action === 'unassign') {
      if (!progress_ids.length) {
        return Response.json({ error: 'progress_ids is required' }, { status: 400 });
      }
      const rows = await service.entities.CourseProgress.filter({ id: { $in: progress_ids } });
      const removedEmails = rows.map((row) => row.learner_email).filter(Boolean);
      await Promise.all(
        rows.map((row) => service.entities.CourseProgress.delete(row.id).catch(() => null))
      );

      // Keep the course's assigned list in step: learners still enrolled stay.
      const remaining = await service.entities.CourseProgress.filter({ course_id });
      const stillEnrolled = new Set(remaining.map((row) => row.learner_email));
      const nextAssigned = (course.assigned_to_emails || []).filter(
        (email) => stillEnrolled.has(email) || !removedEmails.includes(email)
      );
      await service.entities.Course.update(course_id, {
        assigned_to_emails: nextAssigned,
        enrollment_count: nextAssigned.length,
      });
      return Response.json({ success: true, unassigned: rows.length });
    }

    // ── list ────────────────────────────────────────────────────────────────
    const rows = await service.entities.CourseProgress.filter({ course_id });
    const emails = [...new Set(rows.map((row) => row.learner_email).filter(Boolean))];

    let names = {};
    if (emails.length) {
      try {
        const users = await service.entities.User.filter({ email: { $in: emails } });
        names = Object.fromEntries(users.map((entry) => [entry.email, entry.full_name || entry.email]));
      } catch (error) {
        // Names are cosmetic; the roster still works from email alone.
        console.warn('Roster name lookup failed:', error.message);
      }
    }

    const moduleDefs = (course.modules || []).map((module) => ({
      id: module.id,
      title: module.title,
      lesson_ids: (module.lessons || []).map((lesson) => lesson.id),
    }));
    const totalLessons = moduleDefs.reduce((sum, module) => sum + module.lesson_ids.length, 0);
    const today = isoDate(Date.now());

    const roster = rows.map((row) => {
      const doneIds = (row.completed_lessons || []).map((entry) => entry.lesson_id);
      const overdue = !!(row.due_date && row.status !== 'completed' && row.due_date < today);
      return {
        id: row.id,
        email: row.learner_email,
        name: names[row.learner_email] || row.learner_email,
        status: overdue ? 'overdue' : row.status || 'not_started',
        percent: Math.round(row.overall_percentage || 0),
        lessons_done: doneIds.length,
        lessons_total: totalLessons,
        enrolled_at: row.enrolled_at || row.created_date || null,
        last_accessed_at: row.last_accessed_at || null,
        due_date: row.due_date || null,
        completed_at: row.completed_at || null,
        certificate_issued: !!row.certificate_issued,
        assigned_by: row.assigned_by || null,
      };
    });

    const completedRows = rows.filter((row) => row.status === 'completed');
    const durations = completedRows
      .filter((row) => row.completed_at && row.enrolled_at)
      .map((row) => (new Date(row.completed_at).getTime() - new Date(row.enrolled_at).getTime()) / 86400000)
      .filter((days) => days >= 0);

    const modules = moduleDefs.map((module) => {
      if (!rows.length || !module.lesson_ids.length) {
        return { id: module.id, title: module.title, lessons: module.lesson_ids.length, learner_percent: 0 };
      }
      const sum = rows.reduce((acc, row) => {
        const done = new Set((row.completed_lessons || []).map((entry) => entry.lesson_id));
        const count = module.lesson_ids.filter((id) => done.has(id)).length;
        return acc + count / module.lesson_ids.length;
      }, 0);
      return {
        id: module.id,
        title: module.title,
        lessons: module.lesson_ids.length,
        learner_percent: Math.round((sum / rows.length) * 100),
      };
    });

    return Response.json({
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
        pacing: course.pacing,
        access_mode: course.access_mode,
        lesson_count: totalLessons,
        module_count: moduleDefs.length,
      },
      summary: {
        enrolled: rows.length,
        not_started: rows.filter((row) => (row.status || 'not_started') === 'not_started').length,
        in_progress: rows.filter((row) => row.status === 'in_progress').length,
        completed: completedRows.length,
        overdue: roster.filter((row) => row.status === 'overdue').length,
        completion_rate: rows.length ? Math.round((completedRows.length / rows.length) * 100) : 0,
        avg_days_to_complete: durations.length
          ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
          : null,
      },
      modules,
      rows: roster,
    });
  } catch (error) {
    console.error('courseRoster error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}