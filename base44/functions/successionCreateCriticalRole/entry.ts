import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/** POST /successionCreateCriticalRole — create a tenant-scoped critical role */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, name, description } = await req.json().catch(() => ({}));
  if (!operation_id || !name) return Response.json({ error: "operation_id, name required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionCreateCriticalRole", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionCreateCriticalRole", payload: { name, description }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const criticalRole = await base44.asServiceRole.entities.CriticalRole.create({ client_id: auth.client_id, name, description, is_platform_default: false, confidentiality_level: "standard", integrity_status: "active" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "critical_role_created", target_entity_type: "CriticalRole", target_entity_id: criticalRole.id, metadata: { name }, operation_id, event_key: { action: "critical_role_created", critical_role_id: criticalRole.id }, event_type: "domain_action_completed", target_record_id: criticalRole.id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { critical_role_id: criticalRole.id });
    return Response.json({ operation_id, critical_role_id: criticalRole.id });
  } catch (error) { await failOperation(base44, opResult.operation.id, "create_critical_role_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}