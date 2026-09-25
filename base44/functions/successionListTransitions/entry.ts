import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionListTransitions
 *
 * Lists TransitionInitiations with knowledge-transfer and transition-plan
 * progress summaries, and unresolved high risks. Tenant-scoped,
 * integrity_status=active filter, data minimization. No ranking, scoring,
 * or recommendations.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, status_filter, critical_role_id } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListTransitions",
    target_client_id: auth.client_id,
    required_permission: "succession.transition.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionListTransitions",
    payload: { cycle_id, status_filter, critical_role_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load initiations ──
    const filter: any = { client_id: auth.client_id, integrity_status: "active" };
    if (status_filter) filter.status = status_filter;
    if (cycle_id) filter.cycle_id = cycle_id;
    if (critical_role_id) filter.critical_role_id = critical_role_id;

    const initiations = await base44.asServiceRole.entities.TransitionInitiation.filter(filter, "-initiated_at", 100);

    // ── Load knowledge transfer plans ──
    const initiationIds = initiations.map((i: any) => i.id);
    const ktPlans = initiationIds.length > 0
      ? await base44.asServiceRole.entities.KnowledgeTransferPlan.filter({
          client_id: auth.client_id, integrity_status: "active",
        })
      : [];

    // ── Load transition plans ──
    const transitionPlans = initiationIds.length > 0
      ? await base44.asServiceRole.entities.TransitionPlan.filter({
          client_id: auth.client_id, integrity_status: "active",
        })
      : [];

    // ── Build summaries ──
    const summaries = initiations.map((init: any) => {
      const kt = ktPlans.filter((k: any) => k.transition_initiation_id === init.id);
      const tp = transitionPlans.filter((t: any) => t.transition_initiation_id === init.id);

      // KT progress
      const ktAreas = kt.length > 0 && kt[0].knowledge_areas ? kt[0].knowledge_areas : [];
      const ktProgress = {
        total: ktAreas.length,
        not_started: ktAreas.filter((a: any) => a.status === "not_started").length,
        in_progress: ktAreas.filter((a: any) => a.status === "in_progress").length,
        completed: ktAreas.filter((a: any) => a.status === "completed").length,
        waived: ktAreas.filter((a: any) => a.status === "waived").length,
      };

      // Transition plan risks
      const risks = tp.length > 0 && tp[0].risks ? tp[0].risks : [];
      const unresolvedHighRisks = risks.filter((r: any) => r.severity === "high" && (r.status === "open" || r.status === "monitoring"));

      return {
        initiation_id: init.id,
        cycle_id: init.cycle_id,
        critical_role_id: init.critical_role_id,
        org_position_id: init.org_position_id,
        successor_profile_id: init.successor_profile_id,
        candidacy_id: init.candidacy_id || null,
        readiness_conclusion_id: init.readiness_conclusion_id || null,
        initiation_type: init.initiation_type,
        initiation_basis: init.initiation_basis,
        target_start_date: init.target_start_date,
        sponsor_profile_id: init.sponsor_profile_id,
        status: init.status,
        initiated_by_profile_id: init.initiated_by_profile_id,
        initiated_at: init.initiated_at,
        approved_by_profile_id: init.approved_by_profile_id || null,
        approved_at: init.approved_at || null,
        external_authorization_reference: init.external_authorization_reference || null,
        exception_reason: init.exception_reason || null,
        cancellation_reason: init.cancellation_reason || null,
        kt_plan_id: kt.length > 0 ? kt[0].id : null,
        kt_plan_status: kt.length > 0 ? kt[0].status : null,
        kt_progress: ktProgress,
        transition_plan_id: tp.length > 0 ? tp[0].id : null,
        transition_plan_status: tp.length > 0 ? tp[0].status : null,
        unresolved_high_risks: unresolvedHighRisks.length,
      };
    });

    await completeOperation(base44, opResult.operation.id, null, {
      count: summaries.length,
    });

    return Response.json({
      operation_id, transitions: summaries, count: summaries.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "list_transitions_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}