import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionReplaceOrgPosition
 * Creates a new OrgPosition that replaces an existing one. The old position
 * is marked is_active=false with replaced_by_position_id set to the new
 * position. An immutable OrgPositionChange (change_type=replaced) is recorded.
 * The new position inherits the same org_role_id and reports_to_position_id.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, old_position_id, new_title, new_position_identifier, reason } = await req.json().catch(() => ({}));
  if (!operation_id || !old_position_id || !new_title) return Response.json({ error: "operation_id, old_position_id, new_title required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionReplaceOrgPosition", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionReplaceOrgPosition", payload: { old_position_id, new_title, new_position_identifier, reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const oldPosition = await validateSameTenantReference(base44, "OrgPosition", old_position_id, auth.client_id);
    if (!oldPosition) { await writeDeniedReferenceEvent(base44, auth, "OrgPosition", old_position_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "position_not_found"); return Response.json({ error: "OrgPosition not found" }, { status: 404 }); }
    if (!oldPosition.is_active) { await failOperation(base44, opResult.operation.id, "position_already_inactive"); return Response.json({ error: "Cannot replace an already-inactive position" }, { status: 409 }); }
    // Create the new position
    const newPosition = await base44.asServiceRole.entities.OrgPosition.create({ client_id: auth.client_id, org_role_id: oldPosition.org_role_id, title: new_title, position_identifier: new_position_identifier || null, reports_to_position_id: oldPosition.reports_to_position_id || null, is_active: true, confidentiality_level: "confidential", integrity_status: "pending_validation" });
    // Deactivate old position and link to replacement
    await base44.asServiceRole.entities.OrgPosition.update(old_position_id, { is_active: false, replaced_by_position_id: newPosition.id });
    // Record immutable OrgPositionChange
    await base44.asServiceRole.entities.OrgPositionChange.create({ client_id: auth.client_id, org_position_id: old_position_id, change_type: "replaced", previous_position_id: old_position_id, new_position_id: newPosition.id, changed_by_profile_id: auth.profile_id, changed_at: new Date().toISOString(), reason: reason || "Position replaced", operation_id: opResult.operation.id, confidentiality_level: "confidential", integrity_status: "active" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "org_position_replaced", target_entity_type: "OrgPosition", target_entity_id: newPosition.id, metadata: { old_position_id, new_position_id: newPosition.id, org_role_id: oldPosition.org_role_id }, operation_id, event_key: { action: "org_position_replaced", old_position_id, new_position_id: newPosition.id }, event_type: "domain_action_completed", target_record_id: newPosition.id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { old_position_id, new_position_id: newPosition.id });
    return Response.json({ operation_id, old_position_id, new_position_id: newPosition.id });
  } catch (error) { await failOperation(base44, opResult.operation.id, "replace_org_position_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}