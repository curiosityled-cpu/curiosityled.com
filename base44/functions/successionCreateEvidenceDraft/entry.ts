import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateEvidenceChain } from "../../shared/successionEvidenceValidator.ts";

/**
 * POST /successionCreateEvidenceDraft
 * Creates a draft EvidenceRecord linked to a candidacy, its bound snapshot,
 * and an exact EffectiveRequirementSnapshot child.
 *
 * Drafts are editable by the submitter until submitted. Once submitted,
 * the record becomes immutable — corrections create a new superseding record.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, candidacy_id, effective_blueprint_snapshot_id,
    effective_requirement_snapshot_id, evidence_type, source_system,
    source_record_id, source_date, title, description, expiration_date,
  } = body;

  if (!operation_id || !candidacy_id || !effective_blueprint_snapshot_id ||
      !effective_requirement_snapshot_id || !evidence_type || !source_system ||
      !source_date || !title || !description) {
    return Response.json({ error: "operation_id, candidacy_id, effective_blueprint_snapshot_id, effective_requirement_snapshot_id, evidence_type, source_system, source_date, title, description required" }, { status: 400 });
  }

  const validTypes = ["performance_outcome","competency_behavior","critical_experience","stretch_assignment","coaching_milestone","development_completion","business_outcome","credential","manager_observation","manual_other"];
  if (!validTypes.includes(evidence_type)) {
    return Response.json({ error: "Invalid evidence_type" }, { status: 400 });
  }
  const validSources = ["curiosity_led", "manual"];
  if (!validSources.includes(source_system)) {
    return Response.json({ error: "Invalid source_system" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCreateEvidenceDraft",
    target_client_id: auth.client_id,
    required_permission: "succession.evidence.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCreateEvidenceDraft",
    payload: { candidacy_id, effective_blueprint_snapshot_id, effective_requirement_snapshot_id, evidence_type, source_system, source_record_id, source_date, title, description, expiration_date },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate the full chain: candidacy → snapshot → requirement ──
    const validation = await validateEvidenceChain(
      base44, auth.client_id, candidacy_id,
      effective_blueprint_snapshot_id, effective_requirement_snapshot_id,
      opResult.operation.id
    );
    if (!validation.valid) {
      await failOperation(base44, opResult.operation.id, validation.error_code);
      return Response.json({ error: validation.error_message }, { status: 409 });
    }

    const { candidacy } = validation;

    const evidence = await base44.asServiceRole.entities.EvidenceRecord.create({
      client_id: auth.client_id,
      candidacy_id,
      user_profile_id: candidacy.user_profile_id,
      critical_role_id: candidacy.critical_role_id,
      effective_blueprint_snapshot_id,
      effective_requirement_snapshot_id,
      evidence_type,
      source_system,
      source_record_id: source_record_id || null,
      source_date,
      title,
      description,
      submitted_by_profile_id: auth.profile_id,
      submitted_at: null,
      freshness_review_date: null,
      expiration_date: expiration_date || null,
      confidentiality_level: "confidential",
      integrity_status: "active",
      status: "draft",
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "evidence_draft_created",
      target_entity_type: "EvidenceRecord", target_entity_id: evidence.id,
      target_user_profile_id: candidacy.user_profile_id,
      metadata: {
        candidacy_id, effective_requirement_snapshot_id,
        evidence_type, source_system,
      },
      operation_id, event_key: { action: "evidence_draft_created", evidence_id: evidence.id },
      event_type: "domain_action_completed", target_record_id: evidence.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      evidence_id: evidence.id, status: "draft",
    });

    return Response.json({
      operation_id, evidence_id: evidence.id, status: "draft",
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "create_evidence_draft_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}