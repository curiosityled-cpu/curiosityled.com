// Which performance frameworks the organization has turned on in
// Organization Settings → Performance & Goals → "Goal framework".
// Stored on the client record as settings.goals.framework, either as an array
// (current) or a single string (legacy, where "hybrid" meant all three).

export const ALL_GOAL_FRAMEWORKS = ["goals", "kpis", "okrs"];

const isKnown = (value) => ALL_GOAL_FRAMEWORKS.includes(value);

/**
 * Resolve a raw settings.goals.framework value.
 * Falls back to all three when the organization has never chosen any, which is
 * how the app behaved before the setting existed.
 */
export function resolveFrameworkValue(raw) {
  if (Array.isArray(raw)) {
    const list = raw.filter(isKnown);
    return list.length > 0 ? list : ALL_GOAL_FRAMEWORKS;
  }

  if (typeof raw === "string" && raw) {
    if (raw === "hybrid") return ALL_GOAL_FRAMEWORKS;
    return isKnown(raw) ? [raw] : ALL_GOAL_FRAMEWORKS;
  }

  return ALL_GOAL_FRAMEWORKS;
}

/** Resolve the enabled frameworks for a client record. */
export function resolveGoalFrameworks(client) {
  return resolveFrameworkValue(client?.settings?.goals?.framework);
}