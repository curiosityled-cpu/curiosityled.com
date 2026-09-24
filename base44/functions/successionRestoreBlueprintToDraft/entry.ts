import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionRestoreBlueprintToDraft
 * Restores a REJECTED RoleSuccessBlueprint back to draft for re-authoring.
 * Does NOT mutate approved/superseded blueprints — those are immutable.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, blueprint_id } = await req.json().catch(() => ({}));
  if (!operation_id || !blueprint_id) return Response.json({ error: "operation_id, blueprint_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionRestoreBlueprintToDraft", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionRestoreBlueprintToDraft", payload: { blueprint_id }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: blueprint_id, client_id: auth.client_id });
    if (blueprints.length === 0) { await failOperation(base44, opResult.operation.id, "blueprint_not_found"); return Response.json({ error: "Blueprint not found" }, { status: 404 }); }
    const bp = blueprints[0];
    if (bp.status !== "rejected") { await failOperation(base44, opResult.operation.id, "cannot_restore_non_rejected"); return Response.json({ error: "Only rejected blueprints can be restored to draft." }, { status: 409 }); }
    await base44.asServiceRole.entities.RoleSuccessBlueprint.update(blueprint_id, { status: "draft" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "blueprint_restored_to_draft", target_entity_type: "RoleSuccessBlueprint", target_entity_id: blueprint_id, metadata: { org_role_id: bp.org_role_id }, operation_id, event_key: { action: "blueprint_restored", blueprint_id }, event_type: "domain_action_completed", target_record_id: blueprint_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { blueprint_id, status: "draft" });
    return Response.json({ operation_id, blueprint_id, status: "draft" });
  } catch (error) { await failOperation(base44, opResult.operation.id, "restore_blueprint_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}