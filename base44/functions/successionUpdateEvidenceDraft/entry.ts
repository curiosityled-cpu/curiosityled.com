import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionUpdateEvidenceDraft
 * Updates a draft EvidenceRecord. Only drafts (status=draft) may be edited.
 * The authenticated user must be the original submitter.
 * Submitted evidence is immutable — corrections use successionWithdrawOrSupersedeEvidence.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, evidence_id, evidence_type, source_system,
    source_record_id, source_date, title, description, expiration_date,
  } = body;

  if (!operation_id || !evidence_id) {
    return Response.json({ error: "operation_id, evidence_id required" }, { status: 400 });
  }

  const validTypes = ["performance_outcome","competency_behavior","critical_experience","stretch_assignment","coaching_milestone","development_completion","business_outcome","credential","manager_observation","manual_other"];
  if (evidence_type !== undefined && !validTypes.includes(evidence_type)) {
    return Response.json({ error: "Invalid evidence_type" }, { status: 400 });
  }
  const validSources = ["curiosity_led", "manual"];
  if (source_system !== undefined && !validSources.includes(source_system)) {
    return Response.json({ error: "Invalid source_system" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateEvidenceDraft",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateEvidenceDraft",
    payload: { evidence_id, evidence_type, source_system, source_record_id, source_date, title, description, expiration_date },
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

    // ── Only drafts can be edited ──
    if (evidence.status !== "draft") {
      await failOperation(base44, opResult.operation.id, "evidence_not_draft");
      return Response.json({ error: "Only draft evidence can be edited. Submitted evidence is immutable — create a corrected record instead." }, { status: 409 });
    }

    // ── Only the submitter may edit their draft ──
    if (evidence.submitted_by_profile_id !== auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
        metadata: {
          action: "successionUpdateEvidenceDraft",
          denied_reason: "not_submitter",
          actor_profile_id: auth.profile_id,
          submitter_profile_id: evidence.submitted_by_profile_id,
        },
        operation_id: opResult.operation.id,
      });
      await failOperation(base44, opResult.operation.id, "not_submitter");
      return Response.json({ error: "Only the original submitter may edit this draft." }, { status: 403 });
    }

    // ── Apply updates (only non-undefined fields) ──
    const updates: Record<string, any> = {};
    if (evidence_type !== undefined) updates.evidence_type = evidence_type;
    if (source_system !== undefined) updates.source_system = source_system;
    if (source_record_id !== undefined) updates.source_record_id = source_record_id || null;
    if (source_date !== undefined) updates.source_date = source_date;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (expiration_date !== undefined) updates.expiration_date = expiration_date || null;

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.EvidenceRecord.update(evidence_id, updates);
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "evidence_draft_updated",
      target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
      target_user_profile_id: evidence.user_profile_id,
      metadata: { updated_fields: Object.keys(updates) },
      operation_id, event_key: { action: "evidence_draft_updated", evidence_id },
      event_type: "domain_action_completed", target_record_id: evidence_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      evidence_id, status: "draft",
    });

    return Response.json({ operation_id, evidence_id, status: "draft" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_evidence_draft_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}