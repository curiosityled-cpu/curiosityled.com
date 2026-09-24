import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateAssignment } from "../../shared/successionAssignmentRules.ts";

/**
 * POST /successionRecordPositionChange
 *
 * Records a PositionAssignment. Enforces assignment rules:
 *   1. Reject end_date before start_date
 *   2. Permit cancellation only before start_date
 *   3. Backdated assignments prohibited unless correction_of_assignment_id set
 *   4. end_date is inclusive
 *   5. Temporal state derived using assignment_timezone
 *
 * Requires operation_id. Erroneous assignments use successionCorrectPositionAssignment.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, org_position_id, user_profile_id, user_email, assignment_type,
          start_date, end_date, assignment_timezone, is_cancellation } = body;

  if (!operation_id || !org_position_id || !user_profile_id || !assignment_type || !start_date) {
    return Response.json({ error: "operation_id, org_position_id, user_profile_id, assignment_type, start_date required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionRecordPositionChange",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionRecordPositionChange",
    payload: { org_position_id, user_profile_id, assignment_type, start_date, end_date, is_cancellation },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) {
    return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  }
  if (opResult.is_duplicate) {
    return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });
  }

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Resolve the tenant business timezone from the Client record — NOT from the
    // request body or the user's browser. This is the authoritative timezone for
    // all date-sensitive succession writes.
    const clients = await base44.asServiceRole.entities.Client.filter({ id: auth.client_id });
    const tenantTimezone = clients.length > 0 ? clients[0].business_timezone : null;

    if (!tenantTimezone) {
      await failOperation(base44, opResult.operation.id, "tenant_timezone_required");
      return Response.json({ error: "TENANT_TIMEZONE_REQUIRED", message: "Tenant business timezone is not configured. Configure business_timezone on the Client record before creating assignments." }, { status: 400 });
    }

    // Validate the timezone identifier — no silent fallback
    let validTimezone = tenantTimezone;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tenantTimezone });
    } catch {
      await failOperation(base44, opResult.operation.id, "invalid_timezone");
      return Response.json({ error: "INVALID_TIMEZONE", message: `Tenant business timezone '${tenantTimezone}' is not a valid IANA timezone identifier.` }, { status: 400 });
    }

    // Validate assignment rules using the resolved tenant timezone
    const validation = validateAssignment({
      start_date, end_date,
      assignment_timezone: validTimezone,
      correction_of_assignment_id: body.correction_of_assignment_id,
      is_cancellation,
    });

    if (!validation.valid) {
      await failOperation(base44, opResult.operation.id, "assignment_validation_failed");
      return Response.json({ error: "Assignment validation failed", errors: validation.errors }, { status: 400 });
    }

    const assignment = await base44.asServiceRole.entities.PositionAssignment.create({
      client_id: auth.client_id,
      org_position_id, user_profile_id, user_email,
      assignment_type,
      start_date, end_date,
      end_date_inclusive: true,
      assignment_timezone: validTimezone,
      status: validation.derived_status,
      correction_of_assignment_id: body.correction_of_assignment_id || null,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "position_change_recorded",
      target_entity_type: "PositionAssignment", target_entity_id: assignment.id,
      metadata: { org_position_id, user_profile_id, assignment_type, derived_status: validation.derived_status },
      operation_id, event_key: { action: "position_change_recorded", assignment_id: assignment.id },
      event_type: "domain_action_completed", target_record_id: assignment.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      assignment_id: assignment.id, status: validation.derived_status,
    });

    return Response.json({
      operation_id, assignment_id: assignment.id, status: validation.derived_status,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "record_position_change_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}