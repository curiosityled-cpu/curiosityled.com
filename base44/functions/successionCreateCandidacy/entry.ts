import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { validateUniqueness } from "../../shared/successionIntegrityHelper.ts";

/**
 * POST /successionCreateCandidacy
 * Creates a new SuccessorCandidacy linking a user to a critical role.
 * Enforces one active candidacy per client_id + critical_role_id + user_profile_id.
 * No scoring, ranking, readiness, evidence, or recommendations.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, critical_role_id, user_profile_id, discovery_source, origin_pool_membership_id } = body;

  if (!operation_id || !cycle_id || !critical_role_id || !user_profile_id || !discovery_source) {
    return Response.json({ error: "operation_id, cycle_id, critical_role_id, user_profile_id, discovery_source required" }, { status: 400 });
  }

  const validSources = ["pool_nomination", "manager_nomination", "self_nomination", "hr_nomination"];
  if (!validSources.includes(discovery_source)) {
    return Response.json({ error: "Invalid discovery_source" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateCandidacy",
    target_client_id: auth.client_id,
    required_permission: "succession.discovery.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateCandidacy",
    payload: { cycle_id, critical_role_id, user_profile_id, discovery_source, origin_pool_membership_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Cross-tenant validation: cycle + critical_role must belong to caller's tenant
    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "cycle_not_found");
      return Response.json({ error: "Cycle not found" }, { status: 404 });
    }

    const criticalRole = await validateSameTenantReference(base44, "CriticalRole", critical_role_id, auth.client_id);
    if (!criticalRole) {
      await writeDeniedReferenceEvent(base44, auth, "CriticalRole", critical_role_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "critical_role_not_found");
      return Response.json({ error: "Critical role not found" }, { status: 404 });
    }

    // Validate origin pool membership if provided
    if (origin_pool_membership_id) {
      const poolMembership = await validateSameTenantReference(base44, "TalentPoolMembership", origin_pool_membership_id, auth.client_id);
      if (!poolMembership) {
        await writeDeniedReferenceEvent(base44, auth, "TalentPoolMembership", origin_pool_membership_id, "cross_tenant_or_not_found", opResult.operation.id);
        await failOperation(base44, opResult.operation.id, "pool_membership_not_found");
        return Response.json({ error: "Pool membership not found" }, { status: 404 });
      }
    }

    // Enforce one active candidacy per client_id + critical_role_id + user_profile_id
    const existing = await base44.asServiceRole.entities.SuccessorCandidacy.filter({
      client_id: auth.client_id, critical_role_id, user_profile_id, status: "active", integrity_status: "active",
    });
    if (existing.length > 0) {
      await failOperation(base44, opResult.operation.id, "duplicate_candidacy");
      return Response.json({ error: "An active candidacy already exists for this critical role and user", existing_candidacy_id: existing[0].id }, { status: 409 });
    }

    const now = new Date().toISOString();
    const candidacy = await base44.asServiceRole.entities.SuccessorCandidacy.create({
      client_id: auth.client_id,
      cycle_id,
      critical_role_id,
      user_profile_id,
      origin_pool_membership_id: origin_pool_membership_id || null,
      discovery_source,
      nominated_by_profile_id: auth.profile_id,
      nominated_at: now,
      status: "active",
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Uniqueness validation
    const uniqueness = await validateUniqueness(base44, "SuccessorCandidacy", candidacy.id, {
      client_id: auth.client_id, critical_role_id, user_profile_id, status: "active", integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "candidacy_created",
      target_entity_type: "SuccessorCandidacy", target_entity_id: candidacy.id,
      target_user_profile_id: user_profile_id,
      metadata: { cycle_id, critical_role_id, user_profile_id, discovery_source, is_unique: uniqueness.is_unique },
      operation_id, event_key: { action: "candidacy_created", candidacy_id: candidacy.id },
      event_type: "domain_action_completed", target_record_id: candidacy.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      candidacy_id: candidacy.id, integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });

    return Response.json({
      operation_id, candidacy_id: candidacy.id,
      integrity_status: uniqueness.is_unique ? "active" : "quarantined",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_candidacy_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}