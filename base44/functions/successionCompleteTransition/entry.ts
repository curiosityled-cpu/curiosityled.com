import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";
import { computeTransitionBlockers } from "../../shared/successionTransitionReadiness.ts";

/**
 * POST /successionCompleteTransition
 *
 * Completes a TransitionInitiation. The initiation must be in_progress.
 * Records a completion summary and completed_at timestamp. Does NOT:
 * - change UserProfile
 * - change PositionAssignment
 * - change ReadinessConclusion
 * - change candidacy status
 * - promote the employee
 * The completed plans are preserved as historical evidence.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, initiation_id, completion_summary, risk_acknowledgement_note } = body;

  if (!operation_id || !initiation_id) {
    return Response.json({ error: "operation_id, initiation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionCompleteTransition",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionCompleteTransition",
    payload: { initiation_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load the initiation ──
    const initiation = await validateSameTenantReference(
      base44, "TransitionInitiation", initiation_id, auth.client_id
    );
    if (!initiation) {
      await writeDeniedReferenceEvent(base44, auth, "TransitionInitiation", initiation_id, "cross_tenant_or_not_found", opResult.operation.id);
      await failOperation(base44, opResult.operation.id, "initiation_not_found");
      return Response.json({ error: "Transition initiation not found" }, { status: 404 });
    }

    // ── Must be in_progress to complete ──
    if (initiation.status !== "in_progress") {
      await failOperation(base44, opResult.operation.id, "not_in_progress");
      return Response.json({ error: "Transition must be in_progress to complete" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // ── Execution gate ──
    // A transition is finished when the knowledge has actually been handed over,
    // not when the calendar says so. Every knowledge area must be completed or
    // waived, and high-severity risks must either be closed or explicitly
    // acknowledged with a recorded note.
    const blockers = await computeTransitionBlockers(base44, auth.client_id, initiation_id);

    if (blockers.open_areas.length > 0) {
      await failOperation(base44, opResult.operation.id, "knowledge_transfer_incomplete");
      const listed = blockers.open_areas.slice(0, 5).join("; ");
      const more = blockers.open_areas.length > 5 ? ` and ${blockers.open_areas.length - 5} more` : "";
      return Response.json({
        error: `Cannot complete transition: ${blockers.open_areas.length} knowledge area(s) still open — ${listed}${more}`,
        code: "knowledge_transfer_incomplete",
        open_areas: blockers.open_areas,
        plan_progress: blockers.plan_progress,
      }, { status: 409 });
    }

    const acknowledgement = (risk_acknowledgement_note || "").trim();
    if (blockers.open_high_risks.length > 0 && !acknowledgement) {
      await failOperation(base44, opResult.operation.id, "open_high_risks_unacknowledged");
      return Response.json({
        error: `Cannot complete transition: ${blockers.open_high_risks.length} high-severity risk(s) still open — record an acknowledgement note to proceed`,
        code: "open_high_risks",
        open_risks: blockers.open_high_risks,
      }, { status: 409 });
    }

    // ── Complete the initiation ──
    await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, {
      status: "completed",
      completed_at: now,
      completion_summary: completion_summary || null,
    });

    // ── Close the plans that were just delivered ──
    for (const kt of blockers.kt_plans) {
      if (kt.status === "active") {
        await base44.asServiceRole.entities.KnowledgeTransferPlan.update(kt.id, {
          status: "completed", completed_at: now,
        });
      }
    }

    for (const tp of blockers.transition_plans) {
      if (tp.status === "active") {
        await base44.asServiceRole.entities.TransitionPlan.update(tp.id, {
          status: "completed", completed_at: now,
        });
      }
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "transition_completed",
      target_entity_type: "TransitionInitiation", target_entity_id: initiation_id,
      metadata: {
        initiation_id, completion_summary: completion_summary ? true : false,
        risk_acknowledgement: acknowledgement || null,
        risks_acknowledged: blockers.open_high_risks,
        knowledge_areas_closed: blockers.plan_progress,
        user_profile_unchanged: true,
        position_assignment_unchanged: true,
        readiness_unchanged: true,
        candidacy_unchanged: true,
      },
      operation_id, event_key: { action: "transition_completed", initiation_id },
      event_type: "domain_action_completed", target_record_id: initiation_id, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      initiation_id, status: "completed",
    });

    return Response.json({
      operation_id, initiation_id, status: "completed",
      user_profile_unchanged: true,
      position_assignment_unchanged: true,
      readiness_unchanged: true,
      candidacy_unchanged: true,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "complete_transition_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}