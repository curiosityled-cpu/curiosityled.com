import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionSubmitBlueprint
 *
 * Submits a DRAFT RoleSuccessBlueprint for approval. Updates the existing
 * draft record to status=submitted (does NOT create a new record — the
 * requirements are already attached to the draft blueprint_id).
 *
 * Lifecycle: draft → submitted → approved/rejected
 *            draft → withdrawn (via successionWithdrawBlueprintDraft)
 *            submitted → draft (via successionReturnBlueprint)
 *
 * On submit, all RoleRequirements attached to this blueprint are frozen
 * (status set to "submitted") — they cannot be edited while the blueprint
 * is in the approval pipeline.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, blueprint_id } = body;

  if (!operation_id || !blueprint_id) {
    return Response.json({ error: "operation_id, blueprint_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSubmitBlueprint",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSubmitBlueprint",
    payload: { blueprint_id },
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

    // Read the draft blueprint — cross-tenant validated
    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({
      id: blueprint_id, client_id: auth.client_id,
    });
    if (blueprints.length === 0) {
      await writeDeniedReferenceEvent(base44, auth, "RoleSuccessBlueprint", blueprint_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "blueprint_not_found");
      return Response.json({ error: "Blueprint not found" }, { status: 404 });
    }

    const bp = blueprints[0];
    if (bp.status !== "draft") {
      await failOperation(base44, opResult.operation.id, "cannot_submit_non_draft");
      return Response.json({ error: `Cannot submit blueprint in status '${bp.status}'. Only draft blueprints can be submitted.` }, { status: 409 });
    }

    // Update blueprint to submitted
    await base44.asServiceRole.entities.RoleSuccessBlueprint.update(blueprint_id, {
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by_profile_id: auth.profile_id,
    });

    // Freeze all RoleRequirements attached to this blueprint (draft → submitted)
    const requirements = await base44.asServiceRole.entities.RoleRequirement.filter({
      client_id: auth.client_id, blueprint_id, status: "draft", integrity_status: "active",
    });
    for (const req of requirements) {
      await base44.asServiceRole.entities.RoleRequirement.update(req.id, {
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_by_profile_id: auth.profile_id,
      });
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "blueprint_submitted",
      target_entity_type: "RoleSuccessBlueprint", target_entity_id: blueprint_id,
      metadata: { org_role_id: bp.org_role_id, version_label: bp.version_label, requirements_frozen: requirements.length },
      operation_id, event_key: { action: "blueprint_submitted", blueprint_id },
      event_type: "domain_action_completed", target_record_id: blueprint_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      blueprint_id, status: "submitted", requirements_frozen: requirements.length,
    });

    return Response.json({
      operation_id, blueprint_id, status: "submitted",
      requirements_frozen: requirements.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "submit_blueprint_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}