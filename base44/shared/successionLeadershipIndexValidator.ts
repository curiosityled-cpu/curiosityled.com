/**
 * successionLeadershipIndexValidator — shared validation for Leadership Index
 * evidence integration.
 *
 * Validates assessment eligibility, mapping rules, and evidence fingerprint
 * computation. Does NOT score, rank, or recommend.
 */

import { validateSameTenantReference } from "./successionCrossTenantValidation.ts";

// ── Constants ────────────────────────────────────────────────────────────

/**
 * The Leadership Index framework version. The current platform has a single
 * fixed framework version. This is stored as provenance in the mapping entity
 * and in EvidenceRecord descriptions — it is NOT a field on the Assessment
 * or AssessmentSubmission entities.
 */
export const LEADERSHIP_INDEX_FRAMEWORK_VERSION = "leadership_index_v1";

/**
 * Known Leadership Index competency field_keys. An AssessmentSubmission is
 * considered a Leadership Index assessment if its linked CustomAssessment
 * has competency_ids that include at least one Competency with one of these
 * field_keys.
 */
export const LEADERSHIP_INDEX_COMPETENCY_KEYS = new Set([
  "si", "dm", "comm", "rm", "sm", "pm",
]);

/**
 * AssessmentSubmission statuses that count as "completed and finalized."
 * "scored" = proficiency scores computed. "reviewed" = human review complete.
 */
const FINALIZED_STATUSES = new Set(["scored", "reviewed"]);

// ── Types ────────────────────────────────────────────────────────────────

export interface AssessmentEligibilityResult {
  eligible: boolean;
  error_code: string;
  error_message: string;
  assessment?: any;
  custom_assessment?: any;
  competency_results?: Array<{
    competency_id: string;
    proficiency_value: number;
  }>;
}

export interface MappingValidationResult {
  valid: boolean;
  error_code: string;
  error_message: string;
  requirement?: any;
  snapshot?: any;
}

// ── Assessment Eligibility ───────────────────────────────────────────────

/**
 * Validate that an AssessmentSubmission is eligible for Leadership Index
 * evidence integration:
 * - belongs to the same tenant
 * - is finalized (scored or reviewed)
 * - links to a CustomAssessment with Leadership Index competencies
 * - has a known leadership level
 * - contains competency-level results
 * - belongs to the candidacy's candidate (email match)
 */
export async function validateAssessmentEligibility(
  base44: any,
  client_id: string,
  assessment_submission_id: string,
  candidate_email: string
): Promise<AssessmentEligibilityResult> {
  // ── 1. Load AssessmentSubmission (same tenant) ──
  const submissions = await base44.asServiceRole.entities.AssessmentSubmission.filter({
    id: assessment_submission_id,
    client_id,
  });
  if (submissions.length === 0) {
    return {
      eligible: false,
      error_code: "assessment_not_found",
      error_message: "Assessment submission not found or cross-tenant",
    };
  }
  const assessment = submissions[0];

  // ── 2. Must belong to the candidacy's candidate ──
  if (assessment.user_email !== candidate_email) {
    return {
      eligible: false,
      error_code: "assessment_candidate_mismatch",
      error_message: "Assessment does not belong to the candidacy's candidate",
    };
  }

  // ── 3. Must be finalized ──
  if (!FINALIZED_STATUSES.has(assessment.status)) {
    return {
      eligible: false,
      error_code: "assessment_not_finalized",
      error_message: `Assessment status '${assessment.status}' is not finalized (scored or reviewed)`,
    };
  }

  // ── 4. Must have a known leadership level ──
  if (!assessment.leadership_level) {
    return {
      eligible: false,
      error_code: "assessment_missing_leadership_level",
      error_message: "Assessment is missing leadership level",
    };
  }

  // ── 5. Must link to a CustomAssessment with Leadership Index competencies ──
  if (!assessment.custom_assessment_id) {
    return {
      eligible: false,
      error_code: "assessment_missing_definition",
      error_message: "Assessment is missing custom_assessment_id (definition)",
    };
  }

  const customAssessments = await base44.asServiceRole.entities.CustomAssessment.filter({
    id: assessment.custom_assessment_id,
    client_id,
  });
  if (customAssessments.length === 0) {
    return {
      eligible: false,
      error_code: "custom_assessment_not_found",
      error_message: "Custom assessment definition not found or cross-tenant",
    };
  }
  const customAssessment = customAssessments[0];

  // Check if the CustomAssessment has Leadership Index competencies
  const competencyIds = customAssessment.competency_ids || [];
  if (competencyIds.length === 0) {
    return {
      eligible: false,
      error_code: "no_competency_mapping",
      error_message: "Custom assessment has no associated competencies",
    };
  }

  // Load competencies and check for Leadership Index keys
  const competencies = [];
  for (const cid of competencyIds) {
    try {
      const comps = await base44.asServiceRole.entities.Competency.filter({ id: cid });
      if (comps.length > 0) competencies.push(comps[0]);
    } catch { /* skip */ }
  }

  const hasLeadershipIndexCompetencies = competencies.some(
    (c: any) => c.field_key && LEADERSHIP_INDEX_COMPETENCY_KEYS.has(c.field_key)
  );
  if (!hasLeadershipIndexCompetencies) {
    return {
      eligible: false,
      error_code: "not_leadership_index_assessment",
      error_message: "Assessment does not contain Leadership Index competencies",
    };
  }

  // ── 6. Must contain competency-level results ──
  const userResponses = assessment.user_responses || [];
  const competencyResults = userResponses
    .filter((r: any) => r.competency_id && r.proficiency_value != null)
    .map((r: any) => ({
      competency_id: r.competency_id,
      proficiency_value: r.proficiency_value,
    }));

  if (competencyResults.length === 0) {
    return {
      eligible: false,
      error_code: "no_competency_results",
      error_message: "Assessment has no competency-level results",
    };
  }

  return {
    eligible: true,
    error_code: "",
    error_message: "",
    assessment,
    custom_assessment: customAssessment,
    competency_results: competencyResults,
  };
}

