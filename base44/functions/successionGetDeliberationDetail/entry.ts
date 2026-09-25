import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionGetDeliberationDetail
 *
 * Returns full detail for a readiness conclusion: conclusion + citations
 * (with frozen snapshots) + conditions + calibration case + judgments
 * (blind-suppressed) + governance approvals.
 *
 * Blind judgment suppression: before reveal, each panelist sees only their
 * own judgment. Administrators see completion counts only — judgment_value
 * is suppressed for all judgments until the case is revealed.
 *
 * Data minimization: no rank/score/recommendation fields.
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
    base44, auth, action: "successionGetDeliberationDetail",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionGetDeliberationDetail",
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

    // ── Load citations (with frozen snapshots) ──
    const citations = await base44.asServiceRole.entities.ReadinessEvidenceCitation.filter({
      readiness_conclusion_id: conclusion_id, client_id: auth.client_id, integrity_status: "active",
    });

    // ── Load conditions ──
    const conditions = await base44.asServiceRole.entities.ReadinessCondition.filter({
      readiness_conclusion_id: conclusion_id, client_id: auth.client_id, integrity_status: "active",
    });

    // ── Load calibration case ──
    const cases = await base44.asServiceRole.entities.CalibrationCase.filter({
      readiness_conclusion_id: conclusion_id, client_id: auth.client_id, integrity_status: "active",
    });
    const calCase = cases.length > 0 ? cases[0] : null;

    // ── Load judgments (with blind suppression) ──
    let judgments: any[] = [];
    let judgmentSummary = null;
    if (calCase) {
      const allJudgments = await base44.asServiceRole.entities.CalibrationJudgment.filter({
        calibration_case_id: calCase.id, client_id: auth.client_id, integrity_status: "active",
      });

      const isRevealed = calCase.status === "revealed" || calCase.status === "decision_recorded";

      if (isRevealed) {
        // After reveal, show all judgments
        judgments = allJudgments.map(j => ({
          judgment_id: j.id,
          panelist_profile_id: j.panelist_profile_id,
          eligibility_status: j.eligibility_status,
          coi_disclosed: j.coi_disclosed,
          judgment_value: j.judgment_value,
          judgment_notes: j.judgment_notes,
          recorded_at: j.recorded_at,
        }));
      } else {
        // Before reveal: each panelist sees only their own judgment.
        // Administrators see completion counts only — judgment_value suppressed.
        judgments = allJudgments.map(j => {
          if (j.panelist_profile_id === auth.profile_id) {
            // Panelist sees their own judgment
            return {
              judgment_id: j.id,
              panelist_profile_id: j.panelist_profile_id,
              eligibility_status: j.eligibility_status,
              coi_disclosed: j.coi_disclosed,
              judgment_value: j.judgment_value,
              judgment_notes: j.judgment_notes,
              recorded_at: j.recorded_at,
              is_own: true,
            };
          }
          // Others: suppress judgment_value and notes
          return {
            judgment_id: j.id,
            panelist_profile_id: j.panelist_profile_id,
            eligibility_status: j.eligibility_status,
            coi_disclosed: j.coi_disclosed,
            judgment_value: null, // BLIND SUPPRESSION
            judgment_notes: null,
            recorded_at: j.recorded_at,
            is_own: false,
          };
        });
      }

      judgmentSummary = {
        total: allJudgments.length,
        eligible: allJudgments.filter(j => j.eligibility_status === "eligible").length,
        abstained: allJudgments.filter(j => j.eligibility_status === "abstained_due_to_coi").length,
        disqualified: allJudgments.filter(j => j.eligibility_status === "disqualified").length,
        is_revealed: isRevealed,
      };
    }

    // ── Load governance approvals ──
    const approvals = await base44.asServiceRole.entities.GovernanceApproval.filter({
      readiness_conclusion_id: conclusion_id, client_id: auth.client_id, integrity_status: "active",
    }, "decided_at");

    // ── Data minimization: no rank/score/recommendation fields ──
    const detail = {
      conclusion: {
        conclusion_id: conclusion.id,
        candidacy_id: conclusion.candidacy_id,
        critical_role_id: conclusion.critical_role_id,
        cycle_id: conclusion.cycle_id,
        effective_blueprint_snapshot_id: conclusion.effective_blueprint_snapshot_id,
        version: conclusion.version,
        proposed_value: conclusion.proposed_value,
        calibrated_value: conclusion.calibrated_value,
        ratified_value: conclusion.ratified_value,
        proposed_by_profile_id: conclusion.proposed_by_profile_id,
        proposed_at: conclusion.proposed_at,
        missing_evidence: conclusion.missing_evidence,
        conflicting_evidence: conclusion.conflicting_evidence,
        rationale: conclusion.rationale,
        next_review_date: conclusion.next_review_date,
        transition_horizon: conclusion.transition_horizon,
        workflow_status: conclusion.workflow_status,
        supersedes_conclusion_id: conclusion.supersedes_conclusion_id,
      },
      citations: citations.map(c => ({
        citation_id: c.id,
        evidence_record_id: c.evidence_record_id,
        effective_requirement_snapshot_id: c.effective_requirement_snapshot_id,
        citation_role: c.citation_role,
        snapshot_evidence_type: c.snapshot_evidence_type,
        snapshot_strength: c.snapshot_strength,
        snapshot_confidence: c.snapshot_confidence,
        snapshot_relevance: c.snapshot_relevance,
        snapshot_status: c.snapshot_status,
        snapshot_source_date: c.snapshot_source_date,
        snapshot_review_decision_id: c.snapshot_review_decision_id,
        citation_notes: c.citation_notes,
      })),
      conditions: conditions.map(c => ({
        condition_id: c.id,
        condition_text: c.condition_text,
        owner_profile_id: c.owner_profile_id,
        required_by_date: c.required_by_date,
        status: c.status,
        waiver_reason: c.waiver_reason,
      })),
      calibration_case: calCase ? {
        case_id: calCase.id,
        session_id: calCase.session_id,
        status: calCase.status,
        panel_determination: calCase.panel_determination,
        dissent: calCase.dissent,
        concurrence_met: calCase.concurrence_met,
        participating_count: calCase.participating_count,
        abstention_count: calCase.abstention_count,
        minimum_panel_size: calCase.minimum_panel_size,
        panel_member_profile_ids: calCase.panel_member_profile_ids,
        is_panelist: calCase.panel_member_profile_ids?.includes(auth.profile_id) || false,
      } : null,
      judgment_summary: judgmentSummary,
      judgments: judgments,
      governance_approvals: approvals.map(a => ({
        approval_id: a.id,
        approver_profile_id: a.approver_profile_id,
        decision: a.decision,
        override_value: a.override_value,
        rationale: a.rationale,
        next_review_date: a.next_review_date,
        decided_at: a.decided_at,
      })),
    };

    await completeOperation(base44, opResult.operation.id, null, {
      conclusion_id, has_calibration: !!calCase,
    });

    return Response.json({ operation_id, detail });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "get_deliberation_detail_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}