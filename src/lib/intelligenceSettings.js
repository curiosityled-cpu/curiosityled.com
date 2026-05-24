/**
 * Leadership Intelligence Hub — Centralized Settings
 *
 * This module provides configurable thresholds and defaults used across
 * the hub. Values here are the single source of truth — no component
 * should hardcode these numbers directly.
 *
 * Future: these can be loaded from a client-specific settings entity
 * (e.g. IntelligenceSettings) once per-client configuration is supported.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mobility & Succession Thresholds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default thresholds for mobility chip filters.
 * These are platform defaults and may not reflect universal HR standards.
 * Override by passing client settings from a database entity.
 */
const DEFAULT_MOBILITY_THRESHOLDS = {
  highPotentialThreshold: 85,
  promotionReadyThreshold: 75,
};

/**
 * Get mobility thresholds, with optional client-specific overrides.
 * @param {object|null} clientSettings - from IntelligenceSettings entity (if available)
 * @returns {{ highPotentialThreshold: number, promotionReadyThreshold: number }}
 */
export function getMobilityThresholds(clientSettings = null) {
  return {
    highPotentialThreshold:
      clientSettings?.highPotentialThreshold ?? DEFAULT_MOBILITY_THRESHOLDS.highPotentialThreshold,
    promotionReadyThreshold:
      clientSettings?.promotionReadyThreshold ?? DEFAULT_MOBILITY_THRESHOLDS.promotionReadyThreshold,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Readiness Driver State Model
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Driver status enum values.
 * - "not_connected"  → data source is absent / not yet integrated
 * - "no_signal_yet"  → data source is connected but no relevant signal observed
 * - "measured"       → a numeric score was successfully derived
 */
export const DRIVER_STATUS = {
  NOT_CONNECTED: "not_connected",
  NO_SIGNAL_YET: "no_signal_yet",
  MEASURED: "measured",
};

/**
 * Build a structured driver state object.
 *
 * Rules:
 *   - If the data source is known to be absent (not integrated at all):
 *       → status: "not_connected", score: null
 *   - If the data source exists but no score could be derived from it
 *     (e.g. zero enrollments in an otherwise connected system):
 *       → status: "no_signal_yet", score: null
 *   - If a numeric score was derived (including 0%–20%):
 *       → status: "measured", score: <number>
 *
 * @param {boolean} sourceConnected   - is the upstream data source integrated?
 * @param {number|null} score         - derived score, or null if unavailable
 * @returns {{ status: string, score: number|null }}
 */
export function buildDriverState(sourceConnected, score) {
  if (!sourceConnected) {
    return { status: DRIVER_STATUS.NOT_CONNECTED, score: null };
  }
  if (score === null || score === undefined) {
    return { status: DRIVER_STATUS.NO_SIGNAL_YET, score: null };
  }
  return { status: DRIVER_STATUS.MEASURED, score };
}

/**
 * Derive readiness driver states from platform-native data.
 * Returns a map of driverKey → { status, score }.
 *
 * @param {object} params
 * @param {Array}  params.filtered          - filtered assessment records
 * @param {object} params.metrics           - org-level metrics summary
 * @param {Array}  params.journeyEnrollments
 * @param {Array}  params.assignedLearning
 * @param {Array}  params.allUsers
 * @param {Set}    params.activeEnrollments - Set of emails with active journey enrollments
 * @returns {Record<string, { status: string, score: number|null }>}
 */
export function deriveDriverStates({
  filtered = [],
  metrics = {},
  journeyEnrollments = [],
  assignedLearning = [],
  allUsers = [],
  activeEnrollments,
}) {
  const total = filtered.length;

  // ── Capability Evidence ──────────────────────────────────────────────────
  // Source: assessment records. Connected when there is at least one assessment.
  const capabilityConnected = total > 0;
  const getScore = (a) => a.overall_pct ?? a.data?.overall_pct ?? 0;
  const capabilityScore = capabilityConnected
    ? Math.round(filtered.reduce((sum, a) => sum + getScore(a), 0) / total)
    : null;

  // ── Execution & Follow-Through ───────────────────────────────────────────
  // Source: goals data. Connected when goals entity has records.
  const goalCount = metrics?.totalGoals ?? 0;
  const executionConnected = goalCount > 0;
  const rawGoalCompletion = metrics?.goalCompletionRate ?? null;
  // If connected but completion is 0, treat as measured (0% is a real signal)
  const executionScore = executionConnected ? (rawGoalCompletion ?? null) : null;

  // ── Development Engagement ───────────────────────────────────────────────
  // Source: journey enrollments + assigned learning.
  // Connected when any enrollment/learning record exists in the system.
  const developmentConnected = journeyEnrollments.length > 0 || assignedLearning.length > 0;
  const enrollmentSet = activeEnrollments ?? new Set(journeyEnrollments.map(j => j.user_email ?? j.data?.user_email));
  const developmentScore =
    developmentConnected && allUsers.length > 0
      ? Math.round((enrollmentSet.size / allUsers.length) * 100)
      : null;

  // ── Experience Context ───────────────────────────────────────────────────
  // Source: HRIS integration — not yet supported natively.
  // Always "not_connected" until HRIS is wired in.

  // ── Manager & Talent Calibration ─────────────────────────────────────────
  // Source: talent review module — not yet supported natively.

  return {
    capability:   buildDriverState(capabilityConnected, capabilityScore),
    execution:    buildDriverState(executionConnected, executionScore),
    development:  buildDriverState(developmentConnected, developmentScore),
    experience:   buildDriverState(false, null),     // HRIS not connected
    calibration:  buildDriverState(false, null),     // Talent review not connected
  };
}