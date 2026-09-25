/**
 * successionDevelopmentValidator — shared validation for Accelerate MVP.
 *
 * Validates DevelopmentPlanLink and DevelopmentAction creation chains:
 * - Candidacy must be active and belong to the tenant
 * - Readiness conclusion must belong to the candidacy
 * - Conclusion must be ratified, overridden, or returned for development
 * - Snapshot must match both candidacy and conclusion
 * - Linked DevelopmentPlan must belong to the same tenant
 * - Plan link must be active for action creation
 * - Linked condition must belong to the same conclusion
 * - Linked frozen requirement must belong to the bound snapshot
 * - Owner and linked resources must belong to the tenant
 */

import { validateSameTenantReference, writeDeniedReferenceEvent } from "./successionCrossTenantValidation.ts";

export const ELIGIBLE_CONCLUSION_STATUSES = [
  "ratified",
  "overridden",
  "returned_for_evidence",
  "returned_for_recalibration",
] as const;

export interface PlanLinkChainResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  candidacy?: any;
  conclusion?: any;
  snapshot?: any;
}

export interface ActionContextResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  plan_link?: any;
  conclusion?: any;
}

/**
 * Validate the plan link chain: candidacy → conclusion → snapshot.
 * - Candidacy must exist, be active, and belong to the tenant
 * - Conclusion must belong to the candidacy
 * - Conclusion must be ratified, overridden, or returned for development
 * - Snapshot must match both candidacy and conclusion
 */
export async function validatePlanLinkChain(
  base44: any,
  client_id: string,
  candidacy_id: string,
  readiness_conclusion_id: string,
  effective_blueprint_snapshot_id: string,
  operation_id?: string
): Promise<PlanLinkChainResult> {
  // ── 1. Candidacy must exist, be active, and belong to the tenant ──
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
    return { valid: false, error_code: "candidacy_not_active", error_message: "Candidacy must be active to link a development plan" };
  }

  // ── 2. Conclusion must exist and belong to the tenant ──
  const conclusion = await validateSameTenantReference(
    base44, "ReadinessConclusion", readiness_conclusion_id, client_id
  );
  if (!conclusion) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "ReadinessConclusion", readiness_conclusion_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "conclusion_not_found", error_message: "Readiness conclusion not found" };
  }

  // ── 3. Conclusion must belong to the specified candidacy ──
  if (conclusion.candidacy_id !== candidacy_id) {
    return { valid: false, error_code: "conclusion_candidacy_mismatch", error_message: "Readiness conclusion does not belong to this candidacy" };
  }

  // ── 4. Conclusion must be eligible for development ──
  if (!ELIGIBLE_CONCLUSION_STATUSES.includes(conclusion.workflow_status as any)) {
    return { valid: false, error_code: "conclusion_not_eligible", error_message: "Conclusion must be ratified, overridden, or returned for development" };
  }

  // ── 5. Snapshot must match both candidacy and conclusion ──
  if (candidacy.effective_blueprint_snapshot_id !== effective_blueprint_snapshot_id) {
    return { valid: false, error_code: "snapshot_candidacy_mismatch", error_message: "Snapshot does not match the candidacy" };
  }
  if (conclusion.effective_blueprint_snapshot_id !== effective_blueprint_snapshot_id) {
    return { valid: false, error_code: "snapshot_conclusion_mismatch", error_message: "Snapshot does not match the conclusion" };
  }

  return { valid: true, error_code: "", error_message: "", candidacy, conclusion };
}

/**
 * Validate that an existing DevelopmentPlan belongs to the same tenant.
 */
export async function validateLinkedDevelopmentPlan(
  base44: any,
  client_id: string,
  development_plan_id: string
): Promise<{ valid: boolean; error_code: string; error_message: string }> {
  const plan = await validateSameTenantReference(
    base44, "DevelopmentPlan", development_plan_id, client_id
  );
  if (!plan) {
    return { valid: false, error_code: "development_plan_not_found", error_message: "Linked development plan not found" };
  }
  return { valid: true, error_code: "", error_message: "" };
}

/**
 * Validate the action context: plan link must be active, condition and
 * requirement must belong to the same decision context.
 */
export async function validateActionContext(
  base44: any,
  client_id: string,
  development_plan_link_id: string,
  readiness_condition_id: string | null,
  effective_requirement_snapshot_id: string | null,
  operation_id?: string
): Promise<ActionContextResult> {
  // ── 1. Plan link must exist and belong to the tenant ──
  const plan_link = await validateSameTenantReference(
    base44, "DevelopmentPlanLink", development_plan_link_id, client_id
  );
  if (!plan_link) {
    if (operation_id) {
      await writeDeniedReferenceEvent(base44, { client_id, profile_id: null } as any, "DevelopmentPlanLink", development_plan_link_id, "cross_tenant_or_not_found", operation_id);
    }
    return { valid: false, error_code: "plan_link_not_found", error_message: "Development plan link not found" };
  }

  // ── 2. Plan link must be active or draft (actions can be added to draft plans) ──
  if (plan_link.status !== "active" && plan_link.status !== "draft") {
    return { valid: false, error_code: "plan_link_not_active", error_message: "Plan link must be active or draft to add actions" };
  }

  // ── 3. Load the conclusion for condition validation ──
  const conclusion = await validateSameTenantReference(
    base44, "ReadinessConclusion", plan_link.readiness_conclusion_id, client_id
  );
  if (!conclusion) {
    return { valid: false, error_code: "conclusion_not_found", error_message: "Readiness conclusion not found for plan link" };
  }

  // ── 4. If readiness_condition_id is provided, it must belong to the conclusion ──
  if (readiness_condition_id) {
    const condition = await validateSameTenantReference(
      base44, "ReadinessCondition", readiness_condition_id, client_id
    );
    if (!condition) {
      return { valid: false, error_code: "condition_not_found", error_message: "Linked condition not found" };
    }
    if (condition.readiness_conclusion_id !== plan_link.readiness_conclusion_id) {
      return { valid: false, error_code: "condition_conclusion_mismatch", error_message: "Linked condition does not belong to this conclusion" };
    }
  }

  // ── 5. If effective_requirement_snapshot_id is provided, it must belong to the snapshot ──
  if (effective_requirement_snapshot_id) {
    const reqChildren = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
      id: effective_requirement_snapshot_id,
      client_id,
      effective_blueprint_snapshot_id: plan_link.effective_blueprint_snapshot_id,
    });
    if (reqChildren.length === 0) {
      return { valid: false, error_code: "requirement_not_found", error_message: "Linked requirement not found in this snapshot" };
    }
    if (reqChildren[0].integrity_status !== "active") {
      return { valid: false, error_code: "requirement_not_active", error_message: "Linked requirement is not integrity-active" };
    }
  }

  return { valid: true, error_code: "", error_message: "", plan_link, conclusion };
}

/**
 * Validate that a referenced entity (owner, resource, goal, engagement)
 * belongs to the same tenant. Returns valid=true if the entity exists and
 * belongs to the tenant, valid=false otherwise.
 */
export async function validateTenantReference(
  base44: any,
  client_id: string,
  entity_type: string,
  entity_id: string
): Promise<{ valid: boolean; error_code: string; error_message: string }> {
  const record = await validateSameTenantReference(
    base44, entity_type, entity_id, client_id
  );
  if (!record) {
    return { valid: false, error_code: "reference_not_found", error_message: `${entity_type} not found` };
  }
  return { valid: true, error_code: "", error_message: "" };
}