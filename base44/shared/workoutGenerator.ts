/**
 * workoutGenerator — shared core for pattern-driven workout generation.
 *
 * Used by:
 *   - generatePatternWorkout (on-demand, user-triggered)
 *   - refreshPatternWorkouts (nightly, service-role)
 *
 * Exports:
 *   - generateWorkoutModule(base44, brief): calls InvokeLLM with a response_json_schema
 *     mirroring ConversationalLearningModule.conversation_structure, validates the
 *     one-skill/one-task constraint, and returns a module object.
 *   - attachAssets(base44, competency, allowWebSearch): curated LearningResource first,
 *     optional LLM web-search fallback that persists a lightweight resource record.
 */

export interface PatternBrief {
  pattern_id: string;
  label: string;
  evidence: string[];
  strength: number;
  competency: string;
  type: 'skill' | 'task';
  user_context: string;
  modality_hint?: string;
  leadership_level?: string;
}

const MODALITY_RULES: Record<string, string> = {
  identity_friction: 'roleplay',
  overload: 'reflection',
  declining_confidence: 'scenario',
  delegation_gap: 'scenario',
  performance_avoidance: 'scenario',
  knowledge_gap: 'knowledge_check',
  real_task: 'scenario',
};

export function selectModality(brief: PatternBrief): string {
  if (brief.modality_hint) return brief.modality_hint;
  return MODALITY_RULES[brief.pattern_id] || 'reflection';
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    competencies: { type: 'array', items: { type: 'string' } },
    estimated_duration_minutes: { type: 'number' },
    conversation_structure: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step_id: { type: 'string' },
          step_type: { type: 'string', enum: ['intro', 'question', 'scenario', 'reflection', 'knowledge_check', 'summary'] },
          content: { type: 'string' },
          learning_objective: { type: 'string' },
          coaching_notes: { type: 'string' },
          success_criteria: { type: 'string' },
          knowledge_check: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correct_answer_index: { type: 'number' },
              explanation: { type: 'string' },
            },
          },
        },
      },
    },
    summary_commitment_prompt: { type: 'string' },
  },
  required: ['title', 'description', 'competencies', 'conversation_structure'],
};

const DEFAULT_LEADERSHIP_LEVEL = 'Mid-Level Manager (managers of managers, experienced team leads, functional leads)';

export async function generateWorkoutModule(base44: any, brief: PatternBrief): Promise<any> {
  const modality = selectModality(brief);
  const focusNoun = brief.type === 'task' ? 'a real situation they are actually in' : 'a single leadership skill';
  const competencyNoun = brief.type === 'task' ? 'real task' : 'skill';

  const prompt = `You are designing a short conversational leadership workout for a manager.
The workout is delivered as a multi-step conversation with an AI coach named Atreus.

HARD CONSTRAINTS (do not violate any):
1. This workout develops exactly ONE ${competencyNoun}: "${brief.competency}".
2. Do NOT introduce a second skill or task. Everything in the workout serves this one focus.
3. The workout must be 3-7 minutes long, with 4 to 6 conversation steps.
4. Step types available: intro, question, scenario, reflection, knowledge_check, summary.
5. The FIRST step must be type "intro" — a warm, brief framing of the workout.
6. The LAST step must be type "summary" — it asks for exactly ONE concrete commitment: one specific move the manager can make today.
7. Use the preferred modality "${modality}" for at least one middle step:
   - "roleplay": a scenario step where Atreus offers to play the other person in a real conversation.
   - "scenario": a situation-based practice step.
   - "reflection": a reflective question step.
   - "knowledge_check": a quiz step with a knowledge_check object (question, 3-4 options, correct_answer_index, explanation).
8. Each step's "content" is what Atreus says to open that step. Keep it concise and human.
9. Each step's "coaching_notes" guides Atreus on how to respond to the manager.
10. Each step's "success_criteria" describes what the manager needs to say for the step to be complete.
11. The summary step's "content" must ask for one specific, doable commitment — and its "success_criteria" is that the manager names one concrete move.

PATTERN BRIEF:
- Pattern: ${brief.label} (id: ${brief.pattern_id})
- Workout type: ${brief.type} (${focusNoun})
- Evidence: ${brief.evidence.join('; ')}
- Pattern strength: ${brief.strength}/100
- Focus ${competencyNoun}: ${brief.competency}
- Manager context: ${brief.user_context}
- Preferred modality: ${modality}

Return ONLY a JSON object matching the schema. The "competencies" array must contain exactly one entry: "${brief.competency}".`;

  const response: any = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: RESPONSE_SCHEMA,
  });

  let module = response || {};
  // Validate: enforce single competency
  if (Array.isArray(module.competencies) && module.competencies.length > 1) {
    module.competencies = [module.competencies[0]];
  }
  if (!module.competencies || module.competencies.length === 0) {
    module.competencies = [brief.competency];
  }
  // Ensure a summary step exists
  const steps = Array.isArray(module.conversation_structure) ? module.conversation_structure : [];
  const hasSummary = steps.some((s: any) => s.step_type === 'summary');
  if (!hasSummary) {
    steps.push({
      step_id: 'summary',
      step_type: 'summary',
      content: module.summary_commitment_prompt || 'Based on this workout, what is one concrete move you will make today?',
      learning_objective: 'Capture one commitment',
      coaching_notes: 'Help the manager name exactly one specific, doable action. Do not accept vague answers.',
      success_criteria: 'Manager states one concrete commitment they will act on today.',
    });
    module.conversation_structure = steps;
  }
  // Ensure an intro step exists
  const hasIntro = steps.some((s: any) => s.step_type === 'intro');
  if (!hasIntro) {
    steps.unshift({
      step_id: 'intro',
      step_type: 'intro',
      content: module.description || `Let's spend a few minutes on ${brief.competency}.`,
      learning_objective: 'Frame the workout',
      coaching_notes: 'Be warm and brief. Set up the focus.',
      success_criteria: 'Manager is oriented to the workout focus.',
    });
    module.conversation_structure = steps;
  }
  if (!module.estimated_duration_minutes) module.estimated_duration_minutes = 5;
  if (!module.title) module.title = `${brief.label} workout`;
  if (!module.description) module.description = `A ${brief.type} workout on ${brief.competency}, generated from the "${brief.label}" pattern.`;
  return module;
}

export async function attachAssets(base44: any, competency: string, allowWebSearch = false): Promise<string[]> {
  // 1. Curated library first
  try {
    const resources = await base44.entities.LearningResource.filter({
      competencies: { $in: [competency] },
      is_active: true,
    }, null, 2);
    if (resources && resources.length > 0) {
      return resources.map((r: any) => r.id);
    }
  } catch { /* curated miss — fall through */ }

  // 2. Optional web-search fallback (on-demand only, to control cost/clutter)
  if (!allowWebSearch) return [];

  try {
    const search: any = await base44.integrations.Core.InvokeLLM({
      prompt: `Find one high-quality, publicly accessible article or resource about the leadership competency "${competency}" for managers. Return the URL and title.`,
      add_context_from_internet: true,
      model: 'gemini_3_8_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['url'],
      },
    });
    if (search?.url) {
      const resource = await base44.entities.LearningResource.create({
        title: search.title || `Resource on ${competency}`,
        type: 'external_link',
        url: search.url,
        competencies: [competency],
        is_active: true,
        access: 'Free',
        tags: ['web_found', 'auto_generated'],
      });
      return [resource.id];
    }
  } catch { /* best-effort */ }
  return [];
}

export const WORKOUT_DEFAULTS = {
  leadership_level: DEFAULT_LEADERSHIP_LEVEL,
  points_value: 50,
};