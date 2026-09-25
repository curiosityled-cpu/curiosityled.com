import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { validateMappingTarget } from "../../shared/successionLeadershipIndexValidator.ts";

/**
 * POST /successionApproveLeadershipIndexMapping
 *
 * Submits (if draft) and approves a mapping. The submitter cannot approve
 * their own mapping (separation of duties). The approver must have
 * succession.evidence.manage permission. Approved mappings are immutable.
 * Only one current approved version may exist per source competency +
 * framework version + leadership level + target requirement.
 *
 * If submit=true and approve=false, only submits the draft.
 * If approve=true, submits (if draft) and then approves (if different actor).
 */

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, mapping_id, submit, approve } = body;

  if (!operation_id || !mapping_id) return Response.json({ error: "operation_id and mapping_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionApproveLeadershipIndexMapping",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionApproveLeadershipIndexMapping",
    payload: { mapping_id, submit, approve },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const now = new Date().toISOString();

    // Load mapping
    const mappings = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({ id: mapping_id, client_id: cid });
    if (mappings.length === 0) { await failOperation(base44, opResult.operation.id, "mapping_not_found"); return Response.json({ error: "Mapping not found" }, { status: 404 }); }
    const mapping = mappings[0];

    // ── Submit phase (if submit=true) ──
    if (submit && mapping.status === "draft") {
      // Validate target requirement is still valid
      const targetValidation = await validateMappingTarget(base44, cid, mapping.effective_blueprint_snapshot_id, mapping.effective_requirement_snapshot_id);
      if (!targetValidation.valid) { await failOperation(base44, opResult.operation.id, targetValidation.error_code); return Response.json({ error: targetValidation.error_message }, { status: 400 }); }

      await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.update(mapping_id, {
        status: "submitted",
        submitted_by_profile_id: auth.profile_id,
        submitted_at: now,
      });

      await writeSuccessionAuditEvent({
        base44, action_type: "li_mapping_submitted",
        target_entity_type: "LeadershipIndexRequirementMapping", target_entity_id: mapping_id,
        metadata: { mapping_id, version_number: mapping.version_number },
        operation_id,
      });

      // If only submitting (not approving), return here
      if (!approve) {
        await completeOperation(base44, opResult.operation.id, null, { mapping_id, status: "submitted" });
        return Response.json({ operation_id, mapping_id, status: "submitted" });
      }

      // Reload the mapping after submit
      mapping.status = "submitted";
      mapping.submitted_by_profile_id = auth.profile_id;
    }

    // ── Approve phase (if approve=true) ──
    if (approve) {
      if (mapping.status !== "submitted" && mapping.status !== "draft") {
        await failOperation(base44, opResult.operation.id, "mapping_not_submittable");
        return Response.json({ error: "Mapping must be draft or submitted to approve" }, { status: 400 });
      }

      // If still draft, submit first
      if (mapping.status === "draft") {
        const targetValidation = await validateMappingTarget(base44, cid, mapping.effective_blueprint_snapshot_id, mapping.effective_requirement_snapshot_id);
        if (!targetValidation.valid) { await failOperation(base44, opResult.operation.id, targetValidation.error_code); return Response.json({ error: targetValidation.error_message }, { status: 400 }); }

        await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.update(mapping_id, {
          status: "submitted",
          submitted_by_profile_id: auth.profile_id,
          submitted_at: now,
        });
        mapping.status = "submitted";
        mapping.submitted_by_profile_id = auth.profile_id;
      }

      // SoD: submitter cannot approve their own mapping
      if (mapping.submitted_by_profile_id === auth.profile_id) {
        await failOperation(base44, opResult.operation.id, "sod_self_approval");
        return Response.json({ error: "Submitter cannot approve their own mapping (separation of duties)" }, { status: 403 });
      }

      // Check for existing current approved mapping with the same combination
      const existing = await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.filter({
        client_id: cid,
        assessment_definition_id: mapping.assessment_definition_id,
        assessment_framework_version: mapping.assessment_framework_version,
        assessment_leadership_level: mapping.assessment_leadership_level,
        competency_id: mapping.competency_id,
        effective_requirement_snapshot_id: mapping.effective_requirement_snapshot_id,
        status: "approved",
        is_current: true,
      });
      const otherApproved = existing.find((m: any) => m.id !== mapping_id);
      if (otherApproved) {
        // Retire the old one (create new version)
        await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.update(otherApproved.id, {
          is_current: false,
          status: "retired",
          retired_by_profile_id: auth.profile_id,
          retired_at: now,
          retirement_reason: `Superseded by new approved version ${mapping.version_number}`,
        });
      }

      // Approve
      await base44.asServiceRole.entities.LeadershipIndexRequirementMapping.update(mapping_id, {
        status: "approved",
        approved_by_profile_id: auth.profile_id,
        approved_at: now,
        is_current: true,
        integrity_status: "active",
      });

      await writeSuccessionAuditEvent({
        base44, action_type: "li_mapping_approved",
        target_entity_type: "LeadershipIndexRequirementMapping", target_entity_id: mapping_id,
        metadata: { mapping_id, version_number: mapping.version_number, approved_by: auth.profile_id },
        operation_id,
      });

      await completeOperation(base44, opResult.operation.id, null, { mapping_id, status: "approved" });
      return Response.json({ operation_id, mapping_id, status: "approved" });
    }

    await completeOperation(base44, opResult.operation.id, null, { mapping_id, status: mapping.status });
    return Response.json({ operation_id, mapping_id, status: mapping.status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "approve_mapping_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}