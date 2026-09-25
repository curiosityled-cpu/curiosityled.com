/**
 * successionTransitionValidator — shared validation for Transition MVP.
 *
 * Validates TransitionInitiation, KnowledgeTransferPlan, and TransitionPlan:
 * - For succession_process basis: candidacy/conclusion/successor/position chain
 * - For exception basis: external_authorization_reference + exception_reason required
 * - Conclusion must be ratified or overridden, current, and within review period
 * - No blocking integrity incidents
 * - Successor, sponsor, incumbent, owners must belong to the tenant
 * - SoD: requester cannot approve; successor cannot approve own transition
 * - Status transitions follow allowed paths only
 */

import { validateSameTenantReference, writeDeniedReferenceEvent } from "./successionCrossTenantValidation.ts";

export const ELIGIBLE_TRANSITION_CONCLUSION_STATUSES = [
  "ratified",
  "overridden",
] as const;

export interface TransitionChainResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  initiation?: any;
  candidacy?: any;
  conclusion?: any;
  critical_role?: any;
  org_position?: any;
}

/**
 * Validate the succession-process chain: candidacy → conclusion → critical_role → position.
 * - Candidacy must exist, be active, belong to the tenant, and match the critical_role
 * - Conclusion must exist, belong to the candidacy, be ratified/overridden, current, within review period
 * - Successor must match the candidacy
 * - CriticalRole must exist and belong to the tenant
 * - OrgPosition must exist and belong to the tenant
 */
export async function validateSuccessionProcessChain(
  base44: any,
  client_id: string,
  critical_role_id: string,
  org_position_id: string,
  successor_profile_id: string,
  candidacy_id: string,
  readiness_conclusion_id: string,
  operation_id?: string
): Promise<TransitionChainResult> {
  // ── 1. CriticalRole must exist and belong to the tenant ──
  const critical_role = await validateSameTenantReference(
    base44, "CriticalRole", critical_role_id, client_id
  );
  if (!critical_role) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "CriticalRole", critical_role_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "critical_role_not_found", error_message: "Critical role not found" };
  }

  // ── 2. OrgPosition must exist and belong to the tenant ──
  const org_position = await validateSameTenantReference(
    base44, "OrgPosition", org_position_id, client_id
  );
  if (!org_position) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "OrgPosition", org_position_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "org_position_not_found", error_message: "Organizational position not found" };
  }

  // ── 3. Candidacy must exist, be active, and belong to the tenant ──
  const candidacy = await validateSameTenantReference(
    base44, "SuccessorCandidacy", candidacy_id, client_id
  );
  if (!candidacy) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "SuccessorCandidacy", candidacy_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "candidacy_not_found", error_message: "Candidacy not found" };
  }
  if (candidacy.status !== "active") {
    return { valid: false, error_code: "candidacy_not_active", error_message: "Candidacy must be active" };
  }

  // ── 4. Candidacy must belong to the specified critical role ──
  if (candidacy.critical_role_id !== critical_role_id) {
    return { valid: false, error_code: "candidacy_role_mismatch", error_message: "Candidacy does not belong to this critical role" };
  }

  // ── 5. Successor must match the candidacy ──
  if (candidacy.user_profile_id !== successor_profile_id) {
    return { valid: false, error_code: "successor_candidacy_mismatch", error_message: "Successor does not match the candidacy" };
  }

  // ── 6. Conclusion must exist and belong to the tenant ──
  const conclusion = await validateSameTenantReference(
    base44, "ReadinessConclusion", readiness_conclusion_id, client_id
  );
  if (!conclusion) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "ReadinessConclusion", readiness_conclusion_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "conclusion_not_found", error_message: "Readiness conclusion not found" };
  }

  // ── 7. Conclusion must belong to the specified candidacy ──
  if (conclusion.candidacy_id !== candidacy_id) {
    return { valid: false, error_code: "conclusion_candidacy_mismatch", error_message: "Readiness conclusion does not belong to this candidacy" };
  }

  // ── 8. Conclusion must be ratified or overridden ──
  if (!ELIGIBLE_TRANSITION_CONCLUSION_STATUSES.includes(conclusion.workflow_status as any)) {
    return { valid: false, error_code: "conclusion_not_eligible", error_message: "Conclusion must be ratified or overridden" };
  }

  // ── 9. Conclusion must be current (not superseded) ──
  if (conclusion.workflow_status === "superseded") {
    return { valid: false, error_code: "conclusion_superseded", error_message: "Conclusion has been superseded" };
  }

  // ── 10. Conclusion must be within its review period ──
  if (conclusion.next_review_date) {
    const reviewDate = new Date(conclusion.next_review_date);
    const now = new Date();
    if (reviewDate < now) {
      return { valid: false, error_code: "conclusion_review_expired", error_message: "Conclusion review period has expired" };
    }
  }

  // ── 11. No blocking integrity incidents ──
  const incidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter({
    client_id,
    effective_blueprint_snapshot_id: conclusion.effective_blueprint_snapshot_id,
    status: "open",
    severity: "blocking",
  });
  if (incidents && incidents.length > 0) {
    return { valid: false, error_code: "blocking_integrity_incident", error_message: "A blocking integrity incident exists for this snapshot" };
  }

  return { valid: true, error_code: "", error_message: "", candidacy, conclusion, critical_role, org_position };
}

