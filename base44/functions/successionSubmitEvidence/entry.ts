import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateOperationalSnapshot } from "../../shared/successionSnapshotValidator.ts";

/**
 * POST /successionSubmitEvidence
 * Transitions a draft EvidenceRecord to submitted status, making its content
 * immutable. Sets submitted_at and freshness_review_date.
 *
 * The authenticated user must be the original submitter.
 * The candidacy and snapshot must still be valid and active at submission time.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, evidence_id } = body;

  if (!operation_id || !evidence_id) {
    return Response.json({ error: "operation_id, evidence_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSubmitEvidence",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSubmitEvidence",
    payload: { evidence_id },
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

    if (evidence.status !== "draft") {
      await failOperation(base44, opResult.operation.id, "evidence_not_draft");
      return Response.json({ error: "Only draft evidence can be submitted" }, { status: 409 });
    }

    if (evidence.submitted_by_profile_id !== auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
        metadata: { action: "successionSubmitEvidence", denied_reason: "not_submitter" },
        operation_id: opResult.operation.id,
      });
      await failOperation(base44, opResult.operation.id, "not_submitter");
      return Response.json({ error: "Only the original submitter may submit this evidence." }, { status: 403 });
    }

    // ── We need the candidacy to get cycle_id — load it ──
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", evidence.candidacy_id, auth.client_id);
    if (!candidacy || candidacy.status !== "active") {
      await failOperation(base44, opResult.operation.id, "candidacy_not_active");
      return Response.json({ error: "Candidacy is no longer active" }, { status: 409 });
    }

    const snapshotCheck = await validateOperationalSnapshot(
      base44, auth.client_id, evidence.effective_blueprint_snapshot_id,
      evidence.critical_role_id, candidacy.cycle_id
    );
    if (!snapshotCheck.valid) {
      await failOperation(base44, opResult.operation.id, snapshotCheck.error_code);
      return Response.json({ error: `Snapshot validation failed: ${snapshotCheck.error_message}` }, { status: 409 });
    }

    const now = new Date();
    const freshness = new Date(now);
    freshness.setMonth(freshness.getMonth() + 6); // Default 6-month freshness review

    await base44.asServiceRole.entities.EvidenceRecord.update(evidence_id, {
      status: "submitted",
      submitted_at: now.toISOString(),
      freshness_review_date: freshness.toISOString().split("T")[0],
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "evidence_submitted",
      target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
      target_user_profile_id: evidence.user_profile_id,
      metadata: {
        candidacy_id: evidence.candidacy_id,
        effective_requirement_snapshot_id: evidence.effective_requirement_snapshot_id,
        evidence_type: evidence.evidence_type,
      },
      operation_id, event_key: { action: "evidence_submitted", evidence_id },
      event_type: "domain_action_completed", target_record_id: evidence_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      evidence_id, status: "submitted",
    });

    return Response.json({ operation_id, evidence_id, status: "submitted" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "submit_evidence_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}