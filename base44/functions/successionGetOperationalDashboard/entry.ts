import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { filterByConfidentiality, getClearanceRank } from "../../shared/confidentialityFilter.ts";

/**
 * POST /successionGetOperationalDashboard
 *
 * Returns authorized counts and limited operational records for the
 * operational monitor. No scores, rankings, or AI recommendations.
 * Counts respect tenant, domain, and confidentiality restrictions.
 */
const SCAN_LIMIT = 500;

export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id, critical_role_id } = body;

  if (!operation_id) return Response.json({ error: "operation_id required" }, { status: 400 });

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionGetOperationalDashboard",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionGetOperationalDashboard",
    payload: { cycle_id, critical_role_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const callerClearance = getCallerClearance(auth);
    const now = new Date();

    // ── Load source records (bounded, tenant-scoped) ──
    const criticalRoleFilter: any = { client_id: cid, integrity_status: "active", status: "active" };
    if (cycle_id) criticalRoleFilter.cycle_id = cycle_id;
    if (critical_role_id) criticalRoleFilter.id = critical_role_id;
    const criticalRoles = filterByConfidentiality(
      await base44.asServiceRole.entities.CriticalRole.filter(criticalRoleFilter, "-created_date", SCAN_LIMIT),
      callerClearance
    );

    const criticalRoleIds = criticalRoles.map((r: any) => r.id);

    const candidacyFilter: any = { client_id: cid, integrity_status: "active", status: "active" };
    if (cycle_id) candidacyFilter.cycle_id = cycle_id;
    const candidacies = filterByConfidentiality(
      criticalRoleIds.length > 0
        ? (await base44.asServiceRole.entities.SuccessorCandidacy.filter(candidacyFilter, "-created_date", SCAN_LIMIT))
            .filter((c: any) => criticalRoleIds.includes(c.critical_role_id))
        : [],
      callerClearance
    );

    const conclusionFilter: any = { client_id: cid, integrity_status: "active" };
    if (cycle_id) conclusionFilter.cycle_id = cycle_id;
    const conclusions = filterByConfidentiality(
      await base44.asServiceRole.entities.ReadinessConclusion.filter(conclusionFilter, "-created_date", SCAN_LIMIT),
      callerClearance
    );
    const activeConclusions = conclusions.filter((c: any) => c.workflow_status === "ratified" || c.workflow_status === "overridden");

    const devPlans = filterByConfidentiality(
      await base44.asServiceRole.entities.DevelopmentPlanLink.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT),
      callerClearance
    );
    const devActions = filterByConfidentiality(
      await base44.asServiceRole.entities.DevelopmentAction.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT),
      callerClearance
    );

    const transFilter: any = { client_id: cid, integrity_status: "active" };
    if (cycle_id) transFilter.cycle_id = cycle_id;
    const transitions = filterByConfidentiality(
      await base44.asServiceRole.entities.TransitionInitiation.filter(transFilter, "-initiated_at", SCAN_LIMIT),
      callerClearance
    );
    const activeTransitions = transitions.filter((t: any) => t.status === "approved" || t.status === "in_progress");

    const ktPlans = filterByConfidentiality(
      await base44.asServiceRole.entities.KnowledgeTransferPlan.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT),
      callerClearance
    );
    const transitionPlans = filterByConfidentiality(
      await base44.asServiceRole.entities.TransitionPlan.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT),
      callerClearance
    );

    // ── Compute counts ──
    const activeCriticalRoles = criticalRoles.length;

    const rolesWithNoCandidacy = criticalRoles.filter((r: any) =>
      !candidacies.some((c: any) => c.critical_role_id === r.id)
    ).length;

    const candidaciesWithoutCurrentReadiness = candidacies.filter((c: any) => {
      const candConclusions = activeConclusions.filter((con: any) => con.candidacy_id === c.id);
      return !candConclusions.some((con: any) =>
        con.next_review_date && new Date(con.next_review_date) >= now
      );
    }).length;

    const reviewDue30 = activeConclusions.filter((c: any) => {
      if (!c.next_review_date) return false;
      const days = Math.floor((new Date(c.next_review_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;

    const reviewDue60 = activeConclusions.filter((c: any) => {
      if (!c.next_review_date) return false;
      const days = Math.floor((new Date(c.next_review_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 30 && days <= 60;
    }).length;

    const reviewDue90 = activeConclusions.filter((c: any) => {
      if (!c.next_review_date) return false;
      const days = Math.floor((new Date(c.next_review_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 60 && days <= 90;
    }).length;

    const expiredReadiness = activeConclusions.filter((c: any) =>
      c.next_review_date && new Date(c.next_review_date) < now
    ).length;

    const overdueDevPlanReviews = devPlans.filter((p: any) =>
      (p.status === "active" || p.status === "draft") && p.review_date && new Date(p.review_date) < now
    ).length;

    const overdueDevActions = devActions.filter((a: any) =>
      (a.status === "not_started" || a.status === "in_progress") && a.due_date && new Date(a.due_date) < now
    ).length;

    const overdueTransitions = activeTransitions.filter((t: any) =>
      t.target_start_date && new Date(t.target_start_date) < now
    ).length;

    const overdueKtPlans = ktPlans.filter((k: any) =>
      (k.status === "active" || k.status === "draft") && k.target_completion_date && new Date(k.target_completion_date) < now
    ).length;

    const unresolvedHighRisks = transitionPlans.reduce((acc: number, tp: any) => {
      if (!tp.risks) return acc;
      return acc + tp.risks.filter((r: any) => r.severity === "high" && (r.status === "open" || r.status === "monitoring")).length;
    }, 0);

    // ── Open alerts (from entity) ──
    const alerts = filterByConfidentiality(
      await base44.asServiceRole.entities.SuccessionMonitorAlert.filter({ client_id: cid, integrity_status: "active" }, "-detected_at", SCAN_LIMIT),
      callerClearance
    );
    const openAlerts = alerts.filter((a: any) => a.status === "open" || a.status === "acknowledged").length;
    const openIntegrityAlerts = alerts.filter((a: any) =>
      (a.status === "open" || a.status === "acknowledged") && a.alert_type === "integrity_attention_required"
    ).length;

    // ── Review records ──
    const reviews = filterByConfidentiality(
      await base44.asServiceRole.entities.SuccessionReviewRecord.filter({ client_id: cid, integrity_status: "active" }, "-scheduled_for", SCAN_LIMIT),
      callerClearance
    );
    const scheduledReviews = reviews.filter((r: any) => r.status === "scheduled").length;
    const overdueReviews = reviews.filter((r: any) =>
      r.status === "scheduled" && r.scheduled_for && new Date(r.scheduled_for) < now
    ).length;

    // ── Recent alerts (limited operational records, no confidential text) ──
    const recentAlerts = alerts
      .filter((a: any) => a.status === "open" || a.status === "acknowledged")
      .slice(0, 20)
      .map((a: any) => ({
        alert_id: a.id,
        alert_type: a.alert_type,
        severity: a.severity,
        title: a.title,
        status: a.status,
        due_date: a.due_date || null,
        detected_at: a.detected_at,
        critical_role_id: a.critical_role_id || null,
        cycle_id: a.cycle_id || null,
        // Do NOT expose confidential source text, evidence, or panel data
      }));

    const dashboard = {
      counts: {
        active_critical_roles: activeCriticalRoles,
        critical_roles_no_candidacy: rolesWithNoCandidacy,
        candidacies_without_current_readiness: candidaciesWithoutCurrentReadiness,
        readiness_review_due_30_days: reviewDue30,
        readiness_review_due_60_days: reviewDue60,
        readiness_review_due_90_days: reviewDue90,
        expired_readiness_conclusions: expiredReadiness,
        overdue_dev_plan_reviews: overdueDevPlanReviews,
        overdue_dev_actions: overdueDevActions,
        overdue_transitions: overdueTransitions,
        overdue_kt_plans: overdueKtPlans,
        unresolved_high_transition_risks: unresolvedHighRisks,
        open_alerts: openAlerts,
        open_integrity_alerts: openIntegrityAlerts,
        scheduled_reviews: scheduledReviews,
        overdue_reviews: overdueReviews,
      },
      recent_alerts: recentAlerts,
      scan_limit: SCAN_LIMIT,
    };

    await completeOperation(base44, opResult.operation.id, null, dashboard.counts);

    return Response.json({ operation_id, ...dashboard });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "dashboard_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

function getCallerClearance(auth: any): string {
  if (auth.isPlatformAdmin) return "legally_restricted";
  const adminRoles = ["Platform Admin", "Platform Administrator", "admin", "Super Administrator", "Admin Level 2", "Admin Level 1"];
  if (adminRoles.includes(auth.role)) return "highly_confidential";
  return "standard";
}