// ── Mapping Validation ──────────────────────────────────────────────────

/**
 * Validate that a mapping target requirement is eligible:
 * - belongs to the specified snapshot and tenant
 * - requirement_type is "competency"
 * - applicability_status is "applicable" (not not_applicable)
 * - integrity_status is "active"
 */
export async function validateMappingTarget(
  base44: any,
  client_id: string,
  effective_blueprint_snapshot_id: string,
  effective_requirement_snapshot_id: string
): Promise<MappingValidationResult> {
  // Load the requirement
  const requirements = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
    id: effective_requirement_snapshot_id,
    client_id,
    effective_blueprint_snapshot_id,
  });
  if (requirements.length === 0) {
    return {
      valid: false,
      error_code: "requirement_not_found",
      error_message: "Frozen requirement not found in this snapshot",
    };
  }
  const requirement = requirements[0];

  // Must be competency type
  if (requirement.requirement_type !== "competency") {
    return {
      valid: false,
      error_code: "requirement_not_competency",
      error_message: `Mapping target must be a competency requirement, got '${requirement.requirement_type}'`,
    };
  }

  // Must be applicable
  if (requirement.applicability_status === "not_applicable") {
    return {
      valid: false,
      error_code: "requirement_not_applicable",
      error_message: "Cannot map to a not-applicable requirement",
    };
  }

  // Must be integrity-active
  if (requirement.integrity_status !== "active") {
    return {
      valid: false,
      error_code: "requirement_not_active",
      error_message: "Frozen requirement is not integrity-active",
    };
  }

  return {
    valid: true,
    error_code: "",
    error_message: "",
    requirement,
  };
}

// ── Fingerprint Computation ─────────────────────────────────────────────

/**
 * Compute a deterministic tenant-scoped fingerprint for a suggested EvidenceRecord.
 * Based on: candidacy + assessment result + source competency + target requirement.
 * Repeated calls with the same inputs must produce the same fingerprint.
 */
export function computeEvidenceFingerprint(
  client_id: string,
  candidacy_id: string,
  assessment_submission_id: string,
  source_competency_id: string,
  effective_requirement_snapshot_id: string
): string {
  const parts = [
    client_id,
    candidacy_id,
    assessment_submission_id,
    source_competency_id,
    effective_requirement_snapshot_id,
  ];
  return parts.join("|");
}

/**
 * Compute a deterministic tenant-scoped fingerprint for a mapping uniqueness check.
 * Based on: client_id + assessment_definition_id + framework_version + leadership_level
 * + competency_id + effective_requirement_snapshot_id.
 */
export function computeMappingFingerprint(
  client_id: string,
  assessment_definition_id: string,
  assessment_framework_version: string,
  assessment_leadership_level: string,
  competency_id: string,
  effective_requirement_snapshot_id: string
): string {
  const parts = [
    client_id,
    assessment_definition_id,
    assessment_framework_version,
    assessment_leadership_level,
    competency_id,
    effective_requirement_snapshot_id,
  ];
  return parts.join("|");
}

// ── Proficiency Scale ────────────────────────────────────────────────────

/**
 * Map a proficiency_value (1-4) to its label.
 * 1 = Awareness, 2 = Developing, 3 = Proficient, 4 = Mastery
 */
export function proficiencyLabel(value: number): string {
  const labels: Record<number, string> = {
    1: "Awareness",
    2: "Developing",
    3: "Proficient",
    4: "Mastery",
  };
  return labels[value] || `Level ${value}`;
}

/**
 * Build a minimum-necessary source snapshot string for EvidenceRecord.description.
 * Contains: framework version, leadership level, competency ID/key, observed result,
 * scale, completion date. Does NOT contain raw responses, question text, narrative,
 * or demographic data.
 */
export function buildSourceSnapshotDescription(params: {
  framework_version: string;
  leadership_level: string;
  competency_id: string;
  competency_key: string;
  competency_name: string;
  proficiency_value: number;
  proficiency_label: string;
  completion_date: string;
  mapping_id: string;
  mapping_version: number;
  target_requirement_id: string;
  target_requirement_language: string;
}): string {
  return [
    `Leadership Index Assessment Evidence (Suggested)`,
    `Framework: ${params.framework_version}`,
    `Leadership Level: ${params.leadership_level}`,
    `Competency: ${params.competency_name} (${params.competency_key})`,
    `Observed Result: ${params.proficiency_label} (level ${params.proficiency_value} of 4)`,
    `Assessment Completion Date: ${params.completion_date}`,
    `Mapping: v${params.mapping_version}`,
    `Target Frozen Requirement: ${params.target_requirement_language}`,
    ``,
    `This is suggested evidence from a Leadership Index assessment. It does not determine readiness, rank candidates, or replace human review.`,
  ].join("\n");
}