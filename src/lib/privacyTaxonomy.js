/**
 * Privacy Taxonomy
 * 
 * Formal data classification for all fields:
 * - Category A (Restricted): Raw emotional/health data, never exposed to HR
 * - Category B (Aggregate Only): Can be summarized/counted but not attributed
 * - Category C (Shareable): Professional data visible to manager with consent
 * - Category D (Public): Role, title, visible to all
 */

export const PRIVACY_TAXONOMY = {
  ManagerPulse: {
    // Category A: NEVER visible to HR, only manager + coach
    user_email: 'D',
    energy_level: 'A',
    mental_clarity: 'A',
    perceived_load: 'A',
    biggest_weight_today: 'A',
    avoidance_flag: 'A',
    confidence_today: 'A',
    motivation_today: 'A',
    optimism_today: 'A',
    resilience_signal: 'A',
    identity_friction: 'A',
    identity_friction_note: 'A',
    room_today: 'A',
    // Category B: Can be counted/aggregated, not attributed
    source: 'B',
    prompt_type: 'B',
    operator_mode_response: 'A',
    delegation_commitment: 'A',
    focus_category: 'A',
    focus_intention: 'A',
    intent_actuals_gap: 'A',
    follow_up_sent: 'B',
    follow_up_date: 'B',
    client_id: 'D',
  },

  ManagerTrends: {
    // All Category A except metadata
    user_email: 'D',
    confidence_trend: 'A',
    energy_trend: 'A',
    resilience_trend: 'A',
    identity_friction_signals: 'A',
    identity_friction_active: 'A',
    overload_pattern_strength: 'A',
    stretch_frequency_14d: 'A',
    operator_risk_trajectory: 'A',
    overload_acknowledgment_rate: 'A',
    summary_7d: 'A',
    summary_28d: 'A',
    trend_narrative: 'A',
    last_trend_computed_at: 'B',
    data_points_14d: 'B',
    data_points_28d: 'B',
    learning_stall_detected: 'A',
    delegation_intent_count_7d: 'A',
    delegation_gap_count_7d: 'A',
    client_id: 'D',
  },

  TonePreference: {
    user_email: 'D',
    tone_mode: 'C',
    cadence_preference: 'C',
    user_understanding_ack: 'C',
    last_prompt_sent_at: 'B',
    teams_onboarding_complete: 'C',
    calendar_consent_given: 'C',
    calendar_provider: 'C',
    user_timezone: 'C',
    client_id: 'D',
    share_energy_with_manager: 'C',
    share_energy_with_hr: 'C',
    share_goals_progress_with_manager: 'C',
    share_learning_with_hr: 'C',
    visibility_last_reviewed_at: 'C',
  },

  UserActivity: {
    user_email: 'D',
    date: 'B',
    meeting_count_day: 'B',
    meeting_minutes_day: 'B',
    back_to_back_density: 'B',
    late_day_load_minutes: 'B',
    one_to_one_count: 'B',
    overdue_goals_count: 'B',
    learning_inertia_days: 'B',
    stalled_strategic_goals: 'B',
    operator_mode_risk_score: 'B',
    source_systems: 'B',
    calendar_connected: 'C',
    client_id: 'D',
  },
};

/**
 * Verify field is in category
 */
export function isFieldCategory(entity, field, category) {
  const taxonomy = PRIVACY_TAXONOMY[entity];
  if (!taxonomy) return false;
  return taxonomy[field] === category;
}

/**
 * Get all fields in a category
 */
export function getFieldsInCategory(entity, category) {
  const taxonomy = PRIVACY_TAXONOMY[entity];
  if (!taxonomy) return [];
  return Object.keys(taxonomy).filter(field => taxonomy[field] === category);
}

/**
 * HR-safe field list (only B + D, never A)
 */
export function getHRSafeFields(entity) {
  const taxonomy = PRIVACY_TAXONOMY[entity];
  if (!taxonomy) return [];
  return Object.keys(taxonomy).filter(field => {
    const cat = taxonomy[field];
    return cat === 'B' || cat === 'D';
  });
}