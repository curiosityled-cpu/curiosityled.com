import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateSameTenantReference, writeDeniedReferenceEvent } from "../../shared/successionCrossTenantValidation.ts";

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
  const { operation_id, initiation_id, completion_summary } = body;

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

    // ── Complete the initiation ──
    await base44.asServiceRole.entities.TransitionInitiation.update(initiation_id, {
      status: "completed",
      completed_at: now,
      completion_summary: completion_summary || null,
    });

    // ── Optionally mark KT plan and transition plan as completed ──
    const ktPlans = await base44.asServiceRole.entities.KnowledgeTransferPlan.filter({
      client_id: auth.client_id, transition_initiation_id: initiation_id,
      integrity_status: "active",
    });
    for (const kt of ktPlans) {
      if (kt.status === "active") {
        await base44.asServiceRole.entities.KnowledgeTransferPlan.update(kt.id, {
          status: "completed", completed_at: now,
        });
      }
    }

    const transitionPlans = await base44.asServiceRole.entities.TransitionPlan.filter({
      client_id: auth.client_id, transition_initiation_id: initiation_id,
      integrity_status: "active",
    });
    for (const tp of transitionPlans) {
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