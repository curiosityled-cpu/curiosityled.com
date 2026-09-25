import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";
import { validateEvidenceChain } from "../../shared/successionEvidenceValidator.ts";
import {
  validateAssessmentEligibility,
  LEADERSHIP_INDEX_FRAMEWORK_VERSION,
  proficiencyLabel,
} from "../../shared/successionLeadershipIndexValidator.ts";

/**
 * POST /successionPreviewLeadershipIndexEvidence
 *
 * Previews which competency results from a finalized Leadership Index assessment
 * could become suggested evidence for the candidacy's frozen competency requirements.
 * Uses current approved mappings only. Makes NO writes.
 *
 * Returns matched, unmapped, and rejected competency-result counts with bounded
 * reason codes. Does NOT calculate gaps, readiness deltas, fit percentages, or rankings.
 */

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { candidacy_id, assessment_id } = body;

  if (!candidacy_id || !assessment_id) {
    return Response.json({ error: "candidacy_id and assessment_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionPreviewLeadershipIndexEvidence",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const cid = auth.client_id;

    // ── 1. Load candidacy (same tenant) ──
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", candidacy_id, cid);
    if (!candidacy) return Response.json({ error: "Candidacy not found" }, { status: 404 });
    if (candidacy.status !== "active") return Response.json({ error: "Candidacy is not active" }, { status: 400 });

    // ── 2. Load candidate UserProfile ──
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      id: candidacy.user_profile_id,
      tenant_id: cid,
    });
    if (profiles.length === 0) return Response.json({ error: "Candidate profile not found" }, { status: 404 });
    const candidateEmail = profiles[0].email;

    // ── 3. Validate assessment eligibility ──
    const eligibility = await validateAssessmentEligibility(base44, cid, assessment_id, candidateEmail);
    if (!eligibility.eligible) {
      return Response.json({
        error: eligibility.error_code,
        error_message: eligibility.error_message,
      }, { status: 400 });
    }

    const assessment = eligibility.assessment;
    const frameworkVersion = LEADERSHIP_INDEX_FRAMEWORK_VERSION;
    const leadershipLevel = assessment.leadership_level;

    // ── 4. Validate the evidence chain (candidacy → snapshot) ──
    const chainValidation = await validateEvidenceChain(
      base44, cid, candidacy_id,
      candidacy.effective_blueprint_snapshot_id,
      // Use a dummy requirement ID — we just need the snapshot validation
      candidacy.effective_blueprint_snapshot_id, // placeholder
    );
    // We only need the snapshot validation part, not the requirement child
    // So we load the snapshot directly
    const snapshots = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.filter({
      id: candidacy.effective_blueprint_snapshot_id,
      client_id: cid,
    });
    if (snapshots.length === 0) return Response.json({ error: "Snapshot not found" }, { status: 404 });
    const snapshot = snapshots[0];

    // ── 5. Load applicable competency requirements from the snapshot ──
    const requirements = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
      effective_blueprint_snapshot_id: snapshot.id,
      client_id: cid,
      requirement_type: "competency",
      applicability_status: "applicable",
      integrity_status: "active",
    });

    // ── 6. Load current approved mappings for this assessment + snapshot ──
    const mappings = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({
      client_id: cid,
      assessment_definition_id: assessment.custom_assessment_id,
      assessment_framework_version: frameworkVersion,
      assessment_leadership_level: leadershipLevel,
      effective_blueprint_snapshot_id: snapshot.id,
      status: "approved",
      is_current: true,
      integrity_status: "active",
    });

    // ── 7. Build preview rows ──
    const matched = [];
    const unmapped = [];
    const rejected = [];

    const competencyResults = eligibility.competency_results || [];

    for (const result of competencyResults) {
      // Load the competency
      const comps = await base44.asServiceRole.entities.Competency.filter({ id: result.competency_id });
      if (comps.length === 0) {
        rejected.push({
          competency_id: result.competency_id,
          reason_code: "competency_not_found",
          reason: "Source competency not found",
        });
        continue;
      }
      const competency = comps[0];

      // Find a matching approved mapping
      const mapping = mappings.find((m: any) => m.competency_id === result.competency_id);

      if (!mapping) {
        unmapped.push({
          competency_id: result.competency_id,
          competency_name: competency.name,
          competency_key: competency.field_key,
          observed_result: `${proficiencyLabel(result.proficiency_value)} (level ${result.proficiency_value} of 4)`,
          source_scale: "1-4 (Awareness, Developing, Proficient, Mastery)",
          assessment_date: assessment.submission_date?.split("T")[0] || null,
          framework_version: frameworkVersion,
          leadership_level: leadershipLevel,
          reason_code: "no_approved_mapping",
          reason: "No current approved mapping exists for this competency and leadership level",
        });
        continue;
      }

      // Find the target requirement
      const targetReq = requirements.find((r: any) => r.id === mapping.effective_requirement_snapshot_id);
      if (!targetReq) {
        rejected.push({
          competency_id: result.competency_id,
          competency_name: competency.name,
          reason_code: "target_requirement_not_found",
          reason: "Target frozen requirement not found or not applicable",
        });
        continue;
      }

      matched.push({
        competency_id: result.competency_id,
        competency_name: competency.name,
        competency_key: competency.field_key,
        observed_result: `${proficiencyLabel(result.proficiency_value)} (level ${result.proficiency_value} of 4)`,
        source_scale: "1-4 (Awareness, Developing, Proficient, Mastery)",
        assessment_date: assessment.submission_date?.split("T")[0] || null,
        framework_version: frameworkVersion,
        leadership_level: leadershipLevel,
        target_frozen_requirement_id: targetReq.id,
        target_frozen_requirement_language: targetReq.effective_language,
        mapping_id: mapping.id,
        mapping_version: mapping.version_number,
        proposed_evidence_status: "suggested",
      });
    }

    return Response.json({
      candidacy_id,
      assessment_id,
      framework_version: frameworkVersion,
      leadership_level: leadershipLevel,
      snapshot_id: snapshot.id,
      counts: {
        matched: matched.length,
        unmapped: unmapped.length,
        rejected: rejected.length,
        total_competency_results: competencyResults.length,
      },
      matched,
      unmapped,
      rejected,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}