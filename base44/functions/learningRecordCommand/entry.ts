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

/** How long a training record stays in its current state before it is archived. */
const RETENTION_YEARS = 7;

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
    learner_name: user.full_name || null,
    client_id: course.client_id || user.client_id || null,
    status: 'not_started',
    overall_percentage: 0,
    enrolled_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    assignment_basis: 'self_enrolled',
    assignment_basis_label: 'Self-enrolled from the course catalogue',
    assignment_basis_detail: { via: 'self_enrolment' },
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
    const service = base44.asServiceRole;

    // ── Retention: a tenant-wide maintenance act, not tied to one course ──
    // Reaching the end of the window archives a record; it never deletes one, so the
    // transcript and its history stay readable and a hold can still be placed later.
    if (action === 'apply_retention') {
      if (!ADMIN_ROLES.includes(user.app_role)) {
        return Response.json({ error: 'Forbidden - admin access required' }, { status: 403 });
      }

      const clientId = user.client_id || body?.client_id;
      if (!clientId) {
        return Response.json(
          { error: 'A client is required to apply a retention schedule.' },
          { status: 400 }
        );
      }

      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
      const cutoffIso = cutoff.toISOString();
      const cutoffDate = cutoffIso.slice(0, 10);

      const completed = onePage(
        await service.entities.CourseProgress.filter({ client_id: clientId, status: 'completed' })
      );
      const eligible = completed.filter(
        (row) =>
          row.completed_at &&
          row.completed_at < cutoffIso &&
          !row.legal_hold &&
          row.retention_state !== 'archived'
      );

      const now = new Date().toISOString();
      let archivedCount = 0;

      for (const row of eligible) {
        try {
          await service.entities.CourseProgress.update(row.id, {
            retention_state: 'archived',
            retention_archived_at: now,
            retention_reason: `Retention window of ${RETENTION_YEARS} years reached (cutoff ${cutoffDate}).`,
          });
          await logEvent(service, {
            event_type: 'record_archived',
            client_id: row.client_id || clientId,
            learner_email: row.learner_email,
            learner_name: row.learner_name || null,
            actor_email: user.email,
            actor_role: user.app_role || 'admin',
            source: 'admin',
            course_id: row.course_id,
            course_title: row.course_title || null,
            metadata: {
              retention_years: RETENTION_YEARS,
              cutoff: cutoffIso,
              completed_at: row.completed_at,
            },
          });
          archivedCount += 1;
        } catch (error) {
          console.warn('Retention archiving failed for', row.id, error.message);
        }
      }

      return Response.json({
        retention_years: RETENTION_YEARS,
        cutoff: cutoffIso,
        evaluated: completed.length,
        on_hold: completed.filter((row) => row.legal_hold).length,
        archived: archivedCount,
        previously_archived: completed.filter((row) => row.retention_state === 'archived').length,
      });
    }

    const courseId = body?.course_id;
    if (!courseId) return Response.json({ error: 'course_id is required' }, { status: 400 });

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

    // ── Certificate revocation: a certificate that cannot be withdrawn is not evidence ──
    if (action === 'revoke_certificate') {
      if (!ADMIN_ROLES.includes(user.app_role)) {
        return Response.json({ error: 'Forbidden - admin access required' }, { status: 403 });
      }

      const certificateId = body?.certificate_id;
      const reason = String(body?.reason || '').trim();
      if (!certificateId) return Response.json({ error: 'certificate_id is required' }, { status: 400 });
      if (!reason) {
        return Response.json({ error: 'A reason is required to revoke a certificate.' }, { status: 400 });
      }

      const certificate = await service.entities.LearningCertificate
        .get(certificateId)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!certificate) return Response.json({ error: 'Certificate not found' }, { status: 404 });
      if (certificate.status === 'revoked') return Response.json({ certificate, already_revoked: true });

      const now = new Date().toISOString();
      const updated = await service.entities.LearningCertificate.update(certificateId, {
        status: 'revoked',
        revoked_at: now,
        revoked_by: user.email,
        revocation_reason: reason,
      });

      await logEvent(service, {
        event_type: 'certificate_revoked',
        client_id: course.client_id || certificate.client_id || user.client_id || null,
        learner_email: certificate.user_email,
        learner_name: certificate.metadata?.learner_name || null,
        actor_email: user.email,
        actor_role: user.app_role || 'admin',
        source: 'admin',
        course_id: courseId,
        course_title: course.title,
        metadata: {
          certificate_id: certificateId,
          reason,
          verification_code: certificate.verification_code || null,
        },
      });

      return Response.json({ certificate: updated });
    }

    // ── Legal hold: preserves a record whatever the retention schedule says ──
    if (action === 'set_legal_hold' || action === 'clear_legal_hold') {
      if (!ADMIN_ROLES.includes(user.app_role)) {
        return Response.json({ error: 'Forbidden - admin access required' }, { status: 403 });
      }

      const learnerEmail = body?.learner_email;
      const reason = String(body?.reason || '').trim();
      if (!learnerEmail) return Response.json({ error: 'learner_email is required' }, { status: 400 });
      if (!reason) {
        return Response.json(
          { error: 'A reason is required to place or release a legal hold.' },
          { status: 400 }
        );
      }

      const rows = onePage(
        await service.entities.CourseProgress.filter({ course_id: courseId, learner_email: learnerEmail })
      );
      const progress = rows[0];
      if (!progress) {
        return Response.json({ error: 'That learner is not assigned to this course.' }, { status: 404 });
      }

      const held = action === 'set_legal_hold';
      const now = new Date().toISOString();

      const updated = await service.entities.CourseProgress.update(progress.id, {
        legal_hold: held,
        legal_hold_reason: reason,
        legal_hold_set_by: held ? user.email : null,
        legal_hold_set_at: held ? now : null,
      });

      await logEvent(service, {
        event_type: held ? 'legal_hold_set' : 'legal_hold_cleared',
        client_id: course.client_id || progress.client_id || user.client_id || null,
        learner_email: learnerEmail,
        learner_name: progress.learner_name || null,
        actor_email: user.email,
        actor_role: user.app_role || 'admin',
        source: 'admin',
        course_id: courseId,
        course_title: course.title,
        metadata: {
          reason,
          previous_hold_reason: held ? null : progress.legal_hold_reason || null,
          held_since: held ? now : progress.legal_hold_set_at || null,
        },
      });

      return Response.json({ progress: updated });
    }

    // ── Waivers and extensions: administrative acts, kept with reason and approver ──
    const ADMIN_ACTIONS = ['grant_waiver', 'decline_waiver', 'grant_extension'];

    if (ADMIN_ACTIONS.includes(action) || action === 'request_waiver') {
      const isAdminAction = ADMIN_ACTIONS.includes(action);
      if (isAdminAction && !ADMIN_ROLES.includes(user.app_role)) {
        return Response.json({ error: 'Forbidden - admin access required' }, { status: 403 });
      }

      const learnerEmail = isAdminAction ? body?.learner_email : user.email;
      if (!learnerEmail) return Response.json({ error: 'learner_email is required' }, { status: 400 });

      const rows = onePage(
        await service.entities.CourseProgress.filter({ course_id: courseId, learner_email: learnerEmail })
      );
      const progress = rows[0];
      if (!progress) {
        return Response.json({ error: 'That learner is not assigned to this course.' }, { status: 404 });
      }

      const now = new Date().toISOString();
      const reason = String(body?.reason || '').trim();
      if (!reason) return Response.json({ error: 'A reason is required.' }, { status: 400 });

      const record = (event_type, metadata) =>
        logEvent(service, {
          event_type,
          client_id: course.client_id || progress.client_id || user.client_id || null,
          learner_email: learnerEmail,
          learner_name: progress.learner_name || null,
          actor_email: user.email,
          actor_role: isAdminAction ? user.app_role || 'admin' : 'learner',
          source: isAdminAction ? 'admin' : 'learner',
          course_id: courseId,
          course_title: course.title,
          metadata,
        });

      if (action === 'request_waiver') {
        const updated = await service.entities.CourseProgress.update(progress.id, {
          waiver_status: 'requested',
          waiver_reason: reason,
          waiver_requested_at: now,
          waiver_requested_by: user.email,
        });
        await record('waiver_requested', { reason });
        return Response.json({ progress: updated });
      }

      if (action === 'grant_waiver' || action === 'decline_waiver') {
        const granted = action === 'grant_waiver';
        const updated = await service.entities.CourseProgress.update(progress.id, {
          waiver_status: granted ? 'granted' : 'declined',
          waiver_reason: reason,
          waiver_decided_by: user.email,
          waiver_decided_at: now,
          waiver_decision_note: body?.note || null,
        });
        await record(granted ? 'assignment_waived' : 'waiver_declined', {
          reason,
          note: body?.note || null,
          previous_status: progress.waiver_status || 'none',
        });
        return Response.json({ progress: updated });
      }

      // grant_extension — moves the due date and keeps the original for comparison
      const days = Number(body?.days);
      if (!Number.isFinite(days) || days === 0) {
        return Response.json({ error: 'Choose a number of days to extend by.' }, { status: 400 });
      }
      const baseline = progress.due_date ? new Date(`${progress.due_date}T00:00:00Z`) : new Date();
      const nextDue = new Date(baseline.getTime() + days * 86400000).toISOString().slice(0, 10);

      const updated = await service.entities.CourseProgress.update(progress.id, {
        due_date: nextDue,
        due_date_original: progress.due_date_original || progress.due_date || null,
        extension_granted_days: (progress.extension_granted_days || 0) + days,
        extension_reason: reason,
        extension_granted_by: user.email,
        extension_granted_at: now,
        reminder_sent_at: null,
      });
      await record('due_date_extended', {
        reason,
        days,
        previous_due_date: progress.due_date || null,
        new_due_date: nextDue,
      });
      return Response.json({ progress: updated });
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