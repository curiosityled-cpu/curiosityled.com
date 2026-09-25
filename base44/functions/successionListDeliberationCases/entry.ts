import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionListDeliberationCases
 *
 * Lists calibration cases for a session (with judgment counts, quorum status)
 * OR readiness conclusions awaiting ratification. Tenant-scoped,
 * integrity_status=active filter, data minimization.
 *
 * Blind judgment suppression: before reveal, each panelist sees only their
 * own judgment. Administrators see completion counts only.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, session_id, list_type, cycle_id } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListDeliberationCases",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionListDeliberationCases",
    payload: { session_id, list_type, cycle_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    const type = list_type || "calibration_cases";

    if (type === "ratification_queue") {
      // ── List conclusions awaiting ratification ──
      const filter: any = {
        client_id: auth.client_id, integrity_status: "active",
        workflow_status: "awaiting_ratification",
      };
      if (cycle_id) filter.cycle_id = cycle_id;

      const conclusions = await base44.asServiceRole.entities.ReadinessConclusion.filter(
        filter, "-proposed_at", 100
      );

      // Data minimization — no rank/score/recommendation fields
      const minimized = conclusions.map(c => ({
        conclusion_id: c.id,
        candidacy_id: c.candidacy_id,
        critical_role_id: c.critical_role_id,
        cycle_id: c.cycle_id,
        version: c.version,
        proposed_value: c.proposed_value,
        calibrated_value: c.calibrated_value,
        proposed_by_profile_id: c.proposed_by_profile_id,
        proposed_at: c.proposed_at,
        workflow_status: c.workflow_status,
        rationale: c.rationale,
        missing_evidence: c.missing_evidence,
        conflicting_evidence: c.conflicting_evidence,
        next_review_date: c.next_review_date,
      }));

      await completeOperation(base44, opResult.operation.id, null, {
        count: minimized.length, list_type: "ratification_queue",
      });

      return Response.json({
        operation_id, list_type: "ratification_queue",
        conclusions: minimized, count: minimized.length,
      });
    }

    // ── Default: list calibration cases for a session ──
    if (!session_id) {
      await failOperation(base44, opResult.operation.id, "session_id_required");
      return Response.json({ error: "session_id required for calibration_cases list_type" }, { status: 400 });
    }

    const cases = await base44.asServiceRole.entities.CalibrationCase.filter({
      session_id, client_id: auth.client_id, integrity_status: "active",
    });

    // For each case, get judgment counts (blind — no judgment values revealed)
    const caseSummaries = [];
    for (const c of cases) {
      const judgments = await base44.asServiceRole.entities.CalibrationJudgment.filter({
        calibration_case_id: c.id, client_id: auth.client_id, integrity_status: "active",
      });

      const eligibleCount = judgments.filter(j => j.eligibility_status === "eligible").length;
      const abstentionCount = judgments.filter(j => j.eligibility_status === "abstained_due_to_coi").length;
      const disqualifiedCount = judgments.filter(j => j.eligibility_status === "disqualified").length;
      const hasMyJudgment = judgments.some(j => j.panelist_profile_id === auth.profile_id);

      caseSummaries.push({
        case_id: c.id,
        candidacy_id: c.candidacy_id,
        readiness_conclusion_id: c.readiness_conclusion_id,
        status: c.status,
        panel_determination: c.panel_determination,
        concurrence_met: c.concurrence_met,
        participating_count: c.participating_count,
        abstention_count: c.abstention_count || abstentionCount,
        minimum_panel_size: c.minimum_panel_size,
        panel_member_count: c.panel_member_profile_ids?.length || 0,
        eligible_judgment_count: eligibleCount,
        disqualified_count: disqualifiedCount,
        has_my_judgment: hasMyJudgment,
        is_panelist: c.panel_member_profile_ids?.includes(auth.profile_id) || false,
        // Blind: no judgment values revealed before finalize
      });
    }

    await completeOperation(base44, opResult.operation.id, null, {
      count: caseSummaries.length, list_type: "calibration_cases",
    });

    return Response.json({
      operation_id, list_type: "calibration_cases",
      session_id, cases: caseSummaries, count: caseSummaries.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "list_deliberation_cases_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}