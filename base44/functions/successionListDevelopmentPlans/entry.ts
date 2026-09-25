import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";

/**
 * POST /successionListDevelopmentPlans
 *
 * Lists DevelopmentPlanLinks with their actions and progress summary.
 * Tenant-scoped, integrity_status=active filter, data minimization.
 * No ranking, scoring, or recommendations.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, candidacy_id } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionListDevelopmentPlans",
    target_client_id: auth.client_id,
    required_permission: "succession.development.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionListDevelopmentPlans",
    payload: { cycle_id, candidacy_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);

    // ── Load plan links ──
    const filter: any = { client_id: auth.client_id, integrity_status: "active" };
    const planLinks = await base44.asServiceRole.entities.DevelopmentPlanLink.filter(filter, "-created_at", 100);

    // ── Load all actions for these plan links ──
    const planLinkIds = planLinks.map((p: any) => p.id);
    const allActions = planLinkIds.length > 0
      ? await base44.asServiceRole.entities.DevelopmentAction.filter({
          client_id: auth.client_id, integrity_status: "active",
        })
      : [];

    // ── Load conclusions for ratified value display ──
    const conclusionIds = [...new Set(planLinks.map((p: any) => p.readiness_conclusion_id))];
    const conclusions = conclusionIds.length > 0
      ? await base44.asServiceRole.entities.ReadinessConclusion.filter({
          client_id: auth.client_id, integrity_status: "active",
        })
      : [];
    const conclusionMap = new Map(conclusions.map((c: any) => [c.id, c]));

    // ── Load conditions for each conclusion ──
    const conditionConcIds = conclusionIds;
    const allConditions = conditionConcIds.length > 0
      ? await base44.asServiceRole.entities.ReadinessCondition.filter({
          client_id: auth.client_id, integrity_status: "active",
        })
      : [];

    // ── Build summaries ──
    const summaries = planLinks.map((pl: any) => {
      const actions = allActions.filter((a: any) => a.development_plan_link_id === pl.id);
      const conclusion = conclusionMap.get(pl.readiness_conclusion_id);
      const conditions = allConditions.filter((c: any) => c.readiness_conclusion_id === pl.readiness_conclusion_id);

      const progress = {
        total: actions.length,
        not_started: actions.filter((a: any) => a.status === "not_started").length,
        in_progress: actions.filter((a: any) => a.status === "in_progress").length,
        completed: actions.filter((a: any) => a.status === "completed").length,
        cancelled: actions.filter((a: any) => a.status === "cancelled").length,
      };

      return {
        plan_link_id: pl.id,
        candidacy_id: pl.candidacy_id,
        readiness_conclusion_id: pl.readiness_conclusion_id,
        effective_blueprint_snapshot_id: pl.effective_blueprint_snapshot_id,
        linked_development_plan_id: pl.linked_development_plan_id,
        gap_summary: pl.gap_summary,
        owner_profile_id: pl.owner_profile_id,
        status: pl.status,
        review_date: pl.review_date,
        reassessment_date: pl.reassessment_date,
        ratified_value: conclusion?.ratified_value || conclusion?.calibrated_value || conclusion?.proposed_value || null,
        conclusion_workflow_status: conclusion?.workflow_status || null,
        linked_conditions: conditions.map((c: any) => ({
          condition_id: c.id,
          condition_text: c.condition_text,
          status: c.status,
          required_by_date: c.required_by_date,
        })),
        progress,
        created_at: pl.created_at,
      };
    });

    // ── Filter by cycle_id or candidacy_id if provided ──
    const filtered = summaries.filter((s: any) => {
      if (candidacy_id && s.candidacy_id !== candidacy_id) return false;
      // cycle_id filtering would require loading candidacies — skip for MVP
      return true;
    });

    await completeOperation(base44, opResult.operation.id, null, {
      count: filtered.length,
    });

    return Response.json({
      operation_id, plan_links: filtered, count: filtered.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "list_development_plans_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}