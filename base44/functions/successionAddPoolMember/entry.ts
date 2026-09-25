import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateUniqueness } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionAddPoolMember
 * Adds a user as a member of an active TalentPool. Membership is confirmed
 * when an authorized human adds it.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, pool_id, user_profile_id } = body;

  if (!operation_id || !pool_id || !user_profile_id) {
    return Response.json({ error: "operation_id, pool_id, user_profile_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionAddPoolMember",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionAddPoolMember",
    payload: { pool_id, user_profile_id },
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

    if (pool.status !== "active") {
      await failOperation(base44, opResult.operation.id, "pool_not_active");
      return Response.json({ error: "Cannot add members to an archived pool" }, { status: 409 });
    }

    // Check for existing active membership
    const existing = await base44.asServiceRole.entities.TalentPoolMembership.filter({
      client_id: auth.client_id, pool_id, user_profile_id, status: "active", integrity_status: "active",
    });
    if (existing.length > 0) {
      await failOperation(base44, opResult.operation.id, "duplicate_membership");
      return Response.json({ error: "User is already an active member of this pool", existing_membership_id: existing[0].id }, { status: 409 });
    }

    const now = new Date().toISOString();
    const membership = await base44.asServiceRole.entities.TalentPoolMembership.create({
      client_id: auth.client_id,
      pool_id,
      user_profile_id,
      added_by_profile_id: auth.profile_id,
      added_at: now,
      status: "active",
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Uniqueness validation: one active membership per client_id + pool_id + user_profile_id
    const uniqueness = await validateUniqueness(base44, "TalentPoolMembership", membership.id, {
      client_id: auth.client_id, pool_id, user_profile_id, status: "active", integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "pool_member_added",
      target_entity_type: "TalentPoolMembership", target_entity_id: membership.id,
      target_user_profile_id: user_profile_id,
      metadata: { pool_id, user_profile_id, is_unique: uniqueness.is_unique },
      operation_id, event_key: { action: "pool_member_added", membership_id: membership.id },
      event_type: "domain_action_completed", target_record_id: membership.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      membership_id: membership.id, integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });

    return Response.json({
      operation_id, membership_id: membership.id,
      integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "add_pool_member_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}