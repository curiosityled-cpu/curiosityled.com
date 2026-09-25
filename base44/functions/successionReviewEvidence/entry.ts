import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateOperationalSnapshot } from "../../shared/successionSnapshotValidator.ts";

/**
 * POST /successionReviewEvidence
 * Creates an append-only EvidenceReviewDecision for a submitted EvidenceRecord.
 *
 * Separation of Duties: the reviewer must NOT be the same person who submitted
 * the evidence. The backend derives reviewer_profile_id from the authenticated
 * user — never from the request body.
 *
 * Review decisions do NOT:
 *   - change readiness
 *   - change candidacy status automatically
 *   - rank candidates
 *   - create recommendations
 *   - update employee profiles
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, evidence_id, decision, evidence_strength,
    confidence, relevance, limitations, contrary_evidence_indicator,
    contrary_evidence_notes,
  } = body;

  if (!operation_id || !evidence_id || !decision || !evidence_strength || !confidence || !relevance) {
    return Response.json({ error: "operation_id, evidence_id, decision, evidence_strength, confidence, relevance required" }, { status: 400 });
  }

  const validDecisions = ["accepted", "accepted_with_limitations", "rejected", "returned_for_clarification"];
  if (!validDecisions.includes(decision)) {
    return Response.json({ error: "Invalid decision" }, { status: 400 });
  }
  const validStrengths = ["direct", "transferable", "indicative", "developmental", "not_relevant"];
  if (!validStrengths.includes(evidence_strength)) {
    return Response.json({ error: "Invalid evidence_strength" }, { status: 400 });
  }
  const validConfidence = ["low", "medium", "high"];
  if (!validConfidence.includes(confidence)) {
    return Response.json({ error: "Invalid confidence" }, { status: 400 });
  }
  const validRelevance = ["low", "medium", "high"];
  if (!validRelevance.includes(relevance)) {
    return Response.json({ error: "Invalid relevance" }, { status: 400 });
  }

  // accepted_with_limitations requires limitations text
  if (decision === "accepted_with_limitations" && (!limitations || !limitations.trim())) {
    return Response.json({ error: "limitations text is required when decision is accepted_with_limitations" }, { status: 400 });
  }
  // contrary_evidence_notes required when contrary_evidence_indicator is true
  if (contrary_evidence_indicator && (!contrary_evidence_notes || !contrary_evidence_notes.trim())) {
    return Response.json({ error: "contrary_evidence_notes is required when contrary_evidence_indicator is true" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionReviewEvidence",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionReviewEvidence",
    payload: { evidence_id, decision, evidence_strength, confidence, relevance, limitations, contrary_evidence_indicator, contrary_evidence_notes },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const evidence = await validateSameTenantReference(base44, "EvidenceRecord", evidence_id, auth.client_id);
    if (!evidence) {
      await writeDeniedReferenceEvent(base44, auth, "EvidenceRecord", evidence_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "evidence_not_found");
      return Response.json({ error: "Evidence not found" }, { status: 404 });
    }

    // ── Evidence must be submitted or under_review ──
    if (!["submitted", "under_review"].includes(evidence.status)) {
      await failOperation(base44, opResult.operation.id, "evidence_not_reviewable");
      return Response.json({ error: "Evidence must be submitted or under review to review it" }, { status: 409 });
    }

    // ── Separation of Duties: reviewer must not be the submitter ──
    if (evidence.submitted_by_profile_id === auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
        metadata: {
          action: "successionReviewEvidence",
          denied_reason: "submitter_cannot_review_own_evidence",
          actor_profile_id: auth.profile_id,
          submitter_profile_id: evidence.submitted_by_profile_id,
        },
        operation_id: opResult.operation.id,
      });
      await failOperation(base44, opResult.operation.id, "sod_violation");
      return Response.json({ error: "Separation of duties: you cannot review evidence you submitted." }, { status: 403 });
    }

    // ── Validate snapshot still has no blocking incidents ──
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", evidence.candidacy_id, auth.client_id);
    if (!candidacy) {
      await failOperation(base44, opResult.operation.id, "candidacy_not_found");
      return Response.json({ error: "Candidacy not found" }, { status: 404 });
    }

    const snapshotCheck = await validateOperationalSnapshot(
      base44, auth.client_id, evidence.effective_blueprint_snapshot_id,
      evidence.critical_role_id, candidacy.cycle_id
    );
    if (!snapshotCheck.valid) {
      await failOperation(base44, opResult.operation.id, snapshotCheck.error_code);
      return Response.json({ error: `Snapshot validation failed: ${snapshotCheck.error_message}` }, { status: 409 });
    }

    // ── Create the append-only review decision ──
    const now = new Date().toISOString();
    const review = await base44.asServiceRole.entities.EvidenceReviewDecision.create({
      client_id: auth.client_id,
      evidence_record_id: evidence_id,
      candidacy_id: evidence.candidacy_id,
      effective_requirement_snapshot_id: evidence.effective_requirement_snapshot_id,
      reviewer_profile_id: auth.profile_id,
      decision,
      evidence_strength,
      confidence,
      relevance,
      limitations: limitations || null,
      contrary_evidence_indicator: !!contrary_evidence_indicator,
      contrary_evidence_notes: contrary_evidence_notes || null,
      reviewed_at: now,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    // ── Update evidence status to reflect the review (but do NOT change candidacy status) ──
    let newEvidenceStatus = evidence.status;
    if (decision === "accepted") newEvidenceStatus = "accepted";
    else if (decision === "accepted_with_limitations") newEvidenceStatus = "accepted_with_limitations";
    else if (decision === "rejected") newEvidenceStatus = "rejected";
    else if (decision === "returned_for_clarification") newEvidenceStatus = "under_review";

    await base44.asServiceRole.entities.EvidenceRecord.update(evidence_id, {
      status: newEvidenceStatus,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "evidence_reviewed",
      target_entity_type: "EvidenceReviewDecision", target_entity_id: review.id,
      target_user_profile_id: evidence.user_profile_id,
      metadata: {
        evidence_id, decision, evidence_strength, confidence, relevance,
        contrary_evidence_indicator: !!contrary_evidence_indicator,
        new_evidence_status: newEvidenceStatus,
      },
      operation_id, event_key: { action: "evidence_reviewed", review_id: review.id },
      event_type: "domain_action_completed", target_record_id: review.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      review_id: review.id, evidence_id, evidence_status: newEvidenceStatus,
    });

    return Response.json({
      operation_id, review_id: review.id,
      evidence_id, evidence_status: newEvidenceStatus,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "review_evidence_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}