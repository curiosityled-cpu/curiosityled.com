import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";
import { validateEvidenceChain } from "../../shared/successionEvidenceValidator.ts";
import {
  validateAssessmentEligibility,
  computeEvidenceFingerprint,
  proficiencyLabel,
  buildSourceSnapshotDescription,
  LEADERSHIP_INDEX_FRAMEWORK_VERSION,
} from "../../shared/successionLeadershipIndexValidator.ts";

/**
 * POST /successionCreateLeadershipIndexEvidenceDrafts
 *
 * Creates one EvidenceRecord per selected competency mapping from a finalized
 * Leadership Index assessment. Evidence is created in "draft" status — not
 * decision-eligible, not accepted, requiring normal evidence review.
 *
 * Idempotent: repeated calls with the same operation_id or fingerprint do not
 * duplicate evidence.
 */

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, candidacy_id, assessment_id, selected_mapping_ids } = body;

  if (!operation_id || !candidacy_id || !assessment_id || !selected_mapping_ids || !Array.isArray(selected_mapping_ids)) {
    return Response.json({ error: "operation_id, candidacy_id, assessment_id, selected_mapping_ids (array) required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateLeadershipIndexEvidenceDrafts",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateLeadershipIndexEvidenceDrafts",
    payload: { candidacy_id, assessment_id, selected_mapping_ids },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;

    // ── 1. Load candidacy (same tenant) ──
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", candidacy_id, cid);
    if (!candidacy) { await failOperation(base44, opResult.operation.id, "candidacy_not_found"); return Response.json({ error: "Candidacy not found" }, { status: 404 }); }
    if (candidacy.status !== "active") { await failOperation(base44, opResult.operation.id, "candidacy_not_active"); return Response.json({ error: "Candidacy is not active" }, { status: 400 }); }

    // ── 2. Load candidate UserProfile ──
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: candidacy.user_profile_id, tenant_id: cid });
    if (profiles.length === 0) { await failOperation(base44, opResult.operation.id, "profile_not_found"); return Response.json({ error: "Candidate profile not found" }, { status: 404 }); }
    const candidateEmail = profiles[0].email;

    // ── 3. Re-validate assessment eligibility (server-side) ──
    const eligibility = await validateAssessmentEligibility(base44, cid, assessment_id, candidateEmail);
    if (!eligibility.eligible) {
      await failOperation(base44, opResult.operation.id, eligibility.error_code);
      return Response.json({ error: eligibility.error_message }, { status: 400 });
    }
    const assessment = eligibility.assessment;
    const frameworkVersion = LEADERSHIP_INDEX_FRAMEWORK_VERSION;
    const leadershipLevel = assessment.leadership_level;

    // ── 4. Load selected mappings and validate each ──
    const createdEvidence = [];
    const skipped = [];

    for (const mappingId of selected_mapping_ids) {
      // Load the mapping
      const mappings = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({
        id: mappingId,
        client_id: cid,
      });
      if (mappings.length === 0) {
        skipped.push({ mapping_id: mappingId, reason: "mapping_not_found" });
        continue;
      }
      const mapping = mappings[0];

      // Must be approved and current
      if (mapping.status !== "approved" || !mapping.is_current) {
        skipped.push({ mapping_id: mappingId, reason: "mapping_not_approved_or_not_current" });
        continue;
      }

      // Must match the assessment's framework version and leadership level
      if (mapping.assessment_framework_version !== frameworkVersion || mapping.assessment_leadership_level !== leadershipLevel) {
        skipped.push({ mapping_id: mappingId, reason: "framework_or_level_mismatch" });
        continue;
      }

      // Must target the candidacy's snapshot
      if (mapping.effective_blueprint_snapshot_id !== candidacy.effective_blueprint_snapshot_id) {
        skipped.push({ mapping_id: mappingId, reason: "snapshot_mismatch" });
        continue;
      }

      // Find the competency result for this mapping's competency
      const competencyResult = (eligibility.competency_results || []).find(
        (r: any) => r.competency_id === mapping.competency_id
      );
      if (!competencyResult) {
        skipped.push({ mapping_id: mappingId, reason: "no_competency_result" });
        continue;
      }

      // Validate the evidence chain (candidacy → snapshot → requirement)
      const chainValidation = await validateEvidenceChain(
        base44, cid, candidacy_id,
        candidacy.effective_blueprint_snapshot_id,
        mapping.effective_requirement_snapshot_id,
      );
      if (!chainValidation.valid) {
        skipped.push({ mapping_id: mappingId, reason: chainValidation.error_code });
        continue;
      }

      // ── 5. Check for existing evidence with the same fingerprint (idempotency) ──
      const fingerprint = computeEvidenceFingerprint(
        cid, candidacy_id, assessment_id, mapping.competency_id, mapping.effective_requirement_snapshot_id
      );

      const existing = await base44.asServiceRole.entities.EvidenceRecord.filter({
        client_id: cid,
        candidacy_id,
        source_record_id: assessment_id,
        effective_requirement_snapshot_id: mapping.effective_requirement_snapshot_id,
      }, "-created_date", 10);

      // Check if any existing evidence has the same source competency
      const duplicate = existing.find((e: any) =>
        e.description && e.description.includes(`Competency: ${mapping.competency_key}`)
      );

      if (duplicate) {
        skipped.push({ mapping_id: mappingId, reason: "duplicate_evidence_exists", evidence_id: duplicate.id });
        continue;
      }

      // ── 6. Load competency name ──
      const comps = await base44.asServiceRole.entities.Competency.filter({ id: mapping.competency_id });
      const competencyName = comps.length > 0 ? comps[0].name : mapping.competency_key;

      // ── 7. Load target requirement ──
      const reqs = await base44.asServiceRole.entities.EffectiveRequirementSnapshot.filter({
        id: mapping.effective_requirement_snapshot_id,
        client_id: cid,
      });
      const targetReq = reqs.length > 0 ? reqs[0] : null;

      // ── 8. Create the EvidenceRecord ──
      const profLabel = proficiencyLabel(competencyResult.proficiency_value);
      const description = buildSourceSnapshotDescription({
        framework_version: frameworkVersion,
        leadership_level: leadershipLevel,
        competency_id: mapping.competency_id,
        competency_key: mapping.competency_key,
        competency_name: competencyName,
        proficiency_value: competencyResult.proficiency_value,
        proficiency_label: profLabel,
        completion_date: assessment.submission_date?.split("T")[0] || "",
        mapping_id: mapping.id,
        mapping_version: mapping.version_number,
        target_requirement_id: mapping.effective_requirement_snapshot_id,
        target_requirement_language: targetReq?.effective_language || "",
      });

      const evidence = await base44.asServiceRole.entities.EvidenceRecord.create({
        client_id: cid,
        candidacy_id,
        user_profile_id: candidacy.user_profile_id,
        critical_role_id: candidacy.critical_role_id,
        effective_blueprint_snapshot_id: candidacy.effective_blueprint_snapshot_id,
        effective_requirement_snapshot_id: mapping.effective_requirement_snapshot_id,
        evidence_type: "competency_behavior",
        source_system: "curiosity_led",
        source_record_id: assessment_id,
        source_date: assessment.submission_date?.split("T")[0] || new Date().toISOString().split("T")[0],
        title: `Leadership Index: ${competencyName} — ${profLabel}`,
        description,
        submitted_by_profile_id: auth.profile_id,
        submitted_at: null,
        freshness_review_date: null,
        expiration_date: null,
        confidentiality_level: "confidential",
        integrity_status: "active",
        status: "draft",
      });

      createdEvidence.push({
        evidence_id: evidence.id,
        mapping_id: mappingId,
        competency_id: mapping.competency_id,
        competency_name: competencyName,
        status: "draft",
      });

      // Audit (no raw assessment content)
      await writeSuccessionAuditEvent({
        base44,
        action_type: "leadership_index_evidence_draft_created",
        target_entity_type: "EvidenceRecord",
        target_entity_id: evidence.id,
        target_user_profile_id: candidacy.user_profile_id,
        metadata: {
          candidacy_id,
          assessment_id,
          mapping_id: mappingId,
          mapping_version: mapping.version_number,
          competency_id: mapping.competency_id,
          competency_key: mapping.competency_key,
          framework_version: frameworkVersion,
          leadership_level: leadershipLevel,
        },
        operation_id,
        event_key: { action: "li_evidence_created", evidence_id: evidence.id },
        event_type: "domain_action_completed",
        target_record_id: evidence.id,
        attempt_number: 1,
      });
    }

    await completeOperation(base44, opResult.operation.id, null, {
      created: createdEvidence.length,
      skipped: skipped.length,
    });

    return Response.json({
      operation_id,
      created: createdEvidence,
      skipped,
      created_count: createdEvidence.length,
      skipped_count: skipped.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_li_evidence_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}