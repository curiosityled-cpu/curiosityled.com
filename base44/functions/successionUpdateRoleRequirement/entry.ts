import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionUpdateRoleRequirement
 * Updates a DRAFT RoleRequirement's text/detail. Approved requirements are
 * immutable — changes require a new revision (successionCreateRoleRequirementRevision
 * pattern, not yet implemented for RoleRequirement). Only status=draft may be updated.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, requirement_id, requirement_text, requirement_detail } = await req.json().catch(() => ({}));
  if (!operation_id || !requirement_id) return Response.json({ error: "operation_id, requirement_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionUpdateRoleRequirement", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionUpdateRoleRequirement", payload: { requirement_id, requirement_text, requirement_detail }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const reqs = await base44.asServiceRole.entities.RoleRequirement.filter({ id: requirement_id, client_id: auth.client_id });
    if (reqs.length === 0) { await failOperation(base44, opResult.operation.id, "requirement_not_found"); return Response.json({ error: "Requirement not found" }, { status: 404 }); }
    const reqRecord = reqs[0];
    if (reqRecord.status !== "draft") { await failOperation(base44, opResult.operation.id, "cannot_update_non_draft"); return Response.json({ error: "Only draft requirements can be updated. Approved requirements are immutable — create a new revision." }, { status: 409 }); }
    const updates: any = {};
    if (requirement_text) updates.requirement_text = requirement_text;
    if (requirement_detail !== undefined) updates.requirement_detail = requirement_detail;
    if (Object.keys(updates).length === 0) { await failOperation(base44, opResult.operation.id, "no_updates"); return Response.json({ error: "No update fields provided" }, { status: 400 }); }
    await base44.asServiceRole.entities.RoleRequirement.update(requirement_id, updates);
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "role_requirement_updated", target_entity_type: "RoleRequirement", target_entity_id: requirement_id, metadata: { blueprint_id: reqRecord.blueprint_id, updated_fields: Object.keys(updates) }, operation_id, event_key: { action: "role_requirement_updated", requirement_id }, event_type: "domain_action_completed", target_record_id: requirement_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { requirement_id });
    return Response.json({ operation_id, requirement_id, status: "draft" });
  } catch (error) { await failOperation(base44, opResult.operation.id, "update_role_requirement_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}