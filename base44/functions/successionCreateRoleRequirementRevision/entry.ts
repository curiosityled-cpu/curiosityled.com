import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionCreateRoleRequirementRevision
 *
 * Creates a NEW revision of an approved or superseded RoleRequirement, explicitly
 * linked to a new DRAFT blueprint version. The prior approved record is preserved
 * unchanged (marked superseded).
 *
 * Records:
 *   - revises_requirement_id: prior requirement ID
 *   - revision_number: prior.revision_number + 1
 *   - source_blueprint_id: prior.blueprint_id (where the prior was approved)
 *   - source_blueprint_version: OrgRole.blueprint_approval_revision at prior approval
 *
 * Requires:
 *   - prior requirement status is "approved" or "superseded" (draft/submitted must use update/return)
 *   - destination blueprint is "draft" (approved blueprints are immutable)
 *   - same-tenant validation on both prior and destination blueprint
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, prior_requirement_id, blueprint_id, requirement_text, requirement_detail } = body;

  if (!operation_id || !prior_requirement_id || !blueprint_id || !requirement_text) {
    return Response.json({ error: "operation_id, prior_requirement_id, blueprint_id, requirement_text required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateRoleRequirementRevision",
    target_client_id: auth.client_id, required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateRoleRequirementRevision",
    payload: { prior_requirement_id, blueprint_id, requirement_text, requirement_detail },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });

  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // Load prior requirement — same-tenant validated
    const priorReqs = await base44.asServiceRole.entities.RoleRequirement.filter({ id: prior_requirement_id, client_id: auth.client_id });
    if (priorReqs.length === 0) {
      await failOperation(base44, opResult.operation.id, "prior_requirement_not_found");
      return Response.json({ error: "Prior requirement not found" }, { status: 404 });
    }
    const prior = priorReqs[0];

    // Only approved or superseded requirements may be revised (draft/submitted use update/return)
    if (!["approved", "superseded"].includes(prior.status)) {
      await failOperation(base44, opResult.operation.id, "cannot_revise_non_approved");
      return Response.json({ error: "Only approved or superseded requirements can be revised. Use successionUpdateRoleRequirement for drafts." }, { status: 409 });
    }

    // Load destination blueprint — must be draft and same tenant
    const destBlueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: blueprint_id, client_id: auth.client_id });
    if (destBlueprints.length === 0) {
      await writeDeniedReferenceEvent(base44, auth, "RoleSuccessBlueprint", blueprint_id, "cross_tenant_or_not_found");
      await failOperation(base44, opResult.operation.id, "destination_blueprint_not_found");
      return Response.json({ error: "Destination blueprint not found" }, { status: 404 });
    }
    const destBlueprint = destBlueprints[0];

    if (destBlueprint.status !== "draft") {
      await failOperation(base44, opResult.operation.id, "destination_not_draft");
      return Response.json({ error: "Destination blueprint must be draft. Approved blueprints are immutable." }, { status: 409 });
    }

    // Verify destination blueprint is for the same OrgRole as the prior requirement's blueprint
    const priorBlueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: prior.blueprint_id, client_id: auth.client_id });
    if (priorBlueprints.length === 0) {
      await failOperation(base44, opResult.operation.id, "prior_blueprint_not_found");
      return Response.json({ error: "Prior requirement's blueprint not found" }, { status: 404 });
    }
    if (destBlueprint.org_role_id !== priorBlueprints[0].org_role_id) {
      await failOperation(base44, opResult.operation.id, "blueprint_role_mismatch");
      return Response.json({ error: "Destination blueprint must be for the same OrgRole as the prior requirement" }, { status: 409 });
    }

    // Get the source blueprint version (the OrgRole's blueprint_approval_revision at the time the prior was approved)
    const priorOrgRoleId = priorBlueprints[0].org_role_id;
    const orgRoles = await base44.asServiceRole.entities.OrgRole.filter({ id: priorOrgRoleId, client_id: auth.client_id });
    const sourceBlueprintVersion = orgRoles.length > 0 ? (orgRoles[0].blueprint_approval_revision || 0) : 0;

    // Create new revision under the destination draft blueprint
    const newRevision = await base44.asServiceRole.entities.RoleRequirement.create({
      client_id: auth.client_id,
      blueprint_id, // destination draft blueprint
      requirement_type: prior.requirement_type,
      requirement_text,
      requirement_detail: requirement_detail || prior.requirement_detail || null,
      status: "draft",
      revision_number: (prior.revision_number || 1) + 1,
      revises_requirement_id: prior_requirement_id,
      source_blueprint_id: prior.blueprint_id, // where the prior was approved
      source_blueprint_version: sourceBlueprintVersion,
      confidentiality_level: prior.confidentiality_level || "confidential",
      integrity_status: "active",
    });

    // PRESERVE the source requirement unchanged — do NOT mutate or mark as superseded.
    // The source belongs to an approved or superseded historical blueprint and is immutable.
    // Historical supersession is derived from the parent blueprint relationship, not by
    // mutating the source requirement. The new revision simply links to it via
    // revises_requirement_id and records source_blueprint_id + source_blueprint_version.

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "role_requirement_revision_created",
      target_entity_type: "RoleRequirement", target_entity_id: newRevision.id,
      metadata: {
        prior_requirement_id, new_revision_number: newRevision.revision_number,
        source_blueprint_id: prior.blueprint_id, source_blueprint_version: sourceBlueprintVersion,
        destination_blueprint_id: blueprint_id,
      },
      operation_id, event_key: { action: "role_requirement_revision_created", requirement_id: newRevision.id },
      event_type: "domain_action_completed", target_record_id: newRevision.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      requirement_id: newRevision.id, revision_number: newRevision.revision_number,
    });

    return Response.json({
      operation_id, requirement_id: newRevision.id,
      revision_number: newRevision.revision_number,
      revises_requirement_id: prior_requirement_id,
      source_blueprint_id: prior.blueprint_id,
      source_blueprint_version: sourceBlueprintVersion,
      status: "draft",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_role_requirement_revision_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}