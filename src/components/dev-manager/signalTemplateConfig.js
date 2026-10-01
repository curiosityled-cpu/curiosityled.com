/**
 * Signal template definitions — settings-only presets per signal type.
 * Each template pre-configures the target entity + form/assessment type,
 * scoring, and passing threshold. Questions start empty; FormBuilderEditor
 * + AI Assist populate them.
 *
 * Shape:
 *   entity: "CustomAssessment" | "CustomForm"
 *   label:  display name
 *   defaultData: preset fields merged into the entity record on create
 *   scoringEnabled: whether scoring is on
 *   showPassingScore: whether the passing-score input is shown
 */

export const SIGNAL_TYPE_CONFIG = {
  assessment: {
    entity: "CustomAssessment",
    label: "Assessment",
    scoringEnabled: true,
    showPassingScore: true,
    defaultData: {
      type: "custom_assessment",
      passing_score_percentage: 70,
      scoring_enabled: true,
      competency_ids: [],
    },
  },
  quiz: {
    entity: "CustomAssessment",
    label: "Quiz",
    scoringEnabled: true,
    showPassingScore: true,
    defaultData: {
      type: "quiz",
      passing_score_percentage: 70,
      scoring_enabled: true,
    },
  },
  knowledge_check: {
    entity: "CustomAssessment",
    label: "Knowledge Check",
    scoringEnabled: true,
    showPassingScore: true,
    defaultData: {
      type: "knowledge_check",
      passing_score_percentage: 100,
      scoring_enabled: true,
    },
  },
  survey: {
    entity: "CustomForm",
    label: "Survey",
    scoringEnabled: false,
    showPassingScore: false,
    defaultData: {
      form_type: "feedback_survey",
      form_category: "survey",
      scoring_enabled: false,
    },
  },
  pulse: {
    entity: "CustomForm",
    label: "Pulse",
    scoringEnabled: false,
    showPassingScore: false,
    defaultData: {
      form_type: "poll",
      form_category: "survey",
      scoring_enabled: false,
    },
  },
  feedback: {
    entity: "CustomForm",
    label: "Feedback",
    scoringEnabled: false,
    showPassingScore: false,
    defaultData: {
      form_type: "satisfaction_survey",
      form_category: "evaluation",
      scoring_enabled: false,
    },
  },
  custom: {
    entity: "CustomForm",
    label: "Custom Form",
    scoringEnabled: false,
    showPassingScore: false,
    defaultData: {
      form_type: "custom",
      form_category: "operational",
      scoring_enabled: false,
    },
  },
};

/**
 * Load existing signal config into FormBuilderEditor sections.
 * Bridges the two historical config shapes:
 *   - CustomForm.config       → { sections: [...] } (native)
 *   - CustomAssessment.config  → { questions: [...] } (flat) — wrapped into one section
 * If `sections` already exist (new-style), use them directly.
 */
export function configToSections(config) {
  if (!config) return [];
  if (Array.isArray(config.sections) && config.sections.length > 0) {
    return config.sections;
  }
  if (Array.isArray(config.questions) && config.questions.length > 0) {
    return [
      {
        id: `section_legacy_${Date.now()}`,
        title: "Questions",
        description: "",
        questions: config.questions,
      },
    ];
  }
  return [];
}

/**
 * Serialize FormBuilderEditor sections back into the entity config shape.
 * For CustomForm: stores { sections, ...flags }.
 * For CustomAssessment: stores { sections, questions: flattened, ...flags }
 *   so the editor preserves structure AND the legacy scoring/display engines
 *   that read config.questions keep working.
 */
export function sectionsToConfig(sections, isAssessment, extra = {}) {
  const cleanSections = (sections || []).map((s) => ({
    id: s.id,
    title: s.title || "Untitled Section",
    description: s.description || "",
    questions: (s.questions || []).map((q) => {
      const out = { ...q };
      // Drop undefined option arrays for non-choice questions
      if (
        !["multiple_choice", "checkboxes", "dropdown"].includes(q.type) &&
        (!q.options || q.options.length === 0)
      ) {
        delete out.options;
      }
      return out;
    }),
  }));

  const config = { sections: cleanSections, ...extra };
  if (isAssessment) {
    config.questions = cleanSections.flatMap((s) => s.questions || []);
  }
  return config;
}