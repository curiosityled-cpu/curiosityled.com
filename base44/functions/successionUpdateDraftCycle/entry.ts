import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation, heartbeatOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionUpdateDraftCycle
 *
 * Updates a SuccessionCycle's status (stage transition). Requires operation_id.
 * Heartbeats the owning operation during execution.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, name, cycle_key } = body;

  if (!operation_id || !cycle_id) {
    return Response.json({ error: "operation_id, cycle_id required" }, { status: 400 });
  }
  if (!name && !cycle_key) {
    return Response.json({ error: "At least one of name or cycle_key required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionUpdateDraftCycle",
    target_client_id: auth.client_id,
    required_permission: "succession.cycles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionUpdateDraftCycle",
    payload: { cycle_id, name, cycle_key },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  }

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    await heartbeatOperation(base44, opResult.operation.id);

    // Only allow updating draft-cycle fields when status=draft
    const cycles = await base44.asServiceRole.entities.SuccessionCycle.filter({ id: cycle_id, client_id: auth.client_id });
    if (cycles.length === 0) { await failOperation(base44, opResult.operation.id, "cycle_not_found"); return Response.json({ error: "Cycle not found" }, { status: 404 }); }
    if (cycles[0].status !== "draft") { await failOperation(base44, opResult.operation.id, "cycle_not_draft"); return Response.json({ error: "Can only update draft-cycle fields when cycle status is 'draft'. Use successionChangeCycleStatus for lifecycle transitions." }, { status: 409 }); }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (cycle_key) updateData.cycle_key = cycle_key;

    await base44.asServiceRole.entities.SuccessionCycle.update(cycle_id, updateData);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "draft_cycle_updated",
      target_entity_type: "SuccessionCycle", target_entity_id: cycle_id,
      metadata: { updated_fields: Object.keys(updateData) },
      operation_id, event_key: { action: "draft_cycle_updated", cycle_id },
      event_type: "domain_action_completed", target_record_id: cycle_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      cycle_id, updated_fields: Object.keys(updateData),
    });

    return Response.json({ operation_id, cycle_id, updated_fields: Object.keys(updateData) });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "update_cycle_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}