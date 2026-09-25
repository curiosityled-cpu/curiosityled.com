import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionFinalizeCalibrationCase
 *
 * Reveals all judgments (revealed=true). Counts eligible participating
 * (eligible + judgment_value not null). If <quorum → panel_determination=
 * no_quorum. If quorum met → computes majority judgment_value as
 * panel_determination. If no majority → no_concurrence.
 *
 * no_quorum and no_concurrence do NOT populate calibrated_value or advance
 * the conclusion to awaiting_ratification.
 *
 * If quorum + concurrence met → sets calibrated_value, advances conclusion
 * to awaiting_ratification.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, calibration_case_id } = body;

  if (!operation_id || !calibration_case_id) {
    return Response.json({ error: "operation_id, calibration_case_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionFinalizeCalibrationCase",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionFinalizeCalibrationCase",
    payload: { calibration_case_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the case ──
    const calCase = await validateSameTenantReference(
      base44, "CalibrationCase", calibration_case_id, auth.client_id
    );
    if (!calCase) {
      await writeDeniedReferenceEvent(base44, auth, "CalibrationCase", calibration_case_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "case_not_found");
      return Response.json({ error: "Calibration case not found" }, { status: 404 });
    }

    if (calCase.status !== "open" && calCase.status !== "judgments_recorded") {
      await failOperation(base44, opResult.operation.id, "case_not_open");
      return Response.json({ error: "This case is already finalized" }, { status: 409 });
    }

    // ── Load session for quorum ──
    const session = await validateSameTenantReference(
      base44, "CalibrationSession", calCase.session_id, auth.client_id
    );
    if (!session) {
      await failOperation(base44, opResult.operation.id, "session_not_found");
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // ── Load all judgments ──
    const judgments = await base44.asServiceRole.entities.CalibrationJudgment.filter({
      calibration_case_id, client_id: auth.client_id, integrity_status: "active",
    });

    // ── Reveal all judgments ──
    for (const j of judgments) {
      if (!j.revealed) {
        await base44.asServiceRole.entities.CalibrationJudgment.update(j.id, { revealed: true });
      }
    }

    // ── Count eligible participating (eligible + judgment_value not null) ──
    const eligible = judgments.filter(j => j.eligibility_status === "eligible" && j.judgment_value);
    const participatingCount = eligible.length;
    const quorumRequired = session.quorum_required || 3;

    let panelDetermination: string | null = null;
    let concurrenceMet = false;
    let dissent = null;

    if (participatingCount < quorumRequired) {
      // ── No quorum ──
      panelDetermination = "no_quorum";
      concurrenceMet = false;
    } else {
      // ── Compute majority (more than 50% of eligible participating) ──
      const valueCounts: Record<string, number> = {};
      for (const j of eligible) {
        valueCounts[j.judgment_value] = (valueCounts[j.judgment_value] || 0) + 1;
      }
      const majorityThreshold = participatingCount / 2;
      let maxCount = 0;
      let majorityValue: string | null = null;
      for (const [val, count] of Object.entries(valueCounts)) {
        if (count > majorityThreshold && count > maxCount) {
          maxCount = count;
          majorityValue = val;
        }
      }
      if (majorityValue) {
        panelDetermination = majorityValue;
        concurrenceMet = true;
        // Build dissent summary
        const dissenting = eligible.filter(j => j.judgment_value !== majorityValue);
        if (dissenting.length > 0) {
          const dissentCounts: Record<string, number> = {};
          for (const d of dissenting) {
            dissentCounts[d.judgment_value] = (dissentCounts[d.judgment_value] || 0) + 1;
          }
          dissent = Object.entries(dissentCounts).map(([v, c]) => `${v}: ${c}`).join("; ");
        }
      } else {
        // ── No concurrence (no majority) ──
        panelDetermination = "no_concurrence";
        concurrenceMet = false;
        dissent = Object.entries(valueCounts).map(([v, c]) => `${v}: ${c}`).join("; ");
      }
    }

    // ── Finalize the case ──
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.CalibrationCase.update(calibration_case_id, {
      status: "decision_recorded",
      panel_determination: panelDetermination,
      dissent,
      concurrence_met: concurrenceMet,
      participating_count: participatingCount,
      finalized_at: now,
    });

    // ── Update conclusion only if quorum + concurrence met ──
    // no_quorum and no_concurrence do NOT populate calibrated_value or
    // advance the conclusion to awaiting_ratification.
    if (concurrenceMet && panelDetermination !== "no_quorum" && panelDetermination !== "no_concurrence") {
      await base44.asServiceRole.entities.ReadinessConclusion.update(calCase.readiness_conclusion_id, {
        calibrated_value: panelDetermination,
        workflow_status: "awaiting_ratification",
      });
    } else {
      // Return to proposed status (panel did not reach a determination)
      await base44.asServiceRole.entities.ReadinessConclusion.update(calCase.readiness_conclusion_id, {
        workflow_status: "proposed",
      });
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "calibration_case_finalized",
      target_entity_type: "CalibrationCase", target_entity_id: calibration_case_id,
      metadata: {
        readiness_conclusion_id: calCase.readiness_conclusion_id,
        panel_determination: panelDetermination,
        concurrence_met: concurrenceMet,
        participating_count: participatingCount,
        abstention_count: calCase.abstention_count || 0,
        quorum_required: quorumRequired,
      },
      operation_id, event_key: { action: "calibration_case_finalized", calibration_case_id },
      event_type: "domain_action_completed", target_record_id: calibration_case_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      calibration_case_id, panel_determination: panelDetermination,
      concurrence_met: concurrenceMet,
    });

    return Response.json({
      operation_id, calibration_case_id,
      panel_determination: panelDetermination,
      concurrence_met: concurrenceMet,
      participating_count: participatingCount,
      abstention_count: calCase.abstention_count || 0,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "finalize_calibration_case_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}