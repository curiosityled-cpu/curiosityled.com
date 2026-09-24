import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionCreateOrgRole
 * Creates a new OrgRole. Lock fields initialized to null.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, title, role_identifier, level } = body;

  if (!operation_id || !cycle_id || !title) {
    return Response.json({ error: "operation_id, cycle_id, title required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateOrgRole",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateOrgRole",
    payload: { cycle_id, title, role_identifier, level },
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

    // Cross-tenant validation: verify cycle belongs to caller's tenant
    const cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, auth.client_id);
    if (!cycle) {
      await writeDeniedReferenceEvent(base44, auth, "SuccessionCycle", cycle_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "cycle_not_found");
      return Response.json({ error: "Cycle not found" }, { status: 404 });
    }

    const orgRole = await base44.asServiceRole.entities.OrgRole.create({
      client_id: auth.client_id,
      cycle_id, title, role_identifier, level,
      current_blueprint_id: null,
      blueprint_approval_revision: 0,
      blueprint_approval_lock_token: null,
      blueprint_approval_lock_expires_at: null,
      blueprint_approval_lock_operation_id: null,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "org_role_created",
      target_entity_type: "OrgRole", target_entity_id: orgRole.id,
      metadata: { cycle_id, title },
      operation_id, event_key: { action: "org_role_created", org_role_id: orgRole.id },
      event_type: "domain_action_completed", target_record_id: orgRole.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { org_role_id: orgRole.id });

    return Response.json({ operation_id, org_role_id: orgRole.id });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_org_role_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}