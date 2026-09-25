import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionArchiveTalentPool
 * Archives an active TalentPool. Archived pools retain their members for history
 * but no new members may be added.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, pool_id } = body;

  if (!operation_id || !pool_id) {
    return Response.json({ error: "operation_id, pool_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionArchiveTalentPool",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionArchiveTalentPool",
    payload: { pool_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: pool must belong to caller's tenant
    const pool = await validateSameTenantReference(base44, "TalentPool", pool_id, auth.client_id);
    if (!pool) {
      await writeDeniedReferenceEvent(base44, auth, "TalentPool", pool_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "pool_not_found");
      return Response.json({ error: "Pool not found" }, { status: 404 });
    }

    if (pool.status === "archived") {
      await failOperation(base44, opResult.operation.id, "already_archived");
      return Response.json({ error: "Pool is already archived" }, { status: 409 });
    }

    await base44.asServiceRole.entities.TalentPool.update(pool_id, {
      status: "archived",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "talent_pool_archived",
      target_entity_type: "TalentPool", target_entity_id: pool_id,
      metadata: { pool_id, cycle_id: pool.cycle_id },
      operation_id, event_key: { action: "talent_pool_archived", pool_id },
      event_type: "domain_action_completed", target_record_id: pool_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      pool_id, status: "archived",
    });

    return Response.json({ operation_id, pool_id, status: "archived" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "archive_talent_pool_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}