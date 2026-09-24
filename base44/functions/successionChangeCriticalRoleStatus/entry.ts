import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionChangeCriticalRoleStatus
 * Changes the status of a CriticalRole designation: designated → active, active → paused, paused → active, any → removed.
 * Transitions: designated→active, active→paused, paused→active, any→removed. Removed is terminal.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, critical_role_id, new_status, reason } = body;

  if (!operation_id || !critical_role_id || !new_status) {
    return Response.json({ error: "operation_id, critical_role_id, new_status required" }, { status: 400 });
  }

  const validTransitions: Record<string, string[]> = {
    designated: ["active", "removed"],
    active: ["paused", "removed"],
    paused: ["active", "removed"],
    removed: [],
  };

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionChangeCriticalRoleStatus", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionChangeCriticalRoleStatus", payload: { critical_role_id, new_status, reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const role = await validateSameTenantReference(base44, "CriticalRole", critical_role_id, auth.client_id);
    if (!role) { await writeDeniedReferenceEvent(base44, auth, "CriticalRole", critical_role_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "critical_role_not_found"); return Response.json({ error: "Critical role not found" }, { status: 404 }); }

    const allowed = validTransitions[role.status] || [];
    if (!allowed.includes(new_status)) {
      await failOperation(base44, opResult.operation.id, "invalid_status_transition");
      return Response.json({ error: `Invalid status transition: ${role.status} → ${new_status}` }, { status: 409 });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.CriticalRole.update(critical_role_id, {
      status: new_status,
      status_changed_at: now,
      status_changed_by_profile_id: auth.profile_id,
      status_change_reason: reason || null,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "critical_role_status_changed", target_entity_type: "CriticalRole", target_entity_id: critical_role_id,
      metadata: { old_status: role.status, new_status, reason },
      operation_id, event_key: { action: "critical_role_status_changed", critical_role_id, new_status },
      event_type: "domain_action_completed", target_record_id: critical_role_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { critical_role_id, new_status });
    return Response.json({ operation_id, critical_role_id, status: new_status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "change_critical_role_status_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}