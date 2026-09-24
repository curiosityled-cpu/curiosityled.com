import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionUpdateOrgPosition
 * Updates OrgPosition title, position_identifier, or reports_to_position_id.
 * If reports_to_position_id changes, records an immutable OrgPositionChange
 * (change_type=reports_to_changed) with the previous and new values.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, org_position_id, title, position_identifier, reports_to_position_id } = await req.json().catch(() => ({}));
  if (!operation_id || !org_position_id) return Response.json({ error: "operation_id, org_position_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionUpdateOrgPosition", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionUpdateOrgPosition", payload: { org_position_id, title, position_identifier, reports_to_position_id }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const position = await validateSameTenantReference(base44, "OrgPosition", org_position_id, auth.client_id);
    if (!position) { await writeDeniedReferenceEvent(base44, auth, "OrgPosition", org_position_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "position_not_found"); return Response.json({ error: "OrgPosition not found" }, { status: 404 }); }
    // Validate new reports_to_position_id belongs to same tenant
    if (reports_to_position_id !== undefined && reports_to_position_id !== null) {
      if (reports_to_position_id !== position.reports_to_position_id) {
        const newReportsTo = await validateSameTenantReference(base44, "OrgPosition", reports_to_position_id, auth.client_id);
        if (!newReportsTo) { await writeDeniedReferenceEvent(base44, auth, "OrgPosition", reports_to_position_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "reports_to_not_found"); return Response.json({ error: "reports_to_position_id not found in your tenant" }, { status: 404 }); }
      }
    }
    const updates: any = {};
    if (title) updates.title = title;
    if (position_identifier !== undefined) updates.position_identifier = position_identifier;
    const reportsToChanged = reports_to_position_id !== undefined && reports_to_position_id !== position.reports_to_position_id;
    if (reportsToChanged) updates.reports_to_position_id = reports_to_position_id;
    if (Object.keys(updates).length === 0) { await failOperation(base44, opResult.operation.id, "no_updates"); return Response.json({ error: "No update fields provided" }, { status: 400 }); }
    await base44.asServiceRole.entities.OrgPosition.update(org_position_id, updates);
    // Record immutable OrgPositionChange if reports_to changed
    if (reportsToChanged) {
      await base44.asServiceRole.entities.OrgPositionChange.create({ client_id: auth.client_id, org_position_id, change_type: "reports_to_changed", previous_reports_to_position_id: position.reports_to_position_id || null, new_reports_to_position_id: reports_to_position_id, changed_by_profile_id: auth.profile_id, changed_at: new Date().toISOString(), reason: body.reason || "Reporting line updated", operation_id: opResult.operation.id, confidentiality_level: "confidential", integrity_status: "active" });
    }
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "org_position_updated", target_entity_type: "OrgPosition", target_entity_id: org_position_id, metadata: { org_role_id: position.org_role_id, updated_fields: Object.keys(updates), reports_to_changed: reportsToChanged }, operation_id, event_key: { action: "org_position_updated", org_position_id }, event_type: "domain_action_completed", target_record_id: org_position_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { org_position_id, reports_to_changed: reportsToChanged });
    return Response.json({ operation_id, org_position_id });
  } catch (error) { await failOperation(base44, opResult.operation.id, "update_org_position_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}