/**
 * Validate an exception-based initiation (non-succession_process basis).
 * Requires external_authorization_reference and exception_reason.
 */
export function validateExceptionBasis(
  initiation_basis: string,
  external_authorization_reference: string | null,
  exception_reason: string | null
): { valid: boolean; error_code: string; error_message: string } {
  if (initiation_basis === "succession_process") {
    return { valid: true, error_code: "", error_message: "" };
  }
  if (!external_authorization_reference || !external_authorization_reference.trim()) {
    return { valid: false, error_code: "missing_authorization_reference", error_message: "External authorization reference is required for exception-based transitions" };
  }
  if (!exception_reason || !exception_reason.trim()) {
    return { valid: false, error_code: "missing_exception_reason", error_message: "Exception reason is required for exception-based transitions" };
  }
  return { valid: true, error_code: "", error_message: "" };
}

/**
 * Validate that a TransitionInitiation exists, belongs to the tenant,
 * and is in an eligible status for plan creation (approved or in_progress).
 */
export async function validateInitiationForPlan(
  base44: any,
  client_id: string,
  transition_initiation_id: string,
  operation_id?: string
): Promise<{ valid: boolean; error_code: string; error_message: string; initiation?: any }> {
  const initiation = await validateSameTenantReference(
    base44, "TransitionInitiation", transition_initiation_id, client_id
  );
  if (!initiation) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "TransitionInitiation", transition_initiation_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "initiation_not_found", error_message: "Transition initiation not found" };
  }
  if (initiation.status !== "approved" && initiation.status !== "in_progress") {
    return { valid: false, error_code: "initiation_not_approved", error_message: "Transition initiation must be approved or in progress to add plans" };
  }
  return { valid: true, error_code: "", error_message: "", initiation };
}

/**
 * Validate separation of duties for transition approval.
 * - Approver must differ from the requester (initiated_by_profile_id)
 * - Successor cannot approve their own transition
 */
export function validateApprovalSoD(
  approver_profile_id: string,
  initiated_by_profile_id: string,
  successor_profile_id: string
): { valid: boolean; error_code: string; error_message: string } {
  if (approver_profile_id === initiated_by_profile_id) {
    return { valid: false, error_code: "approver_is_requester", error_message: "Requester cannot approve their own transition" };
  }
  if (approver_profile_id === successor_profile_id) {
    return { valid: false, error_code: "approver_is_successor", error_message: "Successor cannot approve their own transition" };
  }
  return { valid: true, error_code: "", error_message: "" };
}

/**
 * Validate a status transition for TransitionInitiation.
 * Allowed: draft→requested, requested→approved, approved→in_progress, in_progress→completed
 * Alternatives: draft→cancelled, requested→cancelled, approved→cancelled (with reason), in_progress→cancelled (with reason)
 * Rejected: draft→in_progress, requested→completed, completed→active/draft, cancelled→approved/in_progress
 */
export function validateStatusTransition(
  current_status: string,
  new_status: string,
  cancellation_reason?: string | null
): { valid: boolean; error_code: string; error_message: string } {
  const allowed: Record<string, string[]> = {
    draft: ["requested", "cancelled"],
    requested: ["approved", "cancelled"],
    approved: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  const allowedTargets = allowed[current_status] || [];
  if (!allowedTargets.includes(new_status)) {
    return { valid: false, error_code: "invalid_status_transition", error_message: `Cannot transition from ${current_status} to ${new_status}` };
  }

  // Cancellation from approved or in_progress requires reason
  if (new_status === "cancelled" && (current_status === "approved" || current_status === "in_progress")) {
    if (!cancellation_reason || !cancellation_reason.trim()) {
      return { valid: false, error_code: "cancellation_reason_required", error_message: "Cancellation reason is required when cancelling an approved or in-progress transition" };
    }
  }

  return { valid: true, error_code: "", error_message: "" };
}

/**
 * Validate that a referenced profile belongs to the same tenant.
 */
export async function validateProfileTenant(
  base44: any,
  client_id: string,
  profile_id: string
): Promise<{ valid: boolean; error_code: string; error_message: string }> {
  const record = await validateSameTenantReference(
    base44, "UserProfile", profile_id, client_id
  );
  if (!record) {
    return { valid: false, error_code: "profile_not_found", error_message: "Referenced profile not found in tenant" };
  }
  return { valid: true, error_code: "", error_message: "" };
}