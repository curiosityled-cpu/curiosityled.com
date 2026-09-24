import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionCreateCriticalRoleRequirement
 * Creates a new CriticalRoleRequirement in draft status.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, org_role_id, critical_role_id, requirement_text } = body;

  if (!operation_id || !org_role_id || !requirement_text) {
    return Response.json({ error: "operation_id, org_role_id, requirement_text required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateCriticalRoleRequirement",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateCriticalRoleRequirement",
    payload: { org_role_id, critical_role_id, requirement_text },
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

    // Cross-tenant validation: verify org_role belongs to caller's tenant
    const orgRole = await validateSameTenantReference(base44, "OrgRole", org_role_id, auth.client_id);
    if (!orgRole) {
      await writeDeniedReferenceEvent(base44, auth, "OrgRole", org_role_id, "cross_tenant_or_not_found");
      await failOperation(base44, opResult.operation.id, "org_role_not_found");
      return Response.json({ error: "OrgRole not found" }, { status: 404 });
    }

    const requirement = await base44.asServiceRole.entities.CriticalRoleRequirement.create({
      client_id: auth.client_id,
      org_role_id, critical_role_id, requirement_text,
      status: "draft",
      applicability_status: "applicable",
      revision_number: 1,
      revises_requirement_id: null,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "requirement_created",
      target_entity_type: "CriticalRoleRequirement", target_entity_id: requirement.id,
      metadata: { org_role_id },
      operation_id, event_key: { action: "requirement_created", requirement_id: requirement.id },
      event_type: "domain_action_completed", target_record_id: requirement.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { requirement_id: requirement.id });

    return Response.json({ operation_id, requirement_id: requirement.id, status: "draft" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_requirement_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}