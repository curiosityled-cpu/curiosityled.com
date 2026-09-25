import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

/**
 * POST /successionRatifyReadinessConclusion
 *
 * Creates an append-only GovernanceApproval. Enforces:
 * - approver ≠ proposed_by_profile_id (separation of duties)
 * - ratify: requires rationale + next_review_date, sets ratified_value =
 *   calibrated_value (normal ratification uses calibrated_value)
 * - override: requires override_value, detailed rationale, next_review_date,
 *   sets ratified_value=override_value, sends panel notification
 * - return_for_evidence: sets status=returned_for_evidence
 * - return_for_recalibration: sets status=returned_for_recalibration
 *
 * Returned, ratified, and overridden conclusions are not edited in place.
 * Returned conclusions create a new version on reconsideration.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, conclusion_id, decision, rationale, override_value, next_review_date } = body;

  if (!operation_id || !conclusion_id || !decision || !rationale) {
    return Response.json({ error: "operation_id, conclusion_id, decision, rationale required" }, { status: 400 });
  }

  const validDecisions = ["ratify", "return_for_evidence", "return_for_recalibration", "override"];
  if (!validDecisions.includes(decision)) {
    return Response.json({ error: "Invalid decision" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionRatifyReadinessConclusion",
    target_client_id: auth.client_id,
    required_permission: "succession.readiness.ratify",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionRatifyReadinessConclusion",
    payload: { conclusion_id, decision, rationale, override_value, next_review_date },
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

    // ── Separation of duties: proposer cannot ratify ──
    if (conclusion.proposed_by_profile_id === auth.profile_id) {
      await writeSuccessionAuditEvent({
        base44, action_type: "denied_action",
        target_entity_type: "ReadinessConclusion", target_entity_id: conclusion_id,
        metadata: {
          action: "successionRatifyReadinessConclusion",
          denied_reason: "proposer_cannot_ratify",
          approver_profile_id: auth.profile_id,
          proposed_by_profile_id: conclusion.proposed_by_profile_id,
        },
        operation_id: opResult.operation.id,
        event_key: { action: "denied_proposer_raty", conclusion_id },
        event_type: "denied_action",
      });
      await failOperation(base44, opResult.operation.id, "proposer_cannot_ratify");
      return Response.json({ error: "The proposer cannot ratify their own conclusion" }, { status: 403 });
    }

    // ── Validate conclusion is in the right state ──
    if (decision === "ratify" || decision === "override") {
      if (conclusion.workflow_status !== "awaiting_ratification") {
        await failOperation(base44, opResult.operation.id, "not_awaiting_ratification");
        return Response.json({ error: "Conclusion must be awaiting ratification" }, { status: 409 });
      }
      if (!next_review_date) {
        await failOperation(base44, opResult.operation.id, "next_review_date_required");
        return Response.json({ error: "next_review_date is required for ratify and override" }, { status: 400 });
      }
    } else {
      // return_for_evidence / return_for_recalibration can act on proposed or awaiting_ratification
      if (conclusion.workflow_status !== "awaiting_ratification" && conclusion.workflow_status !== "proposed") {
        await failOperation(base44, opResult.operation.id, "invalid_state_for_return");
        return Response.json({ error: "Conclusion must be proposed or awaiting ratification to return" }, { status: 409 });
      }
    }

    // ── Validate override ──
    let ratifiedValue = null;
    let newStatus = conclusion.workflow_status;
    if (decision === "ratify") {
      // Normal ratification uses calibrated_value
      if (!conclusion.calibrated_value) {
        await failOperation(base44, opResult.operation.id, "no_calibrated_value");
        return Response.json({ error: "No calibrated value to ratify — panel did not reach concurrence" }, { status: 409 });
      }
      ratifiedValue = conclusion.calibrated_value;
      newStatus = "ratified";
    } else if (decision === "override") {
      // Override requires explicit override_value
      const validValues = ["ready_now", "ready_with_conditions", "emerging", "insufficient_evidence", "not_aligned_now"];
      if (!override_value || !validValues.includes(override_value)) {
        await failOperation(base44, opResult.operation.id, "override_value_required");
        return Response.json({ error: "override_value is required and must be valid" }, { status: 400 });
      }
      if (override_value === conclusion.calibrated_value) {
        await failOperation(base44, opResult.operation.id, "override_same_as_calibrated");
        return Response.json({ error: "Override value must differ from calibrated value — use ratify instead" }, { status: 400 });
      }
      ratifiedValue = override_value;
      newStatus = "overridden";
    } else if (decision === "return_for_evidence") {
      newStatus = "returned_for_evidence";
    } else if (decision === "return_for_recalibration") {
      newStatus = "returned_for_recalibration";
    }

    // ── Create the append-only GovernanceApproval ──
    const now = new Date().toISOString();
    const approval = await base44.asServiceRole.entities.GovernanceApproval.create({
      client_id: auth.client_id,
      readiness_conclusion_id: conclusion_id,
      approver_profile_id: auth.profile_id,
      decision,
      override_value: decision === "override" ? override_value : null,
      rationale,
      next_review_date: next_review_date || null,
      decided_at: now,
      confidentiality_level: "confidential",
      integrity_status: "active",
    });

    // ── Update conclusion ──
    const updateData: any = { workflow_status: newStatus };
    if (ratifiedValue) {
      updateData.ratified_value = ratifiedValue;
      updateData.next_review_date = next_review_date;
    }
    await base44.asServiceRole.entities.ReadinessConclusion.update(conclusion_id, updateData);

    // ── Override: send panel notification (audit event) ──
    if (decision === "override") {
      // Find the calibration case for this conclusion
      const cases = await base44.asServiceRole.entities.CalibrationCase.filter({
        readiness_conclusion_id: conclusion_id, client_id: auth.client_id,
        integrity_status: "active",
      });
      if (cases.length > 0) {
        const calCase = cases[0];
        await writeSuccessionAuditEvent({
          base44, action_type: "override_panel_notification",
          target_entity_type: "CalibrationCase", target_entity_id: calCase.id,
          metadata: {
            readiness_conclusion_id: conclusion_id,
            override_value,
            calibrated_value: conclusion.calibrated_value,
            rationale,
            panel_member_profile_ids: calCase.panel_member_profile_ids,
          },
          operation_id: opResult.operation.id,
          event_key: { action: "override_panel_notified", conclusion_id, calibration_case_id: calCase.id },
          event_type: "domain_action_completed",
          target_record_id: calCase.id, attempt_number: 1,
        });
      }
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "governance_approval_recorded",
      target_entity_type: "GovernanceApproval", target_entity_id: approval.id,
      metadata: {
        readiness_conclusion_id: conclusion_id,
        decision,
        ratified_value: ratifiedValue,
        new_status: newStatus,
      },
      operation_id, event_key: { action: "governance_approval_recorded", approval_id: approval.id },
      event_type: "domain_action_completed", target_record_id: approval.id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      approval_id: approval.id, conclusion_id, new_status: newStatus,
    });

    return Response.json({
      operation_id, approval_id: approval.id,
      conclusion_id, new_status: newStatus,
      ratified_value: ratifiedValue,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "ratify_readiness_conclusion_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}