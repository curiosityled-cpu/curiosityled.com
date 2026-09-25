import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionWithdrawCandidacy
 * Withdraws an active SuccessorCandidacy. The candidacy record is retained
 * for audit; status is set to "withdrawn".
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, candidacy_id, withdrawal_reason } = body;

  if (!operation_id || !candidacy_id) {
    return Response.json({ error: "operation_id, candidacy_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionWithdrawCandidacy",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionWithdrawCandidacy",
    payload: { candidacy_id, withdrawal_reason },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: candidacy must belong to caller's tenant
    const candidacy = await validateSameTenantReference(base44, "SuccessorCandidacy", candidacy_id, auth.client_id);
    if (!candidacy) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessorCandidacy", candidacy_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "candidacy_not_found");
      return Response.json({ error: "Candidacy not found" }, { status: 404 });
    }

    if (candidacy.status === "withdrawn") {
      await failOperation(base44, opResult.operation.id, "already_withdrawn");
      return Response.json({ error: "Candidacy is already withdrawn" }, { status: 409 });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.SuccessorCandidacy.update(candidacy_id, {
      status: "withdrawn",
      withdrawn_by_profile_id: auth.profile_id,
      withdrawn_at: now,
      withdrawal_reason: withdrawal_reason || null,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "candidacy_withdrawn",
      target_entity_type: "SuccessorCandidacy", target_entity_id: candidacy_id,
      target_user_profile_id: candidacy.user_profile_id,
      metadata: { critical_role_id: candidacy.critical_role_id, withdrawal_reason: withdrawal_reason || null },
      operation_id, event_key: { action: "candidacy_withdrawn", candidacy_id },
      event_type: "domain_action_completed", target_record_id: candidacy_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      candidacy_id, status: "withdrawn",
    });

    return Response.json({ operation_id, candidacy_id, status: "withdrawn" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "withdraw_candidacy_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}