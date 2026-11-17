import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { stripAnswerKeys, canAccessSignal, flattenQuestions } from '../../shared/signalScoring.ts';

/**
 * Returns a signal (quiz / knowledge check / assessment) to the person taking it,
 * with the answer key removed. The learner's browser never receives correctness,
 * so a score cannot be read off or faked from the client.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assessment_id } = await req.json().catch(() => ({}));
    if (!assessment_id) return Response.json({ error: 'assessment_id is required' }, { status: 400 });

    const assessment = await base44.asServiceRole.entities.CustomAssessment.get(assessment_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!assessment) return Response.json({ error: 'Signal not found' }, { status: 404 });

    if (!canAccessSignal(assessment, user)) {
      return Response.json({ error: 'You do not have access to this signal' }, { status: 403 });
    }

    const questions = flattenQuestions(assessment.config);

    return Response.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description || '',
        type: assessment.type,
        passing_score_percentage: assessment.passing_score_percentage ?? null,
        question_count: questions.length,
        config: stripAnswerKeys(assessment.config),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}