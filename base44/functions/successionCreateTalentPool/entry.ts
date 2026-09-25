import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateUniqueness } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionCreateTalentPool
 * Creates a new manual TalentPool within a succession cycle.
 * Function-only write; client_id derived server-side.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, name, description } = body;

  if (!operation_id || !cycle_id || !name) {
    return Response.json({ error: "operation_id, cycle_id, name required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateTalentPool",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateTalentPool",
    payload: { cycle_id, name, description },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: cycle must belong to caller's tenant
    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "cycle_not_found");
      return Response.json({ error: "Cycle not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const pool = await base44.asServiceRole.entities.TalentPool.create({
      client_id: auth.client_id,
      cycle_id,
      name,
      description: description || null,
      status: "active",
      created_by_profile_id: auth.profile_id,
      created_at: now,
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Uniqueness validation: one active pool per client_id + cycle_id + name
    const uniqueness = await validateUniqueness(base44, "TalentPool", pool.id, {
      client_id: auth.client_id, cycle_id, name, status: "active", integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "talent_pool_created",
      target_entity_type: "TalentPool", target_entity_id: pool.id,
      metadata: { cycle_id, name, is_unique: uniqueness.is_unique },
      operation_id, event_key: { action: "talent_pool_created", pool_id: pool.id },
      event_type: "domain_action_completed", target_record_id: pool.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      pool_id: pool.id, integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });

    return Response.json({
      operation_id, pool_id: pool.id,
      integrity_status: uniqueness.is_unique ? "active" : "quarantined",
      duplicate_ids: uniqueness.duplicate_ids,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_talent_pool_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}