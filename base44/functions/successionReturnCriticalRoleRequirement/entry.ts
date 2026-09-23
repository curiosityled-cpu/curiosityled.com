import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionReturnCriticalRoleRequirement
 *
 * Returns a SUBMITTED draft requirement back to draft status for re-authoring.
 * Does NOT mutate approved or stale records — those require
 * successionCreateCriticalRoleRequirementRevision.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, requirement_id } = body;

  if (!operation_id || !requirement_id) {
    return Response.json({ error: "operation_id, requirement_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionReturnCriticalRoleRequirement",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionReturnCriticalRoleRequirement",
    payload: { requirement_id },
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

    const requirements = await base44.asServiceRole.entities.CriticalRoleRequirement.filter({ id: requirement_id });
    if (requirements.length === 0) {
      await failOperation(base44, opResult.operation.id, "requirement_not_found");
      return Response.json({ error: "Requirement not found" }, { status: 404 });
    }
    const reqRecord = requirements[0];

    // Only submitted drafts may be returned to draft
    if (reqRecord.status !== "submitted") {
      await failOperation(base44, opResult.operation.id, "cannot_return_non_submitted");
      return Response.json({
        error: "Only submitted requirements can be returned to draft. Use successionCreateCriticalRoleRequirementRevision for approved/stale records.",
      }, { status: 409 });
    }

    await base44.asServiceRole.entities.CriticalRoleRequirement.update(requirement_id, {
      status: "draft",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "requirement_returned_to_draft",
      target_entity_type: "CriticalRoleRequirement", target_entity_id: requirement_id,
      metadata: { org_role_id: reqRecord.org_role_id },
      operation_id, event_key: { action: "requirement_returned", requirement_id },
      event_type: "domain_action_completed", target_record_id: requirement_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, { requirement_id, status: "draft" });

    return Response.json({ operation_id, requirement_id, status: "draft" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "return_requirement_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}