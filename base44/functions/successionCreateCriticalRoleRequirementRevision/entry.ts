import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionCreateCriticalRoleRequirementRevision
 *
 * Creates a NEW revision of an approved or stale requirement, explicitly linked
 * to a blueprint version. The prior approved record is preserved unchanged.
 * revision_number increments; revises_requirement_id links to the prior revision.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, prior_requirement_id, requirement_text, blueprint_id } = body;

  if (!operation_id || !prior_requirement_id || !requirement_text) {
    return Response.json({ error: "operation_id, prior_requirement_id, requirement_text required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateCriticalRoleRequirementRevision",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateCriticalRoleRequirementRevision",
    payload: { prior_requirement_id, requirement_text, blueprint_id },
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

    const priorReqs = await base44.asServiceRole.entities.CriticalRoleRequirement.filter({ id: prior_requirement_id });
    if (priorReqs.length === 0) {
      await failOperation(base44, opResult.operation.id, "prior_requirement_not_found");
      return Response.json({ error: "Prior requirement not found" }, { status: 404 });
    }
    const prior = priorReqs[0];

    // Create new revision — prior record preserved unchanged
    const newRevision = await base44.asServiceRole.entities.CriticalRoleRequirement.create({
      client_id: auth.client_id,
      org_role_id: prior.org_role_id,
      critical_role_id: prior.critical_role_id,
      requirement_text,
      status: "draft",
      applicability_status: "applicable",
      revision_number: (prior.revision_number || 1) + 1,
      revises_requirement_id: prior_requirement_id,
      confidentiality_level: prior.confidentiality_level || "confidential",
      integrity_status: "active",
    });

    // Mark prior as superseded (preserved, not mutated in content)
    await base44.asServiceRole.entities.CriticalRoleRequirement.update(prior_requirement_id, {
      applicability_status: "superseded",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "requirement_revision_created",
      target_entity_type: "CriticalRoleRequirement", target_entity_id: newRevision.id,
      metadata: { prior_requirement_id, new_revision_number: newRevision.revision_number, blueprint_id },
      operation_id, event_key: { action: "requirement_revision_created", requirement_id: newRevision.id },
      event_type: "domain_action_completed", target_record_id: newRevision.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      requirement_id: newRevision.id, revision_number: newRevision.revision_number,
    });

    return Response.json({
      operation_id, requirement_id: newRevision.id,
      revision_number: newRevision.revision_number,
      revises_requirement_id: prior_requirement_id,
      status: "draft",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_revision_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}