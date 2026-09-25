/**
 * successionReadinessValidator — shared validation for readiness deliberation.
 *
 * Validates that cited EvidenceRecords are eligible for citation:
 * - accepted or accepted_with_limitations status
 * - current (not expired/superseded/withdrawn)
 * - integrity_status = active
 * - same candidacy
 * - same snapshot
 * - linked to an exact frozen EffectiveRequirementSnapshot
 *
 * Also validates the conclusion chain: candidacy → snapshot → cycle.
 */

import { validateSameTenantReference, writeDeniedReferenceEvent } from "./successionCrossTenantValidation.ts";
import { validateOperationalSnapshot } from "./successionSnapshotValidator.ts";

export interface CitationValidationResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  evidence?: any;
  latest_review?: any;
  requirement?: any;
}

export interface ConclusionChainResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  candidacy?: any;
  snapshot?: any;
  cycle?: any;
  critical_role?: any;
}

/**
 * Validate the conclusion chain: candidacy must exist, be active, belong to
 * the tenant, and be bound to the specified snapshot. The snapshot must be
 * generated, active, with no blocking incidents, and the cycle must be active.
 */
export async function validateConclusionChain(
  base44: any,
  client_id: string,
  candidacy_id: string,
  effective_blueprint_snapshot_id: string,
  operation_id?: string
): Promise<ConclusionChainResult> {
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
      error_message: "Candidacy must be active to attach a readiness conclusion",
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

  // ── 3. Validate the snapshot ──
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

  return {
    valid: true,
    error_code: "",
    error_message: "",
    candidacy,
    snapshot: snapshotValidation.snapshot,
    cycle: snapshotValidation.cycle,
    critical_role: snapshotValidation.critical_role,
  };
}

/**
 * Validate that an EvidenceRecord is eligible for citation in a readiness
 * conclusion. All cited evidence — including contrary and contextual — must
 * be accepted or accepted_with_limitations, current, active, same-candidacy,
 * same-snapshot, and linked to an exact frozen requirement.
 */
export async function validateCitationEvidence(
  base44: any,
  client_id: string,
  evidence_record_id: string,
  candidacy_id: string,
  effective_blueprint_snapshot_id: string,
  effective_requirement_snapshot_id: string,
  operation_id?: string
): Promise<CitationValidationResult> {
  // ── 1. Evidence must exist and belong to the tenant ──
  const evidence = await validateSameTenantReference(
    base44, "EvidenceRecord", evidence_record_id, client_id
  );
  if (!evidence) {
    return {
      valid: false,
      error_code: "evidence_not_found",
      error_message: "Cited evidence not found",
    };
  }

  // ── 2. Evidence must be accepted or accepted_with_limitations ──
  if (evidence.status !== "accepted" && evidence.status !== "accepted_with_limitations") {
    return {
      valid: false,
      error_code: "evidence_not_accepted",
      error_message: "Only accepted or accepted_with_limitations evidence may be cited",
    };
  }

  // ── 3. Evidence must be current (not expired/superseded/withdrawn) ──
  // status is already checked above (accepted/accepted_with_limitations are current)

  // ── 4. Evidence integrity must be active ──
  if (evidence.integrity_status !== "active") {
    return {
      valid: false,
      error_code: "evidence_not_active",
      error_message: "Cited evidence is not integrity-active",
    };
  }

  // ── 5. Evidence must belong to the same candidacy ──
  if (evidence.candidacy_id !== candidacy_id) {
    return {
      valid: false,
      error_code: "evidence_candidacy_mismatch",
      error_message: "Cited evidence does not belong to this candidacy",
    };
  }

  // ── 6. Evidence must belong to the same snapshot ──
  if (evidence.effective_blueprint_snapshot_id !== effective_blueprint_snapshot_id) {
    return {
      valid: false,
      error_code: "evidence_snapshot_mismatch",
      error_message: "Cited evidence does not belong to this snapshot",
    };
  }

  // ── 7. Evidence must be linked to the exact frozen requirement ──
  if (evidence.effective_requirement_snapshot_id !== effective_requirement_snapshot_id) {
    return {
      valid: false,
      error_code: "evidence_requirement_mismatch",
      error_message: "Cited evidence does not match the specified requirement",
    };
  }

  // ── 8. The requirement child must exist and be active ──
  const reqChildren = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
    id: effective_requirement_snapshot_id,
    client_id,
    effective_blueprint_snapshot_id,
  });
  if (reqChildren.length === 0) {
    return {
      valid: false,
      error_code: "requirement_not_found",
      error_message: "Effective requirement not found in this snapshot",
    };
  }
  const requirement = reqChildren[0];
  if (requirement.integrity_status !== "active") {
    return {
      valid: false,
      error_code: "requirement_not_active",
      error_message: "Effective requirement is not integrity-active",
    };
  }

  // ── 9. Get the latest review decision for snapshot fields ──
  const reviews = await base44.asServiceRole.entities.EvidenceReviewDecision.filter({
    client_id,
    evidence_record_id,
    integrity_status: "active",
  }, "reviewed_at");
  const latest_review = reviews.length > 0 ? reviews[reviews.length - 1] : null;

  return {
    valid: true,
    error_code: "",
    error_message: "",
    evidence,
    latest_review,
    requirement,
  };
}

/**
 * Build the frozen snapshot fields for a ReadinessEvidenceCitation from the
 * validated evidence and its latest review.
 */
export function buildCitationSnapshot(evidence: any, latest_review: any | null) {
  return {
    snapshot_evidence_type: evidence.evidence_type,
    snapshot_strength: latest_review?.evidence_strength || null,
    snapshot_confidence: latest_review?.confidence || null,
    snapshot_relevance: latest_review?.relevance || null,
    snapshot_status: evidence.status,
    snapshot_source_date: evidence.source_date,
    snapshot_review_decision_id: latest_review?.id || null,
  };
}