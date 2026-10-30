/**
 * Scoring for signal quizzes / knowledge checks / assessments.
 *
 * Authoring stores correctness per question as:
 *   question.scoring = { enabled, correct_answers: [string], points, partial_credit }
 *
 * Scoring runs on the server only: the learner's copy of the signal is stripped of
 * the answer key (stripAnswerKeys) before it leaves the backend, so a score can
 * never be produced or edited from the browser.
 */

const ADMIN_ROLES = [
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Partner Business Administrator",
  "Platform Admin",
  "admin",
];

export function flattenQuestions(config: any): any[] {
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  const fromSections = sections.flatMap((s: any) =>
    Array.isArray(s?.questions) ? s.questions : []
  );
  if (fromSections.length > 0) return fromSections;
  return Array.isArray(config?.questions) ? config.questions : [];
}

/** The learner-facing copy of a signal config: structure kept, answer key removed. */
export function stripAnswerKeys(config: any): any {
  const strip = (question: any) => {
    const { scoring, correct_answer_index, explanation, ...rest } = question || {};
    return rest;
  };

  const out: any = { ...(config || {}) };

  if (Array.isArray(config?.sections)) {
    out.sections = config.sections.map((section: any) => ({
      ...section,
      questions: (section?.questions || []).map(strip),
    }));
  }
  if (Array.isArray(config?.questions)) {
    out.questions = config.questions.map(strip);
  }
  return out;
}

const normalise = (value: any) => String(value ?? "").trim().toLowerCase();

function correctAnswersFor(question: any): string[] {
  const scoring = question?.scoring;
  if (!scoring?.enabled) return [];
  const list = Array.isArray(scoring.correct_answers) ? scoring.correct_answers : [];
  return list.map(normalise).filter(Boolean);
}

function pointsFor(question: any): number {
  const points = Number(question?.scoring?.points);
  return Number.isFinite(points) && points > 0 ? points : 1;
}

/**
 * Scores stored responses against the answer key.
 * Questions without a key are ignored (they cannot be right or wrong) and are
 * reported so the caller can show "not scored" rather than a silent zero.
 */
export function scoreSignal(config: any, responses: any, passingScorePercentage?: number) {
  const questions = flattenQuestions(config);
  const answers = responses && typeof responses === "object" ? responses : {};

  let score = 0;
  let maxScore = 0;
  const questionResults: any[] = [];
  const unscored: string[] = [];

  for (const question of questions) {
    const correct = correctAnswersFor(question);
    if (correct.length === 0) {
      unscored.push(question?.id);
      continue;
    }

    const points = pointsFor(question);
    maxScore += points;

    const raw = answers[question?.id];
    let earned = 0;
    let isCorrect = false;

    if (question?.type === "checkboxes" || Array.isArray(raw)) {
      const selected = (Array.isArray(raw) ? raw : []).map(normalise).filter(Boolean);
      const selectedSet = new Set(selected);
      const correctSet = new Set(correct);
      const matched = [...selectedSet].filter((v) => correctSet.has(v)).length;
      const hasWrong = [...selectedSet].some((v) => !correctSet.has(v));
      const exact = matched === correctSet.size && selectedSet.size === correctSet.size;

      if (exact) {
        earned = points;
        isCorrect = true;
      } else if (question?.scoring?.partial_credit && !hasWrong && matched > 0) {
        earned = points * (matched / correctSet.size);
      }
    } else {
      const value = normalise(raw);
      if (value && correct.includes(value)) {
        earned = points;
        isCorrect = true;
      }
    }

    earned = Math.round(earned * 100) / 100;
    score += earned;

    questionResults.push({
      question_id: question?.id,
      question_text: question?.question_text || "",
      response: raw ?? null,
      correct: isCorrect,
      points_earned: earned,
      points_possible: points,
      correct_answers: question?.scoring?.correct_answers || [],
      explanation: question?.explanation || "",
    });
  }

  score = Math.round(score * 100) / 100;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const threshold = Number.isFinite(Number(passingScorePercentage))
    ? Number(passingScorePercentage)
    : 0;

  return {
    score,
    max_score: maxScore,
    percentage,
    passed: maxScore > 0 ? percentage >= threshold : false,
    passing_score_percentage: threshold,
    question_count: questions.length,
    scored_question_count: questionResults.length,
    unscored_question_ids: unscored,
    question_results: questionResults,
  };
}

export function isAdminUser(user: any): boolean {
  const role = user?.app_role || user?.data?.app_role || user?.role;
  return ADMIN_ROLES.includes(role);
}

/**
 * Whether this user may take this signal: it must be published, and either open,
 * assigned to them, or administered by them. Tenant is enforced when both sides
 * carry one, so a signal from another client cannot be opened by its id.
 */
export function canAccessSignal(assessment: any, user: any): boolean {
  if (!assessment || !user?.email) return false;
  if (assessment.status !== "published") return false;

  const admin = isAdminUser(user);
  const userClient = user?.client_id || user?.data?.client_id;
  if (assessment.client_id && userClient && assessment.client_id !== userClient && !admin) {
    return false;
  }

  if (assessment.access_mode === "open") return true;

  const assigned = Array.isArray(assessment.assigned_user_emails)
    ? assessment.assigned_user_emails.includes(user.email)
    : false;
  if (assigned) return true;

  return admin && assessment.allow_admin_self_enrollment === true;
}