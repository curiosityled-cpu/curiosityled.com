import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { validateMappingTarget, computeMappingFingerprint, LEADERSHIP_INDEX_FRAMEWORK_VERSION } from "../../shared/successionLeadershipIndexValidator.ts";

/**
 * POST /successionSaveLeadershipIndexMappingDraft
 *
 * Creates a new draft mapping or updates an existing draft. Only draft mappings
 * are editable by the creator. Submitted mappings are locked.
 */

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, mapping_id, assessment_definition_id, assessment_framework_version,
    assessment_leadership_level, competency_id, competency_key,
    effective_blueprint_snapshot_id, effective_requirement_snapshot_id, mapping_rationale } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSaveLeadershipIndexMappingDraft",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSaveLeadershipIndexMappingDraft",
    payload: body,
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const now = new Date().toISOString();

    // If updating an existing draft
    if (mapping_id) {
      const existing = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({ id: mapping_id, client_id: cid });
      if (existing.length === 0) { await failOperation(base44, opResult.operation.id, "mapping_not_found"); return Response.json({ error: "Mapping not found" }, { status: 404 }); }
      const m = existing[0];
      if (m.status !== "draft") { await failOperation(base44, opResult.operation.id, "mapping_not_draft"); return Response.json({ error: "Only draft mappings can be updated" }, { status: 400 }); }

      // Validate target requirement if changed
      if (effective_requirement_snapshot_id && effective_blueprint_snapshot_id) {
        const targetValidation = await validateMappingTarget(base44, cid, effective_blueprint_snapshot_id, effective_requirement_snapshot_id);
        if (!targetValidation.valid) { await failOperation(base44, opResult.operation.id, targetValidation.error_code); return Response.json({ error: targetValidation.error_message }, { status: 400 }); }
      }

      const update: any = { integrity_status: "active" };
      if (assessment_leadership_level) update.assessment_leadership_level = assessment_leadership_level;
      if (competency_id) update.competency_id = competency_id;
      if (competency_key) update.competency_key = competency_key;
      if (effective_blueprint_snapshot_id) update.effective_blueprint_snapshot_id = effective_blueprint_snapshot_id;
      if (effective_requirement_snapshot_id) update.effective_requirement_snapshot_id = effective_requirement_snapshot_id;
      if (mapping_rationale) update.mapping_rationale = mapping_rationale;
      if (assessment_framework_version) update.assessment_framework_version = assessment_framework_version;

      await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.update(mapping_id, update);

      await writeSuccessionAuditEvent({
        base44, action_type: "li_mapping_draft_updated",
        target_entity_type: "LeadershipIndexRequirementMapping", target_entity_id: mapping_id,
        metadata: { mapping_id },
        operation_id,
      });

      await completeOperation(base44, opResult.operation.id, null, { mapping_id, action: "updated" });
      return Response.json({ operation_id, mapping_id, action: "updated" });
    }

    // ── Create new draft ──
    if (!assessment_definition_id || !assessment_leadership_level || !competency_id || !competency_key ||
        !effective_blueprint_snapshot_id || !effective_requirement_snapshot_id || !mapping_rationale) {
      await failOperation(base44, opResult.operation.id, "missing_required_fields");
      return Response.json({ error: "assessment_definition_id, assessment_leadership_level, competency_id, competency_key, effective_blueprint_snapshot_id, effective_requirement_snapshot_id, mapping_rationale required" }, { status: 400 });
    }

    // Use derived framework version if not provided
    const fwVersion = assessment_framework_version || LEADERSHIP_INDEX_FRAMEWORK_VERSION;

    // Validate target requirement
    const targetValidation = await validateMappingTarget(base44, cid, effective_blueprint_snapshot_id, effective_requirement_snapshot_id);
    if (!targetValidation.valid) { await failOperation(base44, opResult.operation.id, targetValidation.error_code); return Response.json({ error: targetValidation.error_message }, { status: 400 }); }

    // Check for existing current approved mapping with the same fingerprint
    const fingerprint = computeMappingFingerprint(cid, assessment_definition_id, fwVersion, assessment_leadership_level, competency_id, effective_requirement_snapshot_id);
    const existingMappings = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({
      client_id: cid,
      assessment_definition_id,
      assessment_framework_version: fwVersion,
      assessment_leadership_level,
      competency_id,
      effective_requirement_snapshot_id,
      is_current: true,
    });

    const existingApproved = existingMappings.find((m: any) => m.status === "approved");
    if (existingApproved) { await failOperation(base44, opResult.operation.id, "current_approved_exists"); return Response.json({ error: "A current approved mapping already exists for this source competency + framework version + leadership level + target requirement" }, { status: 409 }); }

    const existingDraft = existingMappings.find((m: any) => m.status === "draft");
    if (existingDraft) { await failOperation(base44, opResult.operation.id, "draft_already_exists"); return Response.json({ error: "A draft mapping already exists for this combination. Update it instead." }, { status: 409 }); }

    // Determine version number (increment from any existing retired/approved)
    const allVersions = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({
      client_id: cid,
      assessment_definition_id,
      assessment_framework_version: fwVersion,
      assessment_leadership_level,
      competency_id,
      effective_requirement_snapshot_id,
    });
    const maxVersion = allVersions.reduce((max: number, m: any) => Math.max(max, m.version_number || 0), 0);
    const versionNumber = maxVersion + 1;

    const mapping = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.create({
      client_id: cid,
      assessment_definition_id,
      assessment_framework_version: fwVersion,
      assessment_leadership_level,
      competency_id,
      competency_key,
      effective_blueprint_snapshot_id,
      effective_requirement_snapshot_id,
      version_number: versionNumber,
      mapping_rationale,
      status: "draft",
      is_current: true,
      operation_id,
      created_by_profile_id: auth.profile_id,
      created_at: now,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    await writeSuccessionAuditEvent({
      base44, action_type: "li_mapping_draft_created",
      target_entity_type: "LeadershipIndexRequirementMapping", target_entity_id: mapping.id,
      metadata: { mapping_id: mapping.id, version_number: versionNumber, fingerprint },
      operation_id,
    });

    await completeOperation(base44, opResult.operation.id, null, { mapping_id: mapping.id, version_number: versionNumber });

    return Response.json({ operation_id, mapping_id: mapping.id, version_number: versionNumber, status: "draft" });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "save_mapping_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}