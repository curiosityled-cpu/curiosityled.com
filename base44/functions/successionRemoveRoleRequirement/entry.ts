import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionRemoveRoleRequirement
 * Withdraws a DRAFT RoleRequirement (sets status=withdrawn). Approved
 * requirements are immutable and cannot be removed — they must be superseded
 * by a new blueprint approval. The record is preserved for audit.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, requirement_id, withdrawal_reason } = await req.json().catch(() => ({}));
  if (!operation_id || !requirement_id) return Response.json({ error: "operation_id, requirement_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionRemoveRoleRequirement", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionRemoveRoleRequirement", payload: { requirement_id, withdrawal_reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const reqs = await base44.asServiceRole.entities.RoleRequirement.filter({ id: requirement_id, client_id: auth.client_id });
    if (reqs.length === 0) { await failOperation(base44, opResult.operation.id, "requirement_not_found"); return Response.json({ error: "Requirement not found" }, { status: 404 }); }
    const reqRecord = reqs[0];
    if (reqRecord.status !== "draft") { await failOperation(base44, opResult.operation.id, "cannot_remove_non_draft"); return Response.json({ error: "Only draft requirements can be withdrawn. Approved requirements are immutable." }, { status: 409 }); }
    await base44.asServiceRole.entities.RoleRequirement.update(requirement_id, { status: "withdrawn", withdrawn_at: new Date().toISOString(), withdrawn_by_profile_id: auth.profile_id, withdrawal_reason: withdrawal_reason || null });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "role_requirement_withdrawn", target_entity_type: "RoleRequirement", target_entity_id: requirement_id, metadata: { blueprint_id: reqRecord.blueprint_id, withdrawal_reason }, operation_id, event_key: { action: "role_requirement_withdrawn", requirement_id }, event_type: "domain_action_completed", target_record_id: requirement_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { requirement_id, status: "withdrawn" });
    return Response.json({ operation_id, requirement_id, status: "withdrawn" });
  } catch (error) { await failOperation(base44, opResult.operation.id, "remove_role_requirement_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}