import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateStatusTransition } from "../../shared/successionTransitionValidator.ts";

/**
 * POST /successionChangeTransitionStatus
 *
 * Changes the status of a TransitionInitiation. Enforces allowed transition
 * paths. Cancellation from approved/in_progress requires reason. Does NOT
 * promote, change PositionAssignment, update UserProfile, or close candidacy.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, initiation_id, new_status, cancellation_reason } = body;

  if (!operation_id || !initiation_id || !new_status) {
    return Response.json({ error: "operation_id, initiation_id, new_status required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionChangeTransitionStatus",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionChangeTransitionStatus",
    payload: { initiation_id, new_status },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the initiation ──
    const initiation = await validateSameTenantReference(
      base44, "TransitionInitiation", initiation_id, auth.client_id
    );
    if (!initiation) {
      await writeDeniedReferenceEvent(base44, auth, "TransitionInitiation", initiation_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "initiation_not_found");
      return Response.json({ error: "Transition initiation not found" }, { status: 404 });
    }

    // ── Validate status transition ──
    const transitionCheck = validateStatusTransition(initiation.status, new_status, cancellation_reason);
    if (!transitionCheck.valid) {
      await failOperation(base44, opResult.operation.id, transitionCheck.error_code);
      return Response.json({ error: transitionCheck.error_message }, { status: 400 });
    }

    const updates: any = { status: new_status };
    if (new_status === "cancelled") {
      updates.cancellation_reason = cancellation_reason || null;
    }

    // ── Separation of Duties: initiator cannot approve their own transition ──
    if (new_status === "approved") {
      if (initiation.initiated_by_profile_id === auth.profile_id) {
        await failOperation(base44, opResult.operation.id, "self_approval_denied");
        await writeSuccessionAuditEvent({
          base44, action_type: "denied_action",
          target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
          metadata: { denied_reason: "self_approval_denied", initiation_id, new_status },
          operation_id,
        });
        return Response.json({ error: "Transition initiator cannot approve their own transition (separation of duties)" }, { status: 403 });
      }
      updates.approved_by_profile_id = auth.profile_id;
      updates.approved_at = new Date().toISOString();
    }

    await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, updates);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "transition_status_changed",
      target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
      metadata: { initiation_id, previous_status: initiation.status, new_status, cancellation_reason },
      operation_id, event_key: { action: "transition_status_changed", initiation_id, new_status },
      event_type: "domain_action_completed", target_record_id: initiation_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      initiation_id, status: new_status,
    });

    return Response.json({ operation_id, initiation_id, status: new_status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "change_transition_status_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}