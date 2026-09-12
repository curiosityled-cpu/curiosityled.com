/**
 * Check-in presets — configurable measure sets for the daily check-in engine.
 * Each preset uses the same 5 storage keys (energy/confidence/focus/load/growth)
 * so the DailyCheckIn schema and trend/pattern consumers stay unchanged.
 * Only the labels, emojis, descriptions, and question phrasing differ.
 */

export const SCALE_LABELS = {
  1: "Low",
  2: "Below avg",
  3: "Okay",
  4: "Good",
  5: "Strong",
};

export const CHECK_IN_PRESETS = {
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

export function getPreset(presetId) {
  return CHECK_IN_PRESETS[presetId] || CHECK_IN_PRESETS[DEFAULT_PRESET_ID];
}

export function getPresetMeasures(presetId) {
  return getPreset(presetId).measures;
}

export const PRESET_LIST = Object.values(CHECK_IN_PRESETS);