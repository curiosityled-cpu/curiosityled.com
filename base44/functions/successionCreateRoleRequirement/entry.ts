import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/** POST /successionCreateRoleRequirement — create a tenant-scoped role requirement */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, name, description, category } = await req.json().catch(() => ({}));
  if (!operation_id || !name) return Response.json({ error: "operation_id, name required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionCreateRoleRequirement", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionCreateRoleRequirement", payload: { name, description, category }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const requirement = await base44.asServiceRole.entities.RoleRequirement.create({ client_id: auth.client_id, name, description, category, is_platform_default: false, confidentiality_level: "standard", integrity_status: "active" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "role_requirement_created", target_entity_type: "RoleRequirement", target_entity_id: requirement.id, metadata: { name }, operation_id, event_key: { action: "role_requirement_created", requirement_id: requirement.id }, event_type: "domain_action_completed", target_record_id: requirement.id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { requirement_id: requirement.id });
    return Response.json({ operation_id, requirement_id: requirement.id });
  } catch (error) { await failOperation(base44, opResult.operation.id, "create_role_requirement_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}