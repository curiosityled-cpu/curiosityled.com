import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { validateInitiationForPlan, validateProfileTenant } from "../../shared/successionTransitionValidator.ts";

/**
 * POST /successionSaveTransitionPlan
 *
 * Creates or updates a TransitionPlan for a transition initiation.
 * Validates that risk owners belong to the tenant. Risk acceptance is
 * recorded with the authorized actor's identity. Completion does not change
 * readiness or employee records.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, transition_initiation_id, plan_id,
    transition_type, start_date, review_date, target_completion_date,
    ramp_plan, success_outcomes, risks, milestone_summary, status } = body;

  if (!operation_id || !transition_initiation_id || !transition_type || !start_date || !review_date || !target_completion_date) {
    return Response.json({ error: "operation_id, transition_initiation_id, transition_type, start_date, review_date, target_completion_date required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionSaveTransitionPlan",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.manage",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionSaveTransitionPlan",
    payload: { transition_initiation_id, plan_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Validate initiation exists and is approved/in_progress ──
    const initCheck = await validateInitiationForPlan(base44, auth.client_id, transition_initiation_id, opResult.operation.id);
    if (!initCheck.valid) {
      await failOperation(base44, opResult.operation.id, initCheck.error_code);
      return Response.json({ error: initCheck.error_message }, { status: 400 });
    }
    const initiation = initCheck.initiation;

    // ── Validate risk owners belong to tenant; record risk acceptance ──
    let processedRisks = risks || [];
    if (Array.isArray(processedRisks)) {
      for (const risk of processedRisks) {
        if (risk.owner_profile_id) {
          const ownerCheck = await validateProfileTenant(base44, auth.client_id, risk.owner_profile_id);
          if (!ownerCheck.valid) {
            await failOperation(base44, opResult.operation.id, "risk_owner_not_found");
            return Response.json({ error: "Risk owner not found in tenant" }, { status: 400 });
          }
        }
        // If risk status is "accepted", record the authorized actor
        if (risk.status === "accepted" && !risk.accepted_by_profile_id) {
          risk.accepted_by_profile_id = auth.profile_id;
          risk.accepted_at = new Date().toISOString();
        }
      }
    }

    const planData: any = {
      client_id: auth.client_id,
      transition_initiation_id,
      org_position_id: initiation.org_position_id,
      successor_profile_id: initiation.successor_profile_id,
      sponsor_profile_id: initiation.sponsor_profile_id,
      transition_type,
      start_date, review_date, target_completion_date,
      ramp_plan: ramp_plan || null,
      success_outcomes: success_outcomes || null,
      risks: processedRisks,
      milestone_summary: milestone_summary || null,
      status: status || "draft",
      confidentiality_level: "confidential",
      integrity_status: "active",
    };

    let planId = plan_id;
    if (plan_id) {
      await base44.asServiceRole.entities.TransitionPlan.update(plan_id, planData);
    } else {
      const newPlan = await base44.asServiceRole.entities.TransitionPlan.create(planData);
      planId = newPlan.id;
    }

    const auditEvent = await writeSuccessionAuditEvent({
      base44, action_type: "transition_plan_saved",
      target_entity_type: "TransitionPlan", target_entity_id: planId,
      metadata: { transition_initiation_id, plan_id: planId, is_update: !!plan_id,
        risk_count: processedRisks.length },
      operation_id, event_key: { action: "tp_saved", plan_id: planId },
      event_type: "domain_action_completed", target_record_id: planId, attempt_number: 1,
    });

    await completeOperation(base44, opResult.operation.id, auditEvent?.id || null, {
      plan_id: planId, status: planData.status,
    });

    return Response.json({ operation_id, plan_id: planId, status: planData.status });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "save_transition_plan_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}