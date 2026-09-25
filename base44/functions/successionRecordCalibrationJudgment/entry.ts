import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionRecordCalibrationJudgment
 *
 * Records a panelist's blind CalibrationJudgment. Validates:
 * - panelist is in the case's panel roster
 * - panelist has not already judged this case
 * - case is open (accepting judgments)
 *
 * If coi_disclosed=true, sets eligibility_status=abstained_due_to_coi,
 * judgment_value=null. COI-abstained panelists do not count toward quorum.
 *
 * Blind: revealed=false until the case is finalized.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, calibration_case_id, coi_disclosed, judgment_value, judgment_notes } = body;

  if (!operation_id || !calibration_case_id) {
    return Response.json({ error: "operation_id, calibration_case_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionRecordCalibrationJudgment",
    target_client_id: auth.client_id,
    required_permission: "succession.deliberate.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionRecordCalibrationJudgment",
    payload: { calibration_case_id, coi_disclosed, judgment_value, judgment_notes },
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

    if (calCase.status !== "open") {
      await failOperation(base44, opResult.operation.id, "case_not_open");
      return Response.json({ error: "This case is no longer accepting judgments" }, { status: 409 });
    }

    // ── Validate panelist is in the roster ──
    if (!calCase.panel_member_profile_ids || !calCase.panel_member_profile_ids.includes(auth.profile_id)) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "CalibrationCase", target_entity_id: calibration_case_id,
        metadata: {
          action: "successionRecordCalibrationJudgment",
          denied_reason: "panelist_not_rostered",
          actor_profile_id: auth.profile_id,
        },
        operation_id: opResult.operation.id,
        event_key: { action: "denied_unauthorized_panelist", calibration_case_id, panelist: auth.profile_id },
        event_type: "denied_action",
      });
      await failOperation(base44, opResult.operation.id, "panelist_not_rostered");
      return Response.json({ error: "You are not on the panel roster for this case" }, { status: 403 });
    }

    // ── Check for existing judgment by this panelist ──
    const existing = await base44.asServiceRole.entities.CalibrationJudgment.filter({
      calibration_case_id, client_id: auth.client_id,
      panelist_profile_id: auth.profile_id,
      integrity_status: "active",
    });
    if (existing.length > 0) {
      await failOperation(base44, opResult.operation.id, "already_judged");
      return Response.json({ error: "You have already recorded a judgment for this case" }, { status: 409 });
    }

    // ── Validate judgment_value if not COI ──
    const isCOI = !!coi_disclosed;
    if (!isCOI) {
      const validValues = ["ready_now", "ready_with_conditions", "emerging", "insufficient_evidence", "not_aligned_now"];
      if (!judgment_value || !validValues.includes(judgment_value)) {
        await failOperation(base44, opResult.operation.id, "invalid_judgment_value");
        return Response.json({ error: "judgment_value is required and must be valid" }, { status: 400 });
      }
    }

    // ── Create the judgment ──
    const judgment = await base44.asServiceRole.entities.CalibrationJudgment.create({
      client_id: auth.client_id,
      calibration_case_id,
      panelist_profile_id: auth.profile_id,
      eligibility_status: isCOI ? "abstained_due_to_coi" : "eligible",
      coi_disclosed: isCOI,
      judgment_value: isCOI ? null : judgment_value,
      judgment_notes: judgment_notes || null,
      recorded_at: new Date().toISOString(),
      revealed: false,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    // ── Update case abstention count if COI ──
    if (isCOI) {
      await base44.asServiceRole.entities.CalibrationCase.update(calibration_case_id, {
        abstention_count: (calCase.abstention_count || 0) + 1,
      });
    }

    // ── Update session status to in_progress ──
    const session = await validateSameTenantReference(
      base44, "CalibrationSession", calCase.session_id, auth.client_id
    );
    if (session && session.status === "scheduled") {
      await base44.asServiceRole.entities.CalibrationSession.update(calCase.session_id, {
        status: "in_progress",
      });
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "calibration_judgment_recorded",
      target_entity_type: "CalibrationJudgment", target_entity_id: judgment.id,
      metadata: {
        calibration_case_id,
        eligibility_status: judgment.eligibility_status,
        coi_disclosed: isCOI,
      },
      operation_id, event_key: { action: "calibration_judgment_recorded", judgment_id: judgment.id },
      event_type: "domain_action_completed", target_record_id: judgment.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      judgment_id: judgment.id, eligibility_status: judgment.eligibility_status,
    });

    return Response.json({
      operation_id, judgment_id: judgment.id,
      eligibility_status: judgment.eligibility_status,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "record_calibration_judgment_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}