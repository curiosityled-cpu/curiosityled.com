import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Issues a course-completion certificate for the signed-in learner.
 * Idempotent: returns the existing certificate if one was already issued.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const progressId = body?.course_progress_id;
    if (!progressId) {
      return Response.json({ error: 'course_progress_id is required' }, { status: 400 });
    }

    const service = base44.asServiceRole;
    const progress = await service.entities.CourseProgress.get(progressId).catch(() => null);
    if (!progress) return Response.json({ error: 'Course progress not found' }, { status: 404 });
    if (progress.learner_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (progress.status !== 'completed') {
      return Response.json({ error: 'Course is not complete yet' }, { status: 400 });
    }

    if (progress.certificate_id) {
      const existing = await service.entities.LearningCertificate
        .get(progress.certificate_id)
        .catch(() => null);
      if (existing) return Response.json({ certificate: existing, alreadyIssued: true });
    }

    const course = progress.course_id
      ? await service.entities.Course.get(progress.course_id).catch(() => null)
      : null;

    const certificate = await service.entities.LearningCertificate.create({
      user_email: user.email,
      certificate_type: 'course_completion',
      title: `${course?.title || progress.course_title || 'Course'} — Certificate of Completion`,
      description: course?.description || 'Completed all required lessons in this course.',
      issued_date: new Date().toISOString(),
      verification_code: crypto.randomUUID(),
      competencies_demonstrated: course?.tags || [],
      final_score: progress.overall_percentage || 100,
      metadata: {
        course_id: progress.course_id,
        course_title: course?.title || progress.course_title || null,
        learner_name: user.full_name || null,
        lessons_completed: (progress.completed_lessons || []).length,
        client_id: progress.client_id || course?.client_id || null,
      },
    });

    await service.entities.CourseProgress.update(progressId, {
      certificate_issued: true,
      certificate_id: certificate.id,
    });

    return Response.json({ certificate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}