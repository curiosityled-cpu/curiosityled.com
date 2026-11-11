/**
 * Check-in presets — server-side mirror of src/lib/checkInPresets.js.
 * Shared by backend functions (saveDailyCheckIn, likertAuditAgent) so the
 * preset definitions live in one place on the server.
 *
 * Each preset uses the same 5 storage keys (energy/confidence/focus/load/growth)
 * so the DailyCheckIn schema stays unchanged.
 */

export const SCALE_LABELS: Record<number, string> = {
  1: "Low",
  2: "Below avg",
  3: "Okay",
  4: "Good",
  5: "Strong",
};

export interface CheckInMeasure {
  key: string;
  label: string;
  emoji: string;
  desc: string;
}

export interface CheckInPreset {
  id: string;
  name: string;
  description: string;
  measures: CheckInMeasure[];
  question_style: string;
}

export const CHECK_IN_PRESETS: Record<string, CheckInPreset> = {
  balance: {
    id: "balance",
    name: "Balance",
    description: "Steadiness across energy, clarity, momentum, pressure, and follow-through.",
    measures: [
      { key: "energy",     label: "Energy",     emoji: "⚡", desc: "Steadiness" },
      { key: "confidence", label: "Confidence", emoji: "🎯", desc: "Clarity" },
      { key: "focus",      label: "Focus",      emoji: "🔍", desc: "Momentum" },
      { key: "load",       label: "Load",       emoji: "🪨", desc: "Pressure" },
      { key: "growth",     label: "Growth",     emoji: "🌱", desc: "Follow-through" },
    ],
    question_style: "likert_statement",
  },
  wellbeing: {
    id: "wellbeing",
    name: "Wellbeing",
    description: "A calm, human-centered check-in rooted in rest, clarity, connection, and meaning.",
    measures: [
      { key: "energy",     label: "Energy",     emoji: "⚡", desc: "Rested & steady" },
      { key: "confidence", label: "Clarity",    emoji: "💡", desc: "Clear-headed" },
      { key: "focus",      label: "Connection", emoji: "🤝", desc: "Supported" },
      { key: "load",       label: "Workload",   emoji: "🪨", desc: "Manageable" },
      { key: "growth",     label: "Meaning",    emoji: "🌱", desc: "Purposeful" },
    ],
    question_style: "likert_statement",
  },
  performance: {
    id: "performance",
    name: "Performance",
    description: "An operational check-in focused on decisiveness, target focus, and follow-through.",
    measures: [
      { key: "energy",     label: "Energy",         emoji: "⚡", desc: "Fuel for the day" },
      { key: "confidence", label: "Decisiveness",  emoji: "🎯", desc: "Clear calls" },
      { key: "focus",      label: "Focus",          emoji: "🔍", desc: "On target" },
      { key: "load",       label: "Capacity",       emoji: "🪨", desc: "Sustainable load" },
      { key: "growth",     label: "Follow-through", emoji: "🌱", desc: "Commitments honored" },
    ],
    question_style: "likert_statement",
  },
};

export const DEFAULT_PRESET_ID = "balance";

export function getPreset(presetId: string | undefined | null): CheckInPreset {
  return CHECK_IN_PRESETS[presetId || ""] || CHECK_IN_PRESETS[DEFAULT_PRESET_ID];
}

export const MEASURE_KEYS = ["energy", "confidence", "focus", "load", "growth"];

/**
 * Which standard measures the organization has switched on, one by one.
 * An absent list means every measure of the preset. Organizations that used the
 * older "custom questions only" flag are read as having no measures until they
 * save a selection, so their check-ins do not silently change.
 */
export function getEnabledMeasureKeys(
  checkInConfig: any,
  options: { forFrontline?: boolean } = {}
): string[] {
  const list = checkInConfig?.enabled_measures;
  if (Array.isArray(list)) return list;
  // The older "custom questions only" flag belongs to the frontline (IC) check-in.
  // It must never strip the measures from a registered user's own daily check-in.
  if (options.forFrontline === true && checkInConfig?.ic_skip_measures === true) return [];
  return MEASURE_KEYS;
}

/** Whether the organization includes its custom questions in a check-in. */
export function customQuestionsEnabled(checkInConfig: any): boolean {
  return checkInConfig?.use_custom_questions !== false;
}