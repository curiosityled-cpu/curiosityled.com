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
  const { operation_id, blueprint_id, org_role_id, critical_role_id } = body;

  if (!operation_id || !blueprint_id || !org_role_id) {
    return Response.json({ error: "operation_id, blueprint_id, org_role_id required (critical_role_id optional)" }, { status: 400 });
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
    payload: { blueprint_id, org_role_id, critical_role_id },
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

    // Read blueprint + OrgRole — cross-tenant validated
    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: blueprint_id, client_id: auth.client_id });
    if (blueprints.length === 0 || blueprints[0].status !== "approved" || !blueprints[0].is_current) {
      await failOperation(base44, opResult.operation.id, "blueprint_not_current_approved");
      return Response.json({ error: "Blueprint must be current and approved" }, { status: 409 });
    }

    const roles = await base44.asServiceRole.entities.OrgRole.filter({ id: org_role_id, client_id: auth.client_id });
    if (roles.length === 0) {
      await failOperation(base44, opResult.operation.id, "org_role_not_found");
      return Response.json({ error: "OrgRole not found" }, { status: 404 });
    }
    const role = roles[0];

    // Gather canonical RoleRequirements from the approved blueprint
    const canonicalReqs = await base44.asServiceRole.entities.RoleRequirement.filter({
      client_id: auth.client_id, blueprint_id, status: "approved", integrity_status: "active",
    });

    // Gather applicable approved CriticalRoleRequirements (position-specific, optionally for a critical role)
    const critFilter: any = { client_id: auth.client_id, org_role_id, status: "approved", applicability_status: "applicable", integrity_status: "active" };
    if (critical_role_id) critFilter.critical_role_id = critical_role_id;
    const positionReqs = await base44.asServiceRole.entities.CriticalRoleRequirement.filter(critFilter);

    // Merge canonical + position-specific (same logic as preview)
    const effectiveRequirements = canonicalReqs.map((r: any) => ({
      source_type: "canonical", source_requirement_id: r.id,
      base_requirement_id: r.id, base_blueprint_id: blueprint.id, base_blueprint_version_number: role.blueprint_approval_revision,
      modification_type: "canonical", effective_language: r.requirement_text, effective_level: r.requirement_detail || null,
      applicability_status: "applicable", exception_approval_status: "none",
    }));

    for (const pr of positionReqs) {
      if (pr.modification_type === "new_requirement") {
        effectiveRequirements.push({
          source_type: "position_specific", source_requirement_id: pr.id,
          base_requirement_id: null, base_blueprint_id: blueprint.id, base_blueprint_version_number: role.blueprint_approval_revision,
          modification_type: "new_requirement", effective_language: pr.requirement_text, effective_level: pr.requirement_detail || null,
          applicability_status: "applicable", exception_approval_status: "none",
        });
      } else if (pr.modification_type === "modification") {
        const idx = effectiveRequirements.findIndex(e => e.source_requirement_id === pr.base_requirement_id);
        if (idx >= 0) { effectiveRequirements[idx] = { ...effectiveRequirements[idx], source_type: "position_specific", source_requirement_id: pr.id, modification_type: "modification", effective_language: pr.requirement_text, effective_level: pr.requirement_detail || effectiveRequirements[idx].effective_level }; }
      } else if (pr.modification_type === "approved_exception") {
        const idx = effectiveRequirements.findIndex(e => e.source_requirement_id === pr.base_requirement_id);
        if (idx >= 0) { effectiveRequirements[idx].exception_approval_status = "approved"; effectiveRequirements[idx].applicability_status = "excepted"; effectiveRequirements[idx].effective_language += ` [EXCEPTION: ${pr.requirement_text}]`; }
      } else if (pr.modification_type === "not_applicable") {
        const idx = effectiveRequirements.findIndex(e => e.source_requirement_id === pr.base_requirement_id);
        if (idx >= 0) { effectiveRequirements[idx].applicability_status = "not_applicable"; effectiveRequirements[idx].exception_approval_status = "approved"; }
      }
    }

    const expected_count = effectiveRequirements.length;
    const requirements_snapshot = effectiveRequirements;

    // Compute content hash
    const content_hash = await computePayloadHash(requirements_snapshot);

    // Create snapshot in 'building' status
    const snapshot = await base44.asServiceRole.entities.EffectiveBlueprintSnapshot.create({
      client_id: auth.client_id,
      org_role_id, blueprint_id,
      critical_role_id: critical_role_id || null,
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