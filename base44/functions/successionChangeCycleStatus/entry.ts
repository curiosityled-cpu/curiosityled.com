import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionChangeCycleStatus
 * Changes the LIFECYCLE status of a SuccessionCycle: draft→active, active→paused, paused→active, active→closed, closed→archived.
 * This is SEPARATE from process_stage advancement. Does NOT advance the methodology stage.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, new_status, reason } = body;

  if (!operation_id || !cycle_id || !new_status) {
    return Response.json({ error: "operation_id, cycle_id, new_status required" }, { status: 400 });
  }

  const validTransitions: Record<string, string[]> = {
    draft: ["active", "archived"],
    active: ["paused", "closed"],
    paused: ["active", "closed"],
    closed: ["archived"],
    archived: [],
  };

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionChangeCycleStatus", target_client_id: auth.client_id, required_permission: "succession.cycles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionChangeCycleStatus", payload: { cycle_id, new_status, reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) { await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "cycle_not_found"); return Response.json({ error: "Cycle not found" }, { status: 404 }); }

    const allowed = validTransitions[cycle.status] || [];
    if (!allowed.includes(new_status)) {
      await failOperation(base44, opResult.operation.id, "invalid_status_transition");
      return Response.json({ error: `Invalid lifecycle transition: ${cycle.status} → ${new_status}` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updateData: any = { status: new_status };
    if (new_status === "active" && !cycle.started_at) updateData.started_at = now;
    if (new_status === "closed") updateData.closed_at = now;
    if (new_status === "archived") updateData.archived_at = now;

    await base44.asServiceRole.entities.SuccessionCycle.update(cycle_id, updateData);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "cycle_status_changed", target_entity_type: "SuccessionCycle", target_entity_id: cycle_id,
      metadata: { old_status: cycle.status, new_status, reason },
      operation_id, event_key: { action: "cycle_status_changed", cycle_id, new_status },
      event_type: "domain_action_completed", target_record_id: cycle_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { cycle_id, new_status });
    return Response.json({ operation_id, cycle_id, status: new_status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "change_cycle_status_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}