import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateEvidenceChain } from "../../shared/successionEvidenceValidator.ts";

/**
 * POST /successionWithdrawOrSupersedeEvidence
 *
 * Two modes:
 *   1. Withdraw: marks a submitted evidence record as withdrawn. The record
 *      is preserved for audit. Only the submitter may withdraw.
 *   2. Supersede: creates a new draft EvidenceRecord that supersedes the
 *      specified record. The original record is marked as superseded.
 *      The new draft is linked via supersedes_evidence_record_id.
 *
 * Both modes preserve history — no record is ever deleted or mutated in place
 * (except status transitions).
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, evidence_id, mode, withdrawal_reason,
    // Supersede mode: new draft fields
    evidence_type, source_system, source_record_id, source_date,
    title, description, expiration_date,
  } = body;

  if (!operation_id || !evidence_id || !mode) {
    return Response.json({ error: "operation_id, evidence_id, mode required" }, { status: 400 });
  }

  if (!["withdraw", "supersede"].includes(mode)) {
    return Response.json({ error: "mode must be 'withdraw' or 'supersede'" }, { status: 400 });
  }

  if (mode === "supersede") {
    if (!evidence_type || !source_system || !source_date || !title || !description) {
      return Response.json({ error: "supersede mode requires evidence_type, source_system, source_date, title, description" }, { status: 400 });
    }
    const validTypes = ["performance_outcome","competency_behavior","critical_experience","stretch_assignment","coaching_milestone","development_completion","business_outcome","credential","manager_observation","manual_other"];
    if (!validTypes.includes(evidence_type)) {
      return Response.json({ error: "Invalid evidence_type" }, { status: 400 });
    }
    const validSources = ["curiosity_led", "manual"];
    if (!validSources.includes(source_system)) {
      return Response.json({ error: "Invalid source_system" }, { status: 400 });
    }
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionWithdrawOrSupersedeEvidence",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionWithdrawOrSupersedeEvidence",
    payload: { evidence_id, mode, withdrawal_reason, evidence_type, source_system, source_record_id, source_date, title, description, expiration_date },
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

    // ── Only the submitter may withdraw or supersede ──
    if (evidence.submitted_by_profile_id !== auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
        metadata: {
          action: "successionWithdrawOrSupersedeEvidence",
          denied_reason: "not_submitter",
          actor_profile_id: auth.profile_id,
          submitter_profile_id: evidence.submitted_by_profile_id,
        },
        operation_id: opResult.operation.id,
      });
      await failOperation(base44, opResult.operation.id, "not_submitter");
      return Response.json({ error: "Only the original submitter may withdraw or supersede this evidence." }, { status: 403 });
    }

    // ── Cannot withdraw/supersede a draft (just edit or delete it) ──
    if (evidence.status === "draft") {
      await failOperation(base44, opResult.operation.id, "cannot_withdraw_draft");
      return Response.json({ error: "Draft evidence can be edited directly — no need to withdraw or supersede." }, { status: 409 });
    }

    // ── Cannot withdraw/supersede already-withdrawn or already-superseded ──
    if (["withdrawn", "superseded"].includes(evidence.status)) {
      await failOperation(base44, opResult.operation.id, "already_terminal_status");
      return Response.json({ error: `Evidence is already ${evidence.status}` }, { status: 409 });
    }

    if (mode === "withdraw") {
      // ── Withdraw mode: mark as withdrawn, preserve record ──
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.EvidenceRecord.update(evidence_id, {
        status: "withdrawn",
        withdrawn_at: now,
        withdrawn_by_profile_id: auth.profile_id,
        withdrawal_reason: withdrawal_reason || null,
      });

      const auditEvent = await writeSuccessionAuditEvent({
        base44, action_type: "evidence_withdrawn",
        target_entity_type: "EvidenceRecord", target_entity_id: evidence_id,
        target_user_profile_id: evidence.user_profile_id,
        metadata: { withdrawal_reason: withdrawal_reason || null },
        operation_id, event_key: { action: "evidence_withdrawn", evidence_id },
        event_type: "domain_action_completed", target_record_id: evidence_id, attempt_number: 1,
      });

      await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
        evidence_id, status: "withdrawn",
      });

      return Response.json({ operation_id, evidence_id, status: "withdrawn" });

    } else {
      // ── Supersede mode: create new draft, mark original as superseded ──
      // Re-validate the chain (candidacy still active, snapshot still valid, requirement still applicable)
      const validation = await validateEvidenceChain(
        base44, auth.client_id, evidence.candidacy_id,
        evidence.effective_blueprint_snapshot_id,
        evidence.effective_requirement_snapshot_id,
        opResult.operation.id
      );
      if (!validation.valid) {
        await failOperation(base44, opResult.operation.id, validation.error_code);
        return Response.json({ error: validation.error_message }, { status: 409 });
      }

      const newEvidence = await base44.asServiceRole.entities.EvidenceRecord.create({
        client_id: auth.client_id,
        candidacy_id: evidence.candidacy_id,
        user_profile_id: evidence.user_profile_id,
        critical_role_id: evidence.critical_role_id,
        effective_blueprint_snapshot_id: evidence.effective_blueprint_snapshot_id,
        effective_requirement_snapshot_id: evidence.effective_requirement_snapshot_id,
        evidence_type,
        source_system,
        source_record_id: source_record_id || null,
        source_date,
        title,
        description,
        submitted_by_profile_id: auth.profile_id,
        submitted_at: null,
        freshness_review_date: null,
        expiration_date: expiration_date || null,
        confidentiality_level: "confidential",
        integrity_status: "active",
        status: "draft",
        supersedes_evidence_record_id: evidence_id,
      });

      // Mark the original as superseded
      await base44.asServiceRole.entities.EvidenceRecord.update(evidence_id, {
        status: "superseded",
      });

      const auditEvent = await writeSuccessionAuditEvent({
        base44, action_type: "evidence_superseded",
        target_entity_type: "EvidenceRecord", target_entity_id: newEvidence.id,
        target_user_profile_id: evidence.user_profile_id,
        metadata: {
          superseded_evidence_id: evidence_id,
          new_evidence_id: newEvidence.id,
        },
        operation_id, event_key: { action: "evidence_superseded", new_evidence_id: newEvidence.id },
        event_type: "domain_action_completed", target_record_id: newEvidence.id, attempt_number: 1,
      });

      await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
        evidence_id: newEvidence.id, superseded_evidence_id: evidence_id, status: "draft",
      });

      return Response.json({
        operation_id,
        evidence_id: newEvidence.id,
        superseded_evidence_id: evidence_id,
        status: "draft",
      });
    }
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "withdraw_or_supersede_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}