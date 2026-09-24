import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionSetOrgRoleStatus
 * Toggles OrgRole.status between 'active' and 'inactive'. Inactive roles are
 * excluded from future succession planning but retain their blueprint history.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, org_role_id, status, reason } = await req.json().catch(() => ({}));
  if (!operation_id || !org_role_id || !status) return Response.json({ error: "operation_id, org_role_id, status required" }, { status: 400 });
  if (!["active", "inactive"].includes(status)) return Response.json({ error: "status must be 'active' or 'inactive'" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionSetOrgRoleStatus", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionSetOrgRoleStatus", payload: { org_role_id, status, reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const orgRole = await validateSameTenantReference(base44, "OrgRole", org_role_id, auth.client_id);
    if (!orgRole) { await writeDeniedReferenceEvent(base44, auth, "OrgRole", org_role_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "org_role_not_found"); return Response.json({ error: "OrgRole not found" }, { status: 404 }); }
    if (orgRole.status === status) { await failOperation(base44, opResult.operation.id, "no_status_change"); return Response.json({ error: `OrgRole is already ${status}` }, { status: 409 }); }
    await base44.asServiceRole.entities.OrgRole.update(org_role_id, { status });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "org_role_status_changed", target_entity_type: "OrgRole", target_entity_id: org_role_id, metadata: { cycle_id: orgRole.cycle_id, new_status: status, reason }, operation_id, event_key: { action: "org_role_status_changed", org_role_id, status }, event_type: "domain_action_completed", target_record_id: org_role_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { org_role_id, status });
    return Response.json({ operation_id, org_role_id, status });
  } catch (error) { await failOperation(base44, opResult.operation.id, "set_org_role_status_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}