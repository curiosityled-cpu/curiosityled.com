/**
 * successionSnapshotValidator — validates an EffectiveBlueprintSnapshot before
 * it is bound to a new candidacy.
 *
 * A generated snapshot is immutable. Before any operational use (candidacy
 * creation), the snapshot must pass full integrity re-verification:
 *   - belongs to the specified CriticalRole
 *   - status=generated, integrity_status=active
 *   - persisted child count equals expected AND generated counts
 *   - every child belongs to the same tenant and parent snapshot
 *   - recomputed child hash matches the parent requirements_content_hash
 *   - no open blocking SnapshotIntegrityIncident exists
 *   - the CriticalRole belongs to the active cycle
 *
 * This helper does NOT mutate any record. It returns a result object; the
 * caller decides how to surface failures (fail operation, 409, etc.).
 */
import { computePayloadHash } from "./successionPayloadCanonical.ts";

export interface SnapshotValidationResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  snapshot?: any;
  critical_role?: any;
  cycle?: any;
}

/**
 * The canonical hash input fields — must match the set used at snapshot
 * generation time (successionCreateEffectiveBlueprintSnapshot step 10).
 */
function buildChildHashInput(child: any) {
  return {
    source_type: child.source_type,
    source_requirement_id: child.source_requirement_id,
    base_requirement_id: child.base_requirement_id,
    base_blueprint_id: child.base_blueprint_id,
    base_blueprint_version_number: child.base_blueprint_version_number,
    modification_type: child.modification_type,
    effective_language: child.effective_language,
    effective_level: child.effective_level,
    applicability_status: child.applicability_status,
    exception_approval_status: child.exception_approval_status,
  };
}

export async function validateOperationalSnapshot(
  base44: any,
  client_id: string,
  snapshot_id: string,
  critical_role_id: string,
  cycle_id: string
): Promise<SnapshotValidationResult> {
  // ── 1. Load snapshot within tenant scope ──
  const snapshots = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.filter({
    id: snapshot_id,
    client_id,
  });
  if (snapshots.length === 0) {
    return { valid: false, error_code: "snapshot_not_found", error_message: "Snapshot not found" };
  }
  const snapshot = snapshots[0];

  // ── 2. Snapshot must belong to the specified CriticalRole ──
  if (snapshot.critical_role_id !== critical_role_id) {
    return { valid: false, error_code: "snapshot_role_mismatch", error_message: "Snapshot does not belong to the specified critical role" };
  }

  // ── 3. Snapshot must be generated and integrity-active ──
  if (snapshot.status !== "generated") {
    return { valid: false, error_code: "snapshot_not_generated", error_message: "Snapshot must be in 'generated' status" };
  }
  if (snapshot.integrity_status !== "active") {
    return { valid: false, error_code: "snapshot_not_active_integrity", error_message: "Snapshot integrity_status must be 'active'" };
  }

  // ── 4. Count check: expected == generated == persisted child count ──
  if (snapshot.expected_requirement_count !== snapshot.generated_requirement_count) {
    return { valid: false, error_code: "snapshot_count_invalid", error_message: "Snapshot expected/generated requirement counts do not match" };
  }

  // ── 5. Load persisted child records ──
  const children = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
    effective_blueprint_snapshot_id: snapshot_id,
    client_id,
  });

  // ── 6. Every child must belong to the same tenant and parent ──
  const orphanChildren = children.filter(
    (c: any) => c.client_id !== client_id || c.effective_blueprint_snapshot_id !== snapshot_id
  );
  if (orphanChildren.length > 0) {
    return { valid: false, error_code: "child_tenant_or_parent_mismatch", error_message: "One or more child records do not belong to this tenant or snapshot" };
  }

  // ── 7. Persisted child count must equal expected and generated counts ──
  if (children.length !== snapshot.expected_requirement_count || children.length !== snapshot.generated_requirement_count) {
    return { valid: false, error_code: "child_count_mismatch", error_message: `Child count mismatch: expected=${snapshot.expected_requirement_count}, generated=${snapshot.generated_requirement_count}, persisted=${children.length}` };
  }

  // ── 8. Recompute child hash and compare to parent ──
  if (!snapshot.requirements_content_hash) {
    return { valid: false, error_code: "snapshot_hash_missing", error_message: "Snapshot has no requirements_content_hash" };
  }
  const childHashInput = children.map(buildChildHashInput);
  const recomputedHash = await computePayloadHash(childHashInput);
  if (recomputedHash !== snapshot.requirements_content_hash) {
    return { valid: false, error_code: "child_hash_mismatch", error_message: "Recomputed child hash does not match parent requirements_content_hash" };
  }

  // ── 9. No open blocking SnapshotIntegrityIncident ──
  const blockingIncidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter({
    client_id,
    snapshot_id,
    operational_use_blocked: true,
    status: { $in: ["open", "under_review"] },
  });
  if (blockingIncidents.length > 0) {
    return { valid: false, error_code: "snapshot_blocked_by_incident", error_message: "Snapshot is blocked by an open SnapshotIntegrityIncident" };
  }

  // ── 10. CriticalRole must belong to the active cycle ──
  const roles = await base44.asServiceRole.entities.CriticalRole.filter({
    id: critical_role_id,
    client_id,
  });
  if (roles.length === 0) {
    return { valid: false, error_code: "critical_role_not_found", error_message: "Critical role not found" };
  }
  const criticalRole = roles[0];
  if (criticalRole.cycle_id !== cycle_id) {
    return { valid: false, error_code: "critical_role_not_in_cycle", error_message: "Critical role does not belong to the specified cycle" };
  }
  if (criticalRole.status !== "active") {
    return { valid: false, error_code: "critical_role_not_active", error_message: "Critical role must be active" };
  }

  const cycles = await base44.asServiceRole.entities.SuccessionCycle.filter({
    id: cycle_id,
    client_id,
  });
  if (cycles.length === 0) {
    return { valid: false, error_code: "cycle_not_found", error_message: "Cycle not found" };
  }
  const cycle = cycles[0];
  if (cycle.status !== "active") {
    return { valid: false, error_code: "cycle_not_active", error_message: "Cycle must be active" };
  }

  return { valid: true, error_code: "", error_message: "", snapshot, critical_role: criticalRole, cycle };
}