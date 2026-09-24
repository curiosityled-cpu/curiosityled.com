import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionStartPositionAssignment
 * Transitions a scheduled PositionAssignment to active status. Only assignments
 * whose start_date has arrived (or passed) may be started. Cancelled/expired/
 * corrected assignments cannot be started.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, assignment_id } = await req.json().catch(() => ({}));
  if (!operation_id || !assignment_id) return Response.json({ error: "operation_id, assignment_id required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionStartPositionAssignment", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionStartPositionAssignment", payload: { assignment_id }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const assignment = await validateSameTenantReference(base44, "PositionAssignment", assignment_id, auth.client_id);
    if (!assignment) { await writeDeniedReferenceEvent(base44, auth, "PositionAssignment", assignment_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "assignment_not_found"); return Response.json({ error: "Assignment not found" }, { status: 404 }); }
    if (assignment.status !== "scheduled") { await failOperation(base44, opResult.operation.id, "cannot_start_non_scheduled"); return Response.json({ error: `Cannot start assignment with status ${assignment.status}. Only scheduled assignments can be started.` }, { status: 409 }); }
    // Verify start_date has arrived
    const now = new Date();
    const startDate = new Date(assignment.start_date);
    if (startDate > now) { await failOperation(base44, opResult.operation.id, "start_date_not_arrived"); return Response.json({ error: "Cannot start assignment before its start_date" }, { status: 409 }); }
    await base44.asServiceRole.entities.PositionAssignment.update(assignment_id, { status: "active" });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "assignment_started", target_entity_type: "PositionAssignment", target_entity_id: assignment_id, metadata: { org_position_id: assignment.org_position_id, user_profile_id: assignment.user_profile_id }, operation_id, event_key: { action: "assignment_started", assignment_id }, event_type: "domain_action_completed", target_record_id: assignment_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { assignment_id, status: "active" });
    return Response.json({ operation_id, assignment_id, status: "active" });
  } catch (error) { await failOperation(base44, opResult.operation.id, "start_assignment_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}