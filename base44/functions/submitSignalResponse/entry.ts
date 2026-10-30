import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { scoreSignal, canAccessSignal } from '../../shared/signalScoring.ts';

/**
 * Scores a signal attempt on the server and records it. The answer key never leaves
 * the backend before submission, and the recorded score is always the server's own
 * computation — not a number supplied by the browser.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { assessment_id, responses } = await req.json().catch(() => ({}));
    if (!assessment_id) return Response.json({ error: 'assessment_id is required' }, { status: 400 });
    if (!responses || typeof responses !== 'object') {
      return Response.json({ error: 'responses are required' }, { status: 400 });
    }

    const assessment = await base44.asServiceRole.entities.CustomAssessment.get(assessment_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!assessment) return Response.json({ error: 'Signal not found' }, { status: 404 });

    if (!canAccessSignal(assessment, user)) {
      return Response.json({ error: 'You do not have access to this signal' }, { status: 403 });
    }

    const result = scoreSignal(
      assessment.config,
      responses,
      assessment.passing_score_percentage
    );

    if (result.scored_question_count === 0) {
      return Response.json(
        { error: 'This signal has no scored questions yet, so it cannot be graded' },
        { status: 400 }
      );
    }

    const submission = await base44.asServiceRole.entities.AssessmentSubmission.create({
      user_email: user.email,
      custom_assessment_id: assessment.id,
      client_id: assessment.client_id || user.client_id || user?.data?.client_id,
      leadership_level: user.leadership_level || 'Level 2 (Leading Others)',
      sector: user.sector || 'Corporate/Private',
      submission_date: new Date().toISOString(),
      status: 'scored',
      assessment_title: assessment.title,
      responses,
      score: result.score,
      max_score: result.max_score,
      percentage: result.percentage,
      passed: result.passed,
      passing_score_percentage: result.passing_score_percentage,
      question_results: result.question_results,
    });

    return Response.json({
      submission_id: submission.id,
      assessment_title: assessment.title,
      score: result.score,
      max_score: result.max_score,
      percentage: result.percentage,
      passed: result.passed,
      passing_score_percentage: result.passing_score_percentage,
      scored_question_count: result.scored_question_count,
      unscored_question_ids: result.unscored_question_ids,
      question_results: result.question_results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}