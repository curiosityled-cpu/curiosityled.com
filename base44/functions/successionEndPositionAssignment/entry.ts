import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { deriveAssignmentStatus, isEndDateOnOrBeforeStart } from "../../shared/successionTimezoneHelper.ts";

/**
 * POST /successionEndPositionAssignment
 * Ends an active PositionAssignment by setting end_date. The derived status
 * transitions to 'expired' once end_date passes. Only active assignments may
 * be ended. end_date must be on or after start_date.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const { operation_id, assignment_id, end_date, reason } = await req.json().catch(() => ({}));
  if (!operation_id || !assignment_id || !end_date) return Response.json({ error: "operation_id, assignment_id, end_date required" }, { status: 400 });
  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionEndPositionAssignment", target_client_id: auth.client_id, required_permission: "succession.roles.manage" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });
  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionEndPositionAssignment", payload: { assignment_id, end_date, reason }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const assignment = await validateSameTenantReference(base44, "PositionAssignment", assignment_id, auth.client_id);
    if (!assignment) { await writeDeniedReferenceEvent(base44, auth, "PositionAssignment", assignment_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "assignment_not_found"); return Response.json({ error: "Assignment not found" }, { status: 404 }); }
    if (assignment.status !== "active") { await failOperation(base44, opResult.operation.id, "cannot_end_non_active"); return Response.json({ error: `Cannot end assignment with status ${assignment.status}. Only active assignments can be ended.` }, { status: 409 }); }
    // Validate end_date is on or after start_date (inclusive end-date rule)
    if (isEndDateOnOrBeforeStart(assignment.start_date, end_date)) { await failOperation(base44, opResult.operation.id, "end_before_start"); return Response.json({ error: "end_date must be on or after start_date" }, { status: 400 }); }
    // Derive new status using the assignment's configured timezone (strict — no fallback)
    if (!assignment.assignment_timezone) { await failOperation(base44, opResult.operation.id, "tenant_timezone_required"); return Response.json({ error: "TENANT_TIMEZONE_REQUIRED", message: "Assignment has no configured timezone." }, { status: 400 }); }
    let derived;
    try { derived = deriveAssignmentStatus(assignment.start_date, end_date, assignment.assignment_timezone); }
    catch (e) { await failOperation(base44, opResult.operation.id, "invalid_timezone"); return Response.json({ error: "INVALID_TIMEZONE", message: (e as Error).message }, { status: 400 }); }
    const derivedStatus = derived.status;
    await base44.asServiceRole.entities.PositionAssignment.update(assignment_id, { end_date, end_date_inclusive: true, status: derivedStatus });
    const auditEvent = await writeSuccessionAuditEvent({ base44, action_type: "assignment_ended", target_entity_type: "PositionAssignment", target_entity_id: assignment_id, metadata: { org_position_id: assignment.org_position_id, user_profile_id: assignment.user_profile_id, end_date, derived_status: derivedStatus, reason }, operation_id, event_key: { action: "assignment_ended", assignment_id }, event_type: "domain_action_completed", target_record_id: assignment_id, attempt_number: 1 });
    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { assignment_id, status: derivedStatus });
    return Response.json({ operation_id, assignment_id, status: derivedStatus, end_date });
  } catch (error) { await failOperation(base44, opResult.operation.id, "end_assignment_failed"); return Response.json({ error: (error as Error).message }, { status: 500 }); }
}