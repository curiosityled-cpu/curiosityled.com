import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { computePayloadHash } from "../../shared/successionPayloadCanonical.ts";
import { isSnapshotOperationallyBlocked } from "../../shared/successionAssignmentRules.ts";

/**
 * POST /successionPreviewEffectiveBlueprint
 * Previews the effective blueprint for a role (optionally a critical role) WITHOUT persisting a snapshot.
 * Merges canonical RoleRequirements from the approved blueprint with applicable approved CriticalRoleRequirements.
 * Returns the merged requirement set and content hash for review. Does NOT create an EffectiveBlueprintSnapshot.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, org_role_id, critical_role_id } = body;

  if (!operation_id || !org_role_id) {
    return Response.json({ error: "operation_id, org_role_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });
  const authz = await authorizeSuccessionAction({ base44, auth, action: "successionPreviewEffectiveBlueprint", target_client_id: auth.client_id, required_permission: "succession.roles.view" });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({ base44, client_id: auth.client_id, operation_id, function_name: "successionPreviewEffectiveBlueprint", payload: { org_role_id, critical_role_id }, actor_profile_id: auth.profile_id, actor_email: auth.email, actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant" });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const orgRole = await validateSameTenantReference(base44, "OrgRole", org_role_id, auth.client_id);
    if (!orgRole) { await writeDeniedReferenceEvent(base44, auth, "OrgRole", org_role_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "org_role_not_found"); return Response.json({ error: "OrgRole not found" }, { status: 404 }); }

    // Must have an approved current blueprint
    if (!orgRole.current_blueprint_id) { await failOperation(base44, opResult.operation.id, "no_approved_blueprint"); return Response.json({ error: "OrgRole has no approved current blueprint" }, { status: 409 }); }

    const blueprints = await base44.asServiceRole.entities.RoleSuccessBlueprint.filter({ id: orgRole.current_blueprint_id, client_id: auth.client_id });
    if (blueprints.length === 0 || blueprints[0].status !== "approved" || !blueprints[0].is_current) { await failOperation(base44, opResult.operation.id, "blueprint_not_current_approved"); return Response.json({ error: "Current blueprint is not approved" }, { status: 409 }); }
    const blueprint = blueprints[0];

    // Check for blocking snapshot integrity incidents
    const incidents = await base44.asServiceRole.entities.SnapshotIntegrityIncident.filter({ client_id: auth.client_id, snapshot_id: { $exists: true } });
    if (isSnapshotOperationallyBlocked(incidents)) { await failOperation(base44, opResult.operation.id, "snapshot_operationally_blocked"); return Response.json({ error: "Snapshot operations are blocked by an open integrity incident" }, { status: 409 }); }

    // Gather canonical RoleRequirements from the approved blueprint
    const canonicalReqs = await base44.asServiceRole.entities.RoleRequirement.filter({
      client_id: auth.client_id, blueprint_id: blueprint.id, status: "approved", integrity_status: "active",
    });

    // Gather applicable approved CriticalRoleRequirements (position-specific)
    let positionReqs: any[] = [];
    if (critical_role_id) {
      const critRole = await validateSameTenantReference(base44, "CriticalRole", critical_role_id, auth.client_id);
      if (!critRole) { await writeDeniedReferenceEvent(base44, auth, "CriticalRole", critical_role_id, "cross_tenant_or_not_found"); await failOperation(base44, opResult.operation.id, "critical_role_not_found"); return Response.json({ error: "CriticalRole not found" }, { status: 404 }); }

      positionReqs = await base44.asServiceRole.entities.CriticalRoleRequirement.filter({
        client_id: auth.client_id, critical_role_id, status: "approved", applicability_status: "applicable", integrity_status: "active",
      });
    }

    // Merge: canonical requirements, with position-specific modifications/exceptions applied
    const effectiveRequirements = canonicalReqs.map((r: any) => ({
      source_type: "canonical",
      source_requirement_id: r.id,
      base_requirement_id: r.id,
      base_blueprint_id: blueprint.id,
      base_blueprint_version_number: orgRole.blueprint_approval_revision,
      modification_type: "canonical",
      effective_language: r.requirement_text,
      effective_level: r.requirement_detail || null,
      applicability_status: "applicable",
      exception_approval_status: "none",
    }));

    // Apply position-specific modifications/exceptions
    for (const pr of positionReqs) {
      if (pr.modification_type === "new_requirement") {
        effectiveRequirements.push({
          source_type: "position_specific", source_requirement_id: pr.id,
          base_requirement_id: null, base_blueprint_id: blueprint.id, base_blueprint_version_number: orgRole.blueprint_approval_revision,
          modification_type: "new_requirement", effective_language: pr.requirement_text, effective_level: pr.requirement_detail || null,
          applicability_status: "applicable", exception_approval_status: "none",
        });
      } else if (pr.modification_type === "modification") {
        const idx = effectiveRequirements.findIndex(e => e.source_requirement_id === pr.base_requirement_id);
        if (idx >= 0) {
          effectiveRequirements[idx] = {
            ...effectiveRequirements[idx],
            source_type: "position_specific", source_requirement_id: pr.id,
            modification_type: "modification",
            effective_language: pr.requirement_text, effective_level: pr.requirement_detail || effectiveRequirements[idx].effective_level,
          };
        }
      } else if (pr.modification_type === "approved_exception") {
        const idx = effectiveRequirements.findIndex(e => e.source_requirement_id === pr.base_requirement_id);
        if (idx >= 0) {
          effectiveRequirements[idx].exception_approval_status = "approved";
          effectiveRequirements[idx].applicability_status = "excepted";
          effectiveRequirements[idx].effective_language += ` [EXCEPTION: ${pr.requirement_text}]`;
        }
      } else if (pr.modification_type === "not_applicable") {
        const idx = effectiveRequirements.findIndex(e => e.source_requirement_id === pr.base_requirement_id);
        if (idx >= 0) {
          effectiveRequirements[idx].applicability_status = "not_applicable";
          effectiveRequirements[idx].exception_approval_status = "approved";
        }
      }
    }

    const content_hash = await computePayloadHash(effectiveRequirements);

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "effective_blueprint_previewed", target_entity_type: "OrgRole", target_entity_id: org_role_id,
      metadata: { org_role_id, critical_role_id, blueprint_id: blueprint.id, canonical_count: canonicalReqs.length, position_specific_count: positionReqs.length, content_hash },
      operation_id, event_key: { action: "effective_blueprint_previewed", org_role_id, critical_role_id: critical_role_id || "none" },
      event_type: "domain_action_completed", target_record_id: org_role_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      org_role_id, critical_role_id: critical_role_id || null, canonical_count: canonicalReqs.length, position_specific_count: positionReqs.length, content_hash, preview_only: true,
    });

    return Response.json({
      operation_id, preview: true,
      org_role_id, critical_role_id: critical_role_id || null,
      blueprint_id: blueprint.id, blueprint_revision: orgRole.blueprint_approval_revision,
      effective_requirements: effectiveRequirements,
      canonical_count: canonicalReqs.length,
      position_specific_count: positionReqs.length,
      requirements_content_hash: content_hash,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "preview_effective_blueprint_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}