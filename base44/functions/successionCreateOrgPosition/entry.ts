import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/** POST /successionCreateOrgPosition — create a position for an org role */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, org_role_id, title, position_identifier } = await req.json().catch(() => ({}));
  if (!operation_id || !org_role_id || !title) return Response.json({ error: "operation_id, org_role_id, title required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionCreateOrgPosition", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionCreateOrgPosition", payload: { org_role_id, title, position_identifier }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const position = await base44.asServiceRole.entities.OrgPosition.create({ client_id: auth.client_id, org_role_id, title, position_identifier, is_active: true, confidentiality_level: "confidential", integrity_status: "pending_validation" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "org_position_created", target_entity_type: "OrgPosition", target_entity_id: position.id, metadata: { org_role_id, title }, operation_id, event_key: { action: "org_position_created", position_id: position.id }, event_type: "domain_action_completed", target_record_id: position.id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { position_id: position.id });
    return Response.json({ operation_id, position_id: position.id });
  } catch (error) { await failOperation(base44, opResult.operation.id, "create_position_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}