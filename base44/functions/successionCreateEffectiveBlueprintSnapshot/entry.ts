import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { computePayloadHash } from "../../shared/successionPayloadCanonical.ts";

/**
 * POST /successionCreateEffectiveBlueprintSnapshot
 *
 * Generates a snapshot from a blueprint + applicable requirements.
 * Sets immutability proof fields. Only 'building' → 'generation_failed' allowed.
 * A 'generated' snapshot is never mutated — inconsistency creates a SnapshotIntegrityIncident.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, blueprint_id, org_role_id } = body;

  if (!operation_id || !blueprint_id || !org_role_id) {
    return Response.json({ error: "operation_id, blueprint_id, org_role_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) {
    return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  }

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateEffectiveBlueprintSnapshot",
    target_client_id: auth.client_id,
    required_permission: "succession.roles.manage",
  });
  if (!authz.allowed) {
    return Response.json({ error: authz.denied_reason }, { status: 403 });
  }

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateEffectiveBlueprintSnapshot",
    payload: { blueprint_id, org_role_id },
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

    // Read blueprint + OrgRole
    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: blueprint_id });
    if (blueprints.length === 0 || blueprints[0].status !== "approved" || !blueprints[0].is_current) {
      await failOperation(base44, opResult.operation.id, "blueprint_not_current_approved");
      return Response.json({ error: "Blueprint must be current and approved" }, { status: 409 });
    }

    const roles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id });
    if (roles.length === 0) {
      await failOperation(base44, opResult.operation.id, "org_role_not_found");
      return Response.json({ error: "OrgRole not found" }, { status: 404 });
    }
    const role = roles[0];

    // Gather applicable requirements (applicability_status=applicable only)
    const requirements = await base44.asServiceRole.entities.CriticalRoleRequirement.filter({
      org_role_id, applicability_status: "applicable", status: "approved",
      integrity_status: "active",
    });

    const expected_count = requirements.length;
    const requirements_snapshot = requirements.map((r: any) => ({
      id: r.id, requirement_text: r.requirement_text, revision_number: r.revision_number,
    }));

    // Compute content hash
    const content_hash = await computePayloadHash(requirements_snapshot);

    // Create snapshot in 'building' status
    const snapshot = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.create({
      client_id: auth.client_id,
      org_role_id, blueprint_id,
      blueprint_revision: role.blueprint_approval_revision,
      status: "building",
      expected_requirement_count: expected_count,
      generated_requirement_count: requirements_snapshot.length,
      requirements_content_hash: content_hash,
      generation_operation_id: opResult.operation.id,
      generated_at: new Date().toISOString(),
      requirements_snapshot,
      confidentiality_level: "confidential",
      integrity_status: "pending_validation",
    });

    // Transition to 'generated' (only building → generated or building → generation_failed)
    await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.update(snapshot.id, {
      status: "generated",
      generation_completed_at: new Date().toISOString(),
      integrity_status: "active",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "snapshot_generated",
      target_entity_type: "EffectiveBlueprintSnapshot", target_entity_id: snapshot.id,
      metadata: { blueprint_id, expected_count, generated_count: requirements_snapshot.length, content_hash },
      operation_id, event_key: { action: "snapshot_generated", snapshot_id: snapshot.id },
      event_type: "domain_action_completed", target_record_id: snapshot.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      snapshot_id: snapshot.id, status: "generated", requirement_count: requirements_snapshot.length,
    });

    return Response.json({
      operation_id, snapshot_id: snapshot.id, status: "generated",
      expected_requirement_count: expected_count,
      generated_requirement_count: requirements_snapshot.length,
      requirements_content_hash: content_hash,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "snapshot_generation_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}