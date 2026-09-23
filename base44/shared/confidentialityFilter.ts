/**
 * confidentialityFilter — server-side field/record filtering by
 * confidentiality_level + caller clearance.
 *
 * A caller may read records at or below their clearance rank.
 * Records above the caller's clearance are filtered out entirely.
 */

import { CONFIDENTIALITY_CLEARANCE_ORDER } from "./successionConstants.ts";

export function getClearanceRank(level: string | undefined | null): number {
  if (!level) return 0;
  return CONFIDENTIALITY_CLEARANCE_ORDER[level] ?? 0;
}

/**
 * Filter an array of records, removing any whose confidentiality_level
 * exceeds the caller's clearance.
 */
export function filterByConfidentiality<T extends { confidentiality_level?: string }>(
  records: T[],
  callerClearance: string
): T[] {
  const callerRank = getClearanceRank(callerClearance);
  return (records || []).filter(
    (r) => getClearanceRank(r.confidentiality_level) <= callerRank
  );
}

/**
 * Check whether a single record's confidentiality_level is within the
 * caller's clearance.
 */
export function isWithinClearance(
  recordLevel: string | undefined | null,
  callerClearance: string
): boolean {
  return getClearanceRank(recordLevel) <= getClearanceRank(callerClearance);
}