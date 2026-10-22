import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

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

    // Rewards are best effort: they must never block the certificate itself.
    const rewards = await awardCourseRewards(req, base44, service, {
      user,
      course,
      progress,
      certificate,
    });

    return Response.json({ certificate, rewards });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Awards completion points and any badges the learner just became eligible for.
 * Badge and points functions are reused rather than reimplemented, so their
 * scoring stays in one place; both are called as trusted internal callers.
 */
async function awardCourseRewards(req, base44, service, { user, course, progress, certificate }) {
  const result = { points: 0, badges_awarded: [] };
  const internalSecret = secrets.get('INTERNAL_FUNCTION_SECRET');
  if (!internalSecret) return result;

  const origin = req.headers.get('X-Base44-App-Url') || 'https://curiosity-led.base44.app';
  const internalPost = (functionName, payload) =>
    fetch(`${origin}/functions/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${internalSecret}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

  const points = course?.points_value || 50;

  try {
    const pointsResponse = await internalPost('awardPoints', {
      user_email: user.email,
      points_amount: points,
      transaction_type: 'system_award',
      given_by_email: 'system',
      related_entity_type: 'Course',
      related_entity_id: progress.course_id,
      reason: `Completed course: ${course?.title || progress.course_title || 'Course'}`,
      client_id: progress.client_id || course?.client_id || null,
    });
    if (pointsResponse.ok) {
      result.points = points;
    } else {
      // awardPoints records the transaction before its level step, so confirm the
      // write rather than reporting a failure for points that did land.
      const recorded = await service.entities.PointTransaction.filter({
        user_email: user.email,
        related_entity_id: progress.course_id,
      });
      if (recorded.length) result.points = points;
      else console.warn('Course points failed:', pointsResponse.status);
    }
  } catch (error) {
    console.warn('Course points failed:', error.message);
  }

  try {
    const eligibilityResponse = await internalPost('evaluateAllBadges', { user_email: user.email });
    const eligibility = await eligibilityResponse.json();
    for (const badge of eligibility?.eligible_badges || []) {
      const awardResponse = await internalPost('awardBadge', {
        user_email: user.email,
        badge_template_id: badge.badge_id,
        awarded_by_email: 'system',
      });
      if (awardResponse.ok) {
        result.badges_awarded.push(badge.badge_name || 'Badge');
      }
    }
  } catch (error) {
    console.warn('Course badge evaluation failed:', error.message);
  }

  return result;
}