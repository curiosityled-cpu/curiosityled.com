import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/** POST /successionApproveCriticalRoleRequirement — approve a submitted requirement */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, requirement_id } = await req.json().catch(() => ({}));
  if (!operation_id || !requirement_id) return Response.json({ error: "operation_id, requirement_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionApproveCriticalRoleRequirement", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionApproveCriticalRoleRequirement", payload: { requirement_id }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const reqs = await base44.asServiceRole.entities.CriticalRoleRequirement.filter({ id: requirement_id, client_id: auth.client_id });
    if (reqs.length === 0) { await failOperation(base44, opResult.operation.id, "requirement_not_found"); return Response.json({ error: "Requirement not found" }, { status: 404 }); }
    if (reqs[0].status !== "submitted") { await failOperation(base44, opResult.operation.id, "cannot_approve_non_submitted"); return Response.json({ error: "Only submitted requirements can be approved" }, { status: 409 }); }
    // Separation of duties: the approver must not be the same person who submitted the requirement.
    if (reqs[0].submitted_by_profile_id && reqs[0].submitted_by_profile_id === auth.profile_id) {
      await failOperation(base44, opResult.operation.id, "separation_of_duties_violation");
      return Response.json({ error: "Separation of duties: you cannot approve a requirement you submitted." }, { status: 409 });
    }
    await base44.asServiceRole.entities.CriticalRoleRequirement.update(requirement_id, { status: "approved", approved_at: new Date().toISOString(), approved_by_profile_id: auth.profile_id, integrity_status: "active" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "requirement_approved", target_entity_type: "CriticalRoleRequirement", target_entity_id: requirement_id, metadata: { org_role_id: reqs[0].org_role_id }, operation_id, event_key: { action: "requirement_approved", requirement_id }, event_type: "domain_action_completed", target_record_id: requirement_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { requirement_id, status: "approved" });
    return Response.json({ operation_id, requirement_id, status: "approved" });
  } catch (error) { await failOperation(base44, opResult.operation.id, "approve_requirement_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}