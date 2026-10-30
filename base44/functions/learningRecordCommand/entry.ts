import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * The learning record server.
 *
 * Completion of learning is never written by the browser. The learner reports which
 * lesson they finished; this function decides whether the course is complete from the
 * course's own published version and completion rule, then writes both the convenience
 * progress row and an append-only LearningRecordEvent. Publishing a course snapshots it
 * into an immutable CourseVersion so later edits cannot change what a past completion meant.
 */

const ADMIN_ROLES = [
  'Admin Level 1',
  'Admin Level 2',
  'Super Administrator',
  'Partner Business Administrator',
  'Platform Admin',
];

const flattenLessons = (modules) =>
  (modules || []).flatMap((module) =>
    (module.lessons || []).map((lesson) => ({ ...lesson, module_id: module.id, module_title: module.title }))
  );

const onePage = (result) => (Array.isArray(result) ? result : result?.items || []);

function deriveCompletion(lessons, rule, completedIds) {
  const total = lessons.length;
  const percent = total ? Math.round((completedIds.size / total) * 100) : 0;
  const minimum = Math.max(1, rule?.minimum_count || 1);
  const isComplete =
    total > 0 &&
    (rule?.type === 'minimum_lessons' ? completedIds.size >= minimum : completedIds.size === total);
  return { percent, isComplete };
}

async function logEvent(service, payload) {
  return service.entities.LearningRecordEvent.create({
    source: 'learner',
    actor_role: 'learner',
    occurred_at: new Date().toISOString(),
    ...payload,
  });
}

async function latestVersion(service, courseId) {
  const rows = onePage(
    await service.entities.CourseVersion.filter({ course_id: courseId }, { sort: '-version', limit: 1 })
  );
  return rows[0] || null;
}

/** The authoritative lesson list: the published snapshot when one exists, else the live draft. */
async function resolveContent(service, course) {
  const version = await latestVersion(service, course.id);
  const lessons = version ? flattenLessons(version.snapshot?.modules) : flattenLessons(course.modules);
  const rule = version?.snapshot?.completion_rule || course.completion_rule || { type: 'all_lessons' };
  return { version, lessons, rule };
}

async function getOrCreateProgress(service, user, course) {
  const rows = onePage(
    await service.entities.CourseProgress.filter({ learner_email: user.email, course_id: course.id })
  );
  if (rows[0]) return rows[0];

  const created = await service.entities.CourseProgress.create({
    course_id: course.id,
    course_title: course.title,
    learner_email: user.email,
    client_id: course.client_id || user.client_id || null,
    status: 'not_started',
    overall_percentage: 0,
    enrolled_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
  });

  await logEvent(service, {
    client_id: course.client_id || user.client_id || null,
    event_type: 'course_enrolled',
    learner_email: user.email,
    learner_name: user.full_name || null,
    actor_email: user.email,
    course_id: course.id,
    course_title: course.title,
    course_version: (await latestVersion(service, course.id))?.version ?? null,
    metadata: { via: 'self_enrolment' },
  });

  return created;
}

/** Applies one set of newly completed lessons to the progress row, server-side. */
async function applyCompletion(service, user, course, progress, content, lessonIds) {
  const existing = new Map(
    (progress.completed_lessons || []).map((entry) => [entry.lesson_id, entry.completed_at])
  );
  const previouslyComplete = progress.status === 'completed';
  const now = new Date().toISOString();

  lessonIds.forEach((id) => {
    if (!existing.has(id)) existing.set(id, now);
  });

  const completedIds = new Set(existing.keys());
  const { percent, isComplete } = deriveCompletion(content.lessons, content.rule, completedIds);

  const updated = await service.entities.CourseProgress.update(progress.id, {
    completed_lessons: [...existing.entries()].map(([lesson_id, completed_at]) => ({ lesson_id, completed_at })),
    overall_percentage: percent,
    status: isComplete ? 'completed' : 'in_progress',
    last_accessed_at: now,
    ...(isComplete ? { completed_at: progress.completed_at || now } : {}),
  });

  if (isComplete && !previouslyComplete) {
    await logEvent(service, {
      client_id: course.client_id || user.client_id || null,
      event_type: 'course_completed',
      learner_email: user.email,
      learner_name: user.full_name || null,
      actor_email: user.email,
      course_id: course.id,
      course_title: course.title,
      course_version: content.version?.version ?? null,
      metadata: {
        lessons_completed: completedIds.size,
        lessons_in_version: content.lessons.length,
        completion_rule: content.rule,
      },
    });
  }

  return { progress: updated, completedNow: isComplete && !previouslyComplete };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const courseId = body?.course_id;
    if (!courseId) return Response.json({ error: 'course_id is required' }, { status: 400 });

    const service = base44.asServiceRole;
    const course = await service.entities.Course.get(courseId).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!course) return Response.json({ error: 'Course not found' }, { status: 404 });

    // ── Publishing: snapshot the course so completions always point at real content ──
    if (action === 'publish_course') {
      const canPublish = ADMIN_ROLES.includes(user.app_role) || course.created_by === user.email;
      if (!canPublish) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const modules = course.modules || [];
      const lessonCount = flattenLessons(modules).length;
      if (lessonCount === 0) {
        return Response.json({ error: 'This course has no lessons to publish yet.' }, { status: 400 });
      }

      const snapshot = {
        modules: modules.map((module) => ({
          id: module.id,
          title: module.title,
          lessons: (module.lessons || []).map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            content_type: lesson.content_type,
            reference_id: lesson.reference_id,
            reference_title: lesson.reference_title || null,
            gate: Boolean(lesson.gate),
            unlock_offset_days: lesson.unlock_offset_days ?? null,
            allow_seeking: lesson.allow_seeking !== false,
            allow_speed_adjust: lesson.allow_speed_adjust !== false,
            captions_url: lesson.captions_url || null,
          })),
        })),
        completion_rule: course.completion_rule || { type: 'all_lessons', minimum_count: 0 },
      };

      const now = new Date().toISOString();
      const previous = await latestVersion(service, courseId);
      if (previous) {
        await service.entities.CourseVersion.update(previous.id, { superseded_at: now });
      }

      const version = (previous?.version || 0) + 1;
      const record = await service.entities.CourseVersion.create({
        client_id: course.client_id || user.client_id || null,
        course_id: courseId,
        course_title: course.title,
        version,
        snapshot,
        lesson_count: lessonCount,
        published_at: now,
        published_by: user.email,
        change_note: body?.change_note || null,
      });

      await service.entities.Course.update(courseId, { status: 'published' });

      await logEvent(service, {
        client_id: course.client_id || user.client_id || null,
        event_type: 'course_published',
        learner_email: user.email,
        learner_name: user.full_name || null,
        actor_email: user.email,
        actor_role: user.app_role || 'admin',
        source: 'admin',
        course_id: courseId,
        course_title: course.title,
        course_version: version,
        metadata: { lesson_count: lessonCount, change_note: body?.change_note || null },
      });

      return Response.json({ version: record, course_status: 'published' });
    }

    // ── Everything below is the learner's own record ──
    if (course.status !== 'published' && !ADMIN_ROLES.includes(user.app_role)) {
      return Response.json({ error: 'This course is not published.' }, { status: 403 });
    }

    const content = await resolveContent(service, course);
    const progress = await getOrCreateProgress(service, user, course);

    if (action === 'ensure_enrollment') {
      const touched = await service.entities.CourseProgress.update(progress.id, {
        last_accessed_at: new Date().toISOString(),
        ...(body?.lesson_id ? { last_lesson_id: body.lesson_id } : {}),
        ...(progress.status === 'not_started' ? { status: 'in_progress' } : {}),
      });
      return Response.json({ progress: touched, course_version: content.version?.version ?? null });
    }

    if (action === 'complete_lesson' || action === 'sync_modules') {
      let targetIds = [];

      if (action === 'complete_lesson') {
        const lessonId = body?.lesson_id;
        if (!lessonId) return Response.json({ error: 'lesson_id is required' }, { status: 400 });
        const lesson = content.lessons.find((item) => item.id === lessonId);
        if (!lesson) {
          return Response.json(
            { error: 'That lesson is not part of the published version of this course.' },
            { status: 409 }
          );
        }
        targetIds = [lessonId];
      } else {
        // Conversational modules the learner has finished are evidenced by their module
        // progress, so the server can complete those lessons without a browser claim.
        const moduleProgress = onePage(
          await service.entities.LearnerProgress.filter({ user_email: user.email, status: 'completed' })
        );
        const doneModules = new Set(moduleProgress.map((row) => row.conversational_learning_module_id));
        const already = new Set((progress.completed_lessons || []).map((entry) => entry.lesson_id));
        targetIds = content.lessons
          .filter(
            (lesson) =>
              lesson.content_type === 'conversational_module' &&
              doneModules.has(lesson.reference_id) &&
              !already.has(lesson.id)
          )
          .map((lesson) => lesson.id);
        if (targetIds.length === 0) {
          return Response.json({ progress, completed_now: false, course_version: content.version?.version ?? null });
        }
      }

      const byLesson = new Map(content.lessons.map((lesson) => [lesson.id, lesson]));
      for (const lessonId of targetIds) {
        const lesson = byLesson.get(lessonId);
        await logEvent(service, {
          client_id: course.client_id || user.client_id || null,
          event_type: 'lesson_completed',
          learner_email: user.email,
          learner_name: user.full_name || null,
          actor_email: user.email,
          course_id: courseId,
          course_title: course.title,
          course_version: content.version?.version ?? null,
          lesson_id: lessonId,
          lesson_title: lesson?.title || null,
          metadata: {
            content_type: lesson?.content_type || null,
            module_id: lesson?.module_id || null,
            module_title: lesson?.module_title || null,
            via: action === 'sync_modules' ? 'module_progress' : 'learner',
          },
        });
      }

      const result = await applyCompletion(service, user, course, progress, content, targetIds);
      return Response.json({
        progress: result.progress,
        completed_now: result.completedNow,
        course_version: content.version?.version ?? null,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Learning record update failed' }, { status: 500 });
  }
}