import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation, quarantineOperation } from "../../shared/successionOperationHelper.ts";
import { quarantineRecord, validateUniqueness } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionCreateCycle
 * Creates a new SuccessionCycle. Function-only write; client_id derived server-side.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_key, name } = body;

  if (!operation_id || !cycle_key || !name) {
    return Response.json({ error: "operation_id, cycle_key, name required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateCycle",
    target_client_id: auth.client_id,
    required_permission: "succession.cycles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateCycle",
    payload: { cycle_key, name },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({
      operation_id, status: opResult.operation.status,
      integrity_status: opResult.operation.integrity_status,
      note: "duplicate operation attached",
    });
  }

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const cycle = await base44.asServiceRole.entities.SuccessionCycle.create({
      client_id: auth.client_id,
      cycle_key, name,
      status: "draft",
      process_stage: "frame",
      started_at: new Date().toISOString(),
      created_by_profile_id: auth.profile_id,
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Uniqueness validation
    const uniqueness = await validateUniqueness(base44, "SuccessionCycle", cycle.id, {
      client_id: auth.client_id, cycle_key,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "cycle_created",
      target_entity_type: "SuccessionCycle", target_entity_id: cycle.id,
      metadata: { cycle_key, name, is_unique: uniqueness.is_unique },
      operation_id, event_key: { action: "cycle_created", cycle_id: cycle.id },
      event_type: "domain_action_completed",
      target_record_id: cycle.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      cycle_id: cycle.id, integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });

    return Response.json({
      operation_id, cycle_id: cycle.id,
      integrity_status: uniqueness.is_unique ? "active" : "quarantined",
      duplicate_ids: uniqueness.duplicate_ids,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_cycle_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}