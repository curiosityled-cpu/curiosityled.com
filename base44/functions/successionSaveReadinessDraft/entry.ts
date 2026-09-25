import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateConclusionChain, validateCitationEvidence, buildCitationSnapshot } from "../../shared/successionReadinessValidator.ts";

/**
 * POST /successionSaveReadinessDraft
 *
 * Securely creates or edits a draft ReadinessConclusion with inline citations
 * and conditions. Once the conclusion is proposed (via successionSubmitReadinessProposal),
 * the conclusion content and citations are frozen — they cannot be edited.
 *
 * Reconsideration creates a new version using supersedes_conclusion_id.
 *
 * If conclusion_id is provided and the conclusion is in draft status, this
 * function updates the draft (replacing citations and conditions).
 * If no conclusion_id is provided, a new draft is created.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const {
    operation_id, conclusion_id, candidacy_id, effective_blueprint_snapshot_id,
    proposed_value, missing_evidence, conflicting_evidence, rationale,
    transition_horizon, supersedes_conclusion_id,
    citations, conditions,
  } = body;

  if (!operation_id || !candidacy_id || !effective_blueprint_snapshot_id || !proposed_value) {
    return Response.json({ error: "operation_id, candidacy_id, effective_blueprint_snapshot_id, proposed_value required" }, { status: 400 });
  }

  const validValues = ["ready_now", "ready_with_conditions", "emerging", "insufficient_evidence", "not_aligned_now"];
  if (!validValues.includes(proposed_value)) {
    return Response.json({ error: "Invalid proposed_value" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSaveReadinessDraft",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSaveReadinessDraft",
    payload: { conclusion_id, candidacy_id, effective_blueprint_snapshot_id, proposed_value, missing_evidence, conflicting_evidence, rationale, transition_horizon, supersedes_conclusion_id, citations, conditions },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate the conclusion chain ──
    const chain = await validateConclusionChain(
      base44, auth.client_id, candidacy_id, effective_blueprint_snapshot_id, opResult.operation.id
    );
    if (!chain.valid) {
      await failOperation(base44, opResult.operation.id, chain.error_code);
      return Response.json({ error: chain.error_message }, { status: 409 });
    }

    const { candidacy } = chain;

    // ── Validate all citations (if provided) ──
    // All cited evidence — including contrary and contextual — must be
    // accepted or accepted_with_limitations, current, active, same-candidacy,
    // same-snapshot, and linked to an exact frozen requirement.
    let validatedCitations = [];
    if (citations && Array.isArray(citations) && citations.length > 0) {
      for (const cite of citations) {
        if (!cite.evidence_record_id || !cite.effective_requirement_snapshot_id || !cite.citation_role) {
          await failOperation(base44, opResult.operation.id, "invalid_citation");
          return Response.json({ error: "Each citation requires evidence_record_id, effective_requirement_snapshot_id, citation_role" }, { status: 400 });
        }
        const validRoles = ["supporting", "contrary", "contextual"];
        if (!validRoles.includes(cite.citation_role)) {
          await failOperation(base44, opResult.operation.id, "invalid_citation_role");
          return Response.json({ error: "Invalid citation_role" }, { status: 400 });
        }

        const citeValidation = await validateCitationEvidence(
          base44, auth.client_id, cite.evidence_record_id,
          candidacy_id, effective_blueprint_snapshot_id, cite.effective_requirement_snapshot_id,
          opResult.operation.id
        );
        if (!citeValidation.valid) {
          await failOperation(base44, opResult.operation.id, citeValidation.error_code);
          return Response.json({ error: citeValidation.error_message }, { status: 409 });
        }
        validatedCitations.push({
          evidence_record_id: cite.evidence_record_id,
          effective_requirement_snapshot_id: cite.effective_requirement_snapshot_id,
          citation_role: cite.citation_role,
          citation_notes: cite.citation_notes || null,
          ...buildCitationSnapshot(citeValidation.evidence, citeValidation.latest_review),
        });
      }
    }

    // ── Validate conditions (if provided) ──
    let validatedConditions = [];
    if (conditions && Array.isArray(conditions) && conditions.length > 0) {
      for (const cond of conditions) {
        if (!cond.condition_text || !cond.owner_profile_id || !cond.required_by_date) {
          await failOperation(base44, opResult.operation.id, "invalid_condition");
          return Response.json({ error: "Each condition requires condition_text, owner_profile_id, required_by_date" }, { status: 400 });
        }
        validatedConditions.push({
          condition_text: cond.condition_text,
          owner_profile_id: cond.owner_profile_id,
          required_by_date: cond.required_by_date,
        });
      }
    }

    // ── Determine version ──
    let version = 1;
    if (supersedes_conclusion_id) {
      const priorConclusions = await base44.asServiceRole.entities.ReadinessConclusion.filter({
        id: supersedes_conclusion_id, client_id: auth.client_id,
      });
      if (priorConclusions.length === 0) {
        await failOperation(base44, opResult.operation.id, "prior_conclusion_not_found");
        return Response.json({ error: "Prior conclusion not found for supersede" }, { status: 404 });
      }
      version = (priorConclusions[0].version || 1) + 1;
    }

    // ── Create or update the draft conclusion ──
    let conclusion;
    if (conclusion_id) {
      // Edit existing draft
      const existing = await base44.asServiceRole.entities.ReadinessConclusion.filter({
        id: conclusion_id, client_id: auth.client_id,
      });
      if (existing.length === 0) {
        await failOperation(base44, opResult.operation.id, "conclusion_not_found");
        return Response.json({ error: "Conclusion not found" }, { status: 404 });
      }
      if (existing[0].workflow_status !== "draft") {
        await failOperation(base44, opResult.operation.id, "conclusion_not_editable");
        return Response.json({ error: "Only draft conclusions may be edited" }, { status: 409 });
      }
      await base44.asServiceRole.entities.ReadinessConclusion.update(conclusion_id, {
        proposed_value, missing_evidence: missing_evidence || null,
        conflicting_evidence: conflicting_evidence || null,
        rationale: rationale || null, transition_horizon: transition_horizon || null,
      });
      conclusion = existing[0];

      // Replace existing citations (delete old, create new)
      const oldCitations = await base44.asServiceRole.entities.ReadinessEvidenceCitation.filter({
        readiness_conclusion_id: conclusion_id, client_id: auth.client_id,
      });
      for (const oc of oldCitations) {
        await base44.asServiceRole.entities.ReadinessEvidenceCitation.delete(oc.id);
      }
      // Replace existing conditions
      const oldConditions = await base44.asServiceRole.entities.ReadinessCondition.filter({
        readiness_conclusion_id: conclusion_id, client_id: auth.client_id,
      });
      for (const oc of oldConditions) {
        await base44.asServiceRole.entities.ReadinessCondition.delete(oc.id);
      }
    } else {
      // Create new draft
      conclusion = await base44.asServiceRole.entities.ReadinessConclusion.create({
        client_id: auth.client_id,
        candidacy_id,
        critical_role_id: candidacy.critical_role_id,
        cycle_id: candidacy.cycle_id,
        effective_blueprint_snapshot_id,
        version,
        proposed_value,
        calibrated_value: null,
        ratified_value: null,
        proposed_by_profile_id: auth.profile_id,
        proposed_at: null,
        missing_evidence: missing_evidence || null,
        conflicting_evidence: conflicting_evidence || null,
        rationale: rationale || null,
        next_review_date: null,
        transition_horizon: transition_horizon || null,
        workflow_status: "draft",
        supersedes_conclusion_id: supersedes_conclusion_id || null,
        confidentiality_level: "confidential",
        integrity_status: "active",
      });
    }

    // ── Create citations ──
    for (const vc of validatedCitations) {
      await base44.asServiceRole.entities.ReadinessEvidenceCitation.create({
        client_id: auth.client_id,
        readiness_conclusion_id: conclusion.id,
        evidence_record_id: vc.evidence_record_id,
        effective_requirement_snapshot_id: vc.effective_requirement_snapshot_id,
        citation_role: vc.citation_role,
        snapshot_evidence_type: vc.snapshot_evidence_type,
        snapshot_strength: vc.snapshot_strength,
        snapshot_confidence: vc.snapshot_confidence,
        snapshot_relevance: vc.snapshot_relevance,
        snapshot_status: vc.snapshot_status,
        snapshot_source_date: vc.snapshot_source_date,
        snapshot_review_decision_id: vc.snapshot_review_decision_id,
        citation_notes: vc.citation_notes,
        confidentiality_level: "confidential",
        integrity_status: "active",
      });
    }

    // ── Create conditions ──
    for (const cond of validatedConditions) {
      await base44.asServiceRole.entities.ReadinessCondition.create({
        client_id: auth.client_id,
        readiness_conclusion_id: conclusion.id,
        condition_text: cond.condition_text,
        owner_profile_id: cond.owner_profile_id,
        required_by_date: cond.required_by_date,
        status: "open",
        confidentiality_level: "confidential",
        integrity_status: "active",
      });
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "readiness_draft_saved",
      target_entity_type: "ReadinessConclusion", target_entity_id: conclusion.id,
      metadata: {
        candidacy_id, version, proposed_value,
        citation_count: validatedCitations.length,
        condition_count: validatedConditions.length,
        is_edit: !!conclusion_id,
      },
      operation_id, event_key: { action: "readiness_draft_saved", conclusion_id: conclusion.id },
      event_type: "domain_action_completed", target_record_id: conclusion.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      conclusion_id: conclusion.id, version, status: "draft",
    });

    return Response.json({
      operation_id, conclusion_id: conclusion.id, version, status: "draft",
      citation_count: validatedCitations.length,
      condition_count: validatedConditions.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "save_readiness_draft_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}