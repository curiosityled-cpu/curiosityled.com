import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionRemovePoolMember
 * Removes an active member from a TalentPool. The membership record is retained
 * for audit; status is set to "removed".
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, membership_id, removal_reason } = body;

  if (!operation_id || !membership_id) {
    return Response.json({ error: "operation_id, membership_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionRemovePoolMember",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionRemovePoolMember",
    payload: { membership_id, removal_reason },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: membership must belong to caller's tenant
    const membership = await validateSameTenantReference(base44, "TalentPoolMembership", membership_id, auth.client_id);
    if (!membership) {
      await writeDeniedReferenceEvent(base44, auth, "TalentPoolMembership", membership_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "membership_not_found");
      return Response.json({ error: "Membership not found" }, { status: 404 });
    }

    if (membership.status === "removed") {
      await failOperation(base44, opResult.operation.id, "already_removed");
      return Response.json({ error: "Membership is already removed" }, { status: 409 });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.TalentPoolMembership.update(membership_id, {
      status: "removed",
      removed_by_profile_id: auth.profile_id,
      removed_at: now,
      removal_reason: removal_reason || null,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "pool_member_removed",
      target_entity_type: "TalentPoolMembership", target_entity_id: membership_id,
      target_user_profile_id: membership.user_profile_id,
      metadata: { pool_id: membership.pool_id, removal_reason: removal_reason || null },
      operation_id, event_key: { action: "pool_member_removed", membership_id },
      event_type: "domain_action_completed", target_record_id: membership_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      membership_id, status: "removed",
    });

    return Response.json({ operation_id, membership_id, status: "removed" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "remove_pool_member_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}