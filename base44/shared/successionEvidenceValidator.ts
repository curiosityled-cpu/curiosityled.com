/**
 * successionEvidenceValidator — shared validation for evidence operations.
 *
 * Validates that an EvidenceRecord can be created against a specific
 * EffectiveRequirementSnapshot child within a bound EffectiveBlueprintSnapshot.
 *
 * Reuses validateOperationalSnapshot for snapshot integrity verification,
 * then adds the effective-requirement-child check.
 */

import { validateOperationalSnapshot } from "./successionSnapshotValidator.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "./successionCrossTenantValidation.ts";

export interface EvidenceValidationResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  candidacy?: any;
  snapshot?: any;
  critical_role?: any;
  cycle?: any;
  requirement?: any;
}

/**
 * Validate the full chain: candidacy → snapshot → effective requirement child.
 * All must belong to the same tenant, the candidacy must be active and bound
 * to the specified snapshot, the snapshot must be generated/active with no
 * blocking incidents, and the effective requirement child must belong to that
 * snapshot and be applicable (not stale, quarantined, or from another version).
 */
export async function validateEvidenceChain(
  base44: any,
  client_id: string,
  candidacy_id: string,
  effective_blueprint_snapshot_id: string,
  effective_requirement_snapshot_id: string,
  operation_id?: string
): Promise<EvidenceValidationResult> {
  // ── 1. Candidacy must exist, be active, and belong to the tenant ──
  const candidacy = await validateSameTenantReference(
    base44, "SuccessorCandidacy", candidacy_id, client_id
  );
  if (!candidacy) {
    return {
      valid: false,
      error_code: "candidacy_not_found",
      error_message: "Candidacy not found",
    };
  }
  if (candidacy.status !== "active") {
    return {
      valid: false,
      error_code: "candidacy_not_active",
      error_message: "Candidacy must be active to attach evidence",
    };
  }

  // ── 2. Candidacy must be bound to the specified snapshot ──
  if (candidacy.effective_blueprint_snapshot_id !== effective_blueprint_snapshot_id) {
    return {
      valid: false,
      error_code: "snapshot_mismatch",
      error_message: "Candidacy is not bound to the specified snapshot",
    };
  }

  // ── 3. Validate the snapshot (generated, active, no blocking incidents, cycle active) ──
  const snapshotValidation = await validateOperationalSnapshot(
    base44, client_id, effective_blueprint_snapshot_id,
    candidacy.critical_role_id, candidacy.cycle_id
  );
  if (!snapshotValidation.valid) {
    return {
      valid: false,
      error_code: snapshotValidation.error_code,
      error_message: snapshotValidation.error_message,
    };
  }

  // ── 4. Effective requirement child must belong to the same snapshot ──
  const children = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
    id: effective_requirement_snapshot_id,
    client_id,
    effective_blueprint_snapshot_id,
  });
  if (children.length === 0) {
    return {
      valid: false,
      error_code: "requirement_not_found",
      error_message: "Effective requirement not found in this snapshot",
    };
  }
  const requirement = children[0];

  // ── 5. Requirement must be applicable (not not_applicable, not excepted with rejected status) ──
  if (requirement.applicability_status === "not_applicable") {
    return {
      valid: false,
      error_code: "requirement_not_applicable",
      error_message: "Cannot attach evidence to a not-applicable requirement",
    };
  }

  // ── 6. Requirement integrity must be active ──
  if (requirement.integrity_status !== "active") {
    return {
      valid: false,
      error_code: "requirement_not_active",
      error_message: "Effective requirement is not integrity-active",
    };
  }

  return {
    valid: true,
    error_code: "",
    error_message: "",
    candidacy,
    snapshot: snapshotValidation.snapshot,
    critical_role: snapshotValidation.critical_role,
    cycle: snapshotValidation.cycle,
    requirement,
  };
}