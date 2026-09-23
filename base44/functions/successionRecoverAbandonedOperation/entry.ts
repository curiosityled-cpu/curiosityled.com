import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation, isLeaseExpired } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionRecoverAbandonedOperation
 *
 * State-changing recovery function. Re-acquires an expired lease.
 * Before re-executing, checks whether the domain action already completed.
 * If complete → writes/repairs the audit obligation before returning success.
 * If not complete → re-executes (the calling domain function handles re-execution).
 *
 * Categorized as state-changing — receives the same authorization and audit controls
 * as domain mutations.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, recovery_action } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionRecoverAbandonedOperation",
    target_client_id: auth.client_id,
    required_permission: "succession.governance.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id: operation_id + ":recovery",
    function_name: "successionRecoverAbandonedOperation",
    payload: { original_operation_id: operation_id, recovery_action },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({ operation_id, status: opResult.operation.status, note: "recovery already in progress" });
  }

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Find the abandoned operation
    const abandonedOps = await base44.asServiceRole.entities.SuccessionOperation.filter({
      id: operation_id,
    });
    if (abandonedOps.length === 0) {
      await failOperation(base44, opResult.operation.id, "operation_not_found");
      return Response.json({ error: "Operation not found" }, { status: 404 });
    }
    const abandoned = abandonedOps[0];

    if (!isLeaseExpired(abandoned)) {
      await failOperation(base44, opResult.operation.id, "lease_not_expired");
      return Response.json({ error: "Lease has not expired — cannot recover" }, { status: 409 });
    }

    // Check if domain action already completed
    if (abandoned.status === "completed") {
      // Domain action complete — repair audit obligation if missing
      if (!abandoned.audit_event_id) {
        const repairEvent = await writeSuccessionAuditEvent({
          base44, action_type: "abandoned_operation_audit_repaired",
          target_entity_type: "SuccessionOperation", target_entity_id: operation_id,
          metadata: { original_operation_id: operation_id, recovery: true },
          operation_id: opResult.operation.id,
          event_key: { action: "audit_repaired", original_operation_id: operation_id },
          event_type: "audit_obligation_repaired",
          target_record_id: operation_id, attempt_number: 1,
        });
        await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
          audit_event_id: repairEvent?.id || null,
        });
      }

      await completeOperation(base44, opResult.operation.id, null, {
        original_operation_id: operation_id, recovery_result: "already_complete_audit_repaired",
      });

      return Response.json({
        operation_id, recovery_result: "already_complete",
        audit_obligation_repaired: !abandoned.audit_event_id,
      });
    }

    // Domain action not complete — mark for re-execution
    await base44.asServiceRole.entities.SuccessionOperation.update(operation_id, {
      status: "pending",
      lease_token: crypto.randomUUID(),
      lease_expires_at: new Date(Date.now() + 120000).toISOString(),
      last_heartbeat_at: new Date().toISOString(),
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "abandoned_operation_recovered",
      target_entity_type: "SuccessionOperation", target_entity_id: operation_id,
      metadata: { recovery_action },
      operation_id: opResult.operation.id,
      event_key: { action: "operation_recovered", original_operation_id: operation_id },
      event_type: "domain_action_completed", target_record_id: operation_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      original_operation_id: operation_id, recovery_result: "marked_for_reexecution",
    });

    return Response.json({
      operation_id, recovery_result: "marked_for_reexecution",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "recovery_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}