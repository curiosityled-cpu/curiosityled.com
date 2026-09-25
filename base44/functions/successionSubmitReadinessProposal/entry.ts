import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionSubmitReadinessProposal
 *
 * Submits a draft ReadinessConclusion for calibration. Validates:
 * - rationale is present
 * - if proposed_value !== insufficient_evidence, at least one supporting
 *   citation from accepted/accepted_with_limitations evidence exists
 * - contrary evidence is visibly represented (cited or documented in
 *   conflicting_evidence)
 *
 * Once proposed, conclusion content and citations are frozen.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, conclusion_id } = body;

  if (!operation_id || !conclusion_id) {
    return Response.json({ error: "operation_id, conclusion_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSubmitReadinessProposal",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSubmitReadinessProposal",
    payload: { conclusion_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the conclusion ──
    const conclusion = await validateSameTenantReference(
      base44, "ReadinessConclusion", conclusion_id, auth.client_id
    );
    if (!conclusion) {
      await writeDeniedReferenceEvent(base44, auth, "ReadinessConclusion", conclusion_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "conclusion_not_found");
      return Response.json({ error: "Conclusion not found" }, { status: 404 });
    }

    if (conclusion.workflow_status !== "draft") {
      await failOperation(base44, opResult.operation.id, "conclusion_not_draft");
      return Response.json({ error: "Only draft conclusions may be submitted" }, { status: 409 });
    }

    // ── Validate rationale ──
    if (!conclusion.rationale || !conclusion.rationale.trim()) {
      await failOperation(base44, opResult.operation.id, "rationale_required");
      return Response.json({ error: "Rationale is required to submit a proposal" }, { status: 400 });
    }

    // ── Load citations ──
    const citations = await base44.asServiceRole.entities.ReadinessEvidenceCitation.filter({
      readiness_conclusion_id: conclusion_id, client_id: auth.client_id, integrity_status: "active",
    });

    // ── If proposed_value !== insufficient_evidence, require ≥1 supporting citation ──
    if (conclusion.proposed_value !== "insufficient_evidence") {
      const supporting = citations.filter(c => c.citation_role === "supporting");
      if (supporting.length === 0) {
        await failOperation(base44, opResult.operation.id, "supporting_evidence_required");
        return Response.json({ error: "At least one supporting citation is required for this proposed value" }, { status: 400 });
      }
    }

    // ── Contrary evidence must be visibly represented ──
    const contrary = citations.filter(c => c.citation_role === "contrary");
    if (contrary.length === 0 && (!conclusion.conflicting_evidence || !conclusion.conflicting_evidence.trim())) {
      // If there is no contrary citation, conflicting_evidence must document why
      // This is a soft check — we allow it but warn. Only block if there ARE contrary
      // citations that haven't been documented. Actually per the rules: "Contrary
      // evidence must be visibly represented." If there is none cited, the proposer
      // should document in conflicting_evidence that no contrary evidence exists.
      // We enforce: either contrary citations exist OR conflicting_evidence is filled.
      await failOperation(base44, opResult.operation.id, "contrary_evidence_not_represented");
      return Response.json({ error: "Contrary evidence must be visibly represented (cite contrary evidence or document in conflicting evidence)" }, { status: 400 });
    }

    // ── Set status to proposed ──
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.ReadinessConclusion.update(conclusion_id, {
      workflow_status: "proposed",
      proposed_at: now,
    });

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "readiness_proposal_submitted",
      target_entity_type: "ReadinessConclusion", target_entity_id: conclusion_id,
      metadata: {
        candidacy_id: conclusion.candidacy_id,
        proposed_value: conclusion.proposed_value,
        version: conclusion.version,
        citation_count: citations.length,
        supporting_count: citations.filter(c => c.citation_role === "supporting").length,
        contrary_count: contrary.length,
      },
      operation_id, event_key: { action: "readiness_proposal_submitted", conclusion_id },
      event_type: "domain_action_completed", target_record_id: conclusion_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      conclusion_id, status: "proposed",
    });

    return Response.json({
      operation_id, conclusion_id, status: "proposed",
      citation_count: citations.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "submit_readiness_proposal_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}