import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateAssignment } from "../../shared/successionAssignmentRules.ts";

/**
 * POST /successionCorrectPositionAssignment
 *
 * Creates an audited correction for an erroneous current or historical assignment.
 * The original assignment record is NEVER mutated — a new correcting record is
 * created with correction_of_assignment_id pointing at the erroneous one.
 * Permits backdated start_date because correction_of_assignment_id is set.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, erroneous_assignment_id, org_position_id, user_profile_id,
          user_email, assignment_type, start_date, end_date, assignment_timezone } = body;

  if (!operation_id || !erroneous_assignment_id || !org_position_id || !user_profile_id || !start_date) {
    return Response.json({ error: "operation_id, erroneous_assignment_id, org_position_id, user_profile_id, start_date required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCorrectPositionAssignment",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCorrectPositionAssignment",
    payload: { erroneous_assignment_id, org_position_id, user_profile_id, start_date, end_date },
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

    // Validate — correction_of_assignment_id is set, so backdated is permitted
    const validation = validateAssignment({
      start_date, end_date,
      assignment_timezone: assignment_timezone || "America/New_York",
      correction_of_assignment_id: erroneous_assignment_id,
    });

    if (!validation.valid) {
      await failOperation(base44, opResult.operation.id, "correction_validation_failed");
      return Response.json({ error: "Correction validation failed", errors: validation.errors }, { status: 400 });
    }

    // Mark the erroneous assignment as corrected (never mutate its content)
    await base44.asServiceRole.entities.PositionAssignment.update(erroneous_assignment_id, {
      status: "corrected",
    });

    // Create the correcting assignment
    const correction = await base44.asServiceRole.entities.PositionAssignment.create({
      client_id: auth.client_id,
      org_position_id, user_profile_id, user_email,
      assignment_type: assignment_type || "primary",
      start_date, end_date,
      end_date_inclusive: true,
      assignment_timezone: assignment_timezone || "America/New_York",
      status: validation.derived_status,
      correction_of_assignment_id: erroneous_assignment_id,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "position_assignment_corrected",
      target_entity_type: "PositionAssignment", target_entity_id: correction.id,
      metadata: { erroneous_assignment_id, correction_id: correction.id, derived_status: validation.derived_status },
      operation_id, event_key: { action: "position_corrected", correction_id: correction.id },
      event_type: "domain_action_completed", target_record_id: correction.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      correction_id: correction.id, erroneous_assignment_id, status: validation.derived_status,
    });

    return Response.json({
      operation_id, correction_id: correction.id,
      erroneous_assignment_id, status: validation.derived_status,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "correct_assignment_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}