import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { createOrAttachOperation, beginOperationExecution, completeOperation, failOperation } from "../../shared/successionOperationHelper.ts";
import { writeSuccessionAuditEvent } from "../../shared/successionAuditWriter.ts";
import { computeAlertFingerprint } from "../../shared/successionMonitorValidator.ts";
import { filterByConfidentiality, getClearanceRank } from "../../shared/confidentialityFilter.ts";

/**
 * POST /successionRefreshMonitorAlerts
 *
 * Derives operational alerts from current source records within the actor's
 * authorized tenant scope. Idempotent: updates existing alerts rather than
 * creating duplicates. Resolves alerts when the underlying condition is
 * demonstrably cleared. Never modifies source entities.
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
    base44, auth, action: "successionRefreshMonitorAlerts",
    target_client_id: auth.client_id,
    required_permission: "succession.monitor.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const opResult = await createOrAttachOperation({
    base44, client_id: auth.client_id, operation_id,
    function_name: "successionRefreshMonitorAlerts",
    payload: { cycle_id, critical_role_id },
    actor_profile_id: auth.profile_id, actor_email: auth.email,
    actor_context_type: auth.isPlatformAdmin ? "platform_operator" : "tenant",
  });
  if (opResult.rejected_payload_mismatch) return Response.json({ error: "operation_id payload mismatch — rejected" }, { status: 409 });
  if (opResult.is_duplicate) return Response.json({ operation_id, status: opResult.operation.status, note: "duplicate operation attached" });

  try {
    await beginOperationExecution(base44, opResult.operation.id);
    const cid = auth.client_id;
    const now = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];

    const callerClearance = getCallerClearance(auth);

    // ── Load source records (bounded, tenant-scoped) ──
    const criticalRoleFilter: any = { client_id: cid, integrity_status: "active", status: "active" };
    if (cycle_id) criticalRoleFilter.cycle_id = cycle_id;
    if (critical_role_id) criticalRoleFilter.id = critical_role_id;
    const criticalRoles = await base44.asServiceRole.entities.CriticalRole.filter(criticalRoleFilter, "-created_date", SCAN_LIMIT);

    const criticalRoleIds = criticalRoles.map((r: any) => r.id);
    const cycleIds = [...new Set(criticalRoles.map((r: any) => r.cycle_id))];

    // Candidacies
    const candidacyFilter: any = { client_id: cid, integrity_status: "active", status: "active" };
    if (cycle_id) candidacyFilter.cycle_id = cycle_id;
    const candidacies = criticalRoleIds.length > 0
      ? (await base44.asServiceRole.entities.SuccessorCandidacy.filter(candidacyFilter, "-created_date", SCAN_LIMIT))
          .filter((c: any) => criticalRoleIds.includes(c.critical_role_id))
      : [];

    // Readiness conclusions (ratified/overridden only)
    const conclusionFilter: any = { client_id: cid, integrity_status: "active" };
    if (cycle_id) conclusionFilter.cycle_id = cycle_id;
    const conclusions = await base44.asServiceRole.entities.ReadinessConclusion.filter(conclusionFilter, "-created_date", SCAN_LIMIT);
    const activeConclusions = conclusions.filter((c: any) =>
      c.workflow_status === "ratified" || c.workflow_status === "overridden"
    );

    // Development plan links
    const devPlanFilter: any = { client_id: cid, integrity_status: "active" };
    if (cycle_id) devPlanFilter.cycle_id = cycle_id;
    const devPlans = await base44.asServiceRole.entities.DevelopmentPlanLink.filter(devPlanFilter, "-created_date", SCAN_LIMIT);
    const activeDevPlans = devPlans.filter((p: any) => p.status === "active" || p.status === "draft");

    // Development actions
    const devActions = await base44.asServiceRole.entities.DevelopmentAction.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT);
    const activeDevActions = devActions.filter((a: any) => a.status === "not_started" || a.status === "in_progress");

    // Transition initiations
    const transFilter: any = { client_id: cid, integrity_status: "active" };
    if (cycle_id) transFilter.cycle_id = cycle_id;
    const transitions = await base44.asServiceRole.entities.TransitionInitiation.filter(transFilter, "-initiated_at", SCAN_LIMIT);
    const activeTransitions = transitions.filter((t: any) => t.status === "approved" || t.status === "in_progress");

    // KT plans
    const ktPlans = await base44.asServiceRole.entities.KnowledgeTransferPlan.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT);
    const activeKtPlans = ktPlans.filter((k: any) => k.status === "active" || k.status === "draft");

    // Transition plans (for high risks)
    const transitionPlans = await base44.asServiceRole.entities.TransitionPlan.filter({ client_id: cid, integrity_status: "active" }, "-created_date", SCAN_LIMIT);

    // ── Derive candidate alerts ──
    const candidateAlerts: any[] = [];

    // 1. Critical roles with no active candidacy
    for (const role of criticalRoles) {
      const hasCandidacy = candidacies.some((c: any) => c.critical_role_id === role.id);
      if (!hasCandidacy) {
        candidateAlerts.push({
          alert_type: "no_active_candidacy",
          source_entity_type: "CriticalRole",
          source_entity_id: role.id,
          cycle_id: role.cycle_id,
          critical_role_id: role.id,
          org_position_id: role.org_position_id,
          severity: "attention",
          title: "Critical role has no active candidacy",
          description: "This critical role has no active successor candidacy in the current cycle.",
          confidentiality_level: role.confidentiality_level || "confidential",
        });
      }
    }

    // 2. Active candidacies without a current eligible readiness conclusion
    for (const cand of candidacies) {
      const candConclusions = activeConclusions.filter((c: any) => c.candidacy_id === cand.id);
      const currentConclusion = candConclusions.find((c: any) =>
        c.next_review_date && new Date(c.next_review_date) >= new Date()
      );
      if (!currentConclusion) {
        candidateAlerts.push({
          alert_type: "current_readiness_missing",
          source_entity_type: "SuccessorCandidacy",
          source_entity_id: cand.id,
          cycle_id: cand.cycle_id,
          critical_role_id: cand.critical_role_id,
          candidacy_id: cand.id,
          severity: "attention",
          title: "Candidacy lacks current readiness conclusion",
          description: "This candidacy has no current, eligible readiness conclusion within its review period.",
          confidentiality_level: cand.confidentiality_level || "confidential",
        });
      }
    }

    // 3. Readiness conclusions with review dates due within 90 days
    for (const con of activeConclusions) {
      if (!con.next_review_date) continue;
      const reviewDate = new Date(con.next_review_date);
      const daysUntil = Math.floor((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        candidateAlerts.push({
          alert_type: "readiness_expired",
          source_entity_type: "ReadinessConclusion",
          source_entity_id: con.id,
          cycle_id: con.cycle_id,
          critical_role_id: con.critical_role_id,
          candidacy_id: con.candidacy_id,
          readiness_conclusion_id: con.id,
          severity: "high",
          title: "Readiness conclusion review period expired",
          description: "This readiness conclusion has passed its next review date and is no longer current.",
          due_date: con.next_review_date,
          confidentiality_level: con.confidentiality_level || "confidential",
        });
      } else if (daysUntil <= 90) {
        candidateAlerts.push({
          alert_type: "readiness_review_due",
          source_entity_type: "ReadinessConclusion",
          source_entity_id: con.id,
          cycle_id: con.cycle_id,
          critical_role_id: con.critical_role_id,
          candidacy_id: con.candidacy_id,
          readiness_conclusion_id: con.id,
          severity: daysUntil <= 30 ? "high" : "attention",
          title: `Readiness review due in ${daysUntil} days`,
          description: "This readiness conclusion is approaching its next review date.",
          due_date: con.next_review_date,
          confidentiality_level: con.confidentiality_level || "confidential",
        });
      }
    }

    // 4. Overdue development plan reviews
    for (const plan of activeDevPlans) {
      if (plan.review_date && new Date(plan.review_date) < new Date()) {
        candidateAlerts.push({
          alert_type: "development_review_due",
          source_entity_type: "DevelopmentPlanLink",
          source_entity_id: plan.id,
          candidacy_id: plan.candidacy_id,
          development_plan_link_id: plan.id,
          severity: "attention",
          title: "Development plan review is overdue",
          description: "This development plan has passed its review date.",
          due_date: plan.review_date,
          confidentiality_level: plan.confidentiality_level || "confidential",
        });
      }
    }

    // 5. Overdue development actions
    for (const action of activeDevActions) {
      if (action.due_date && new Date(action.due_date) < new Date()) {
        candidateAlerts.push({
          alert_type: "development_action_overdue",
          source_entity_type: "DevelopmentAction",
          source_entity_id: action.id,
          candidacy_id: action.candidacy_id,
          development_plan_link_id: action.development_plan_link_id,
          development_action_id: action.id,
          severity: "attention",
          title: "Development action is overdue",
          description: "This development action has passed its due date.",
          due_date: action.due_date,
          confidentiality_level: action.confidentiality_level || "confidential",
        });
      }
    }

    // 6. Transition start overdue
    for (const trans of activeTransitions) {
      if (trans.target_start_date && new Date(trans.target_start_date) < new Date()) {
        candidateAlerts.push({
          alert_type: "transition_start_overdue",
          source_entity_type: "TransitionInitiation",
          source_entity_id: trans.id,
          cycle_id: trans.cycle_id,
          critical_role_id: trans.critical_role_id,
          org_position_id: trans.org_position_id,
          transition_initiation_id: trans.id,
          severity: "high",
          title: "Transition target start date has passed",
          description: "This approved transition has passed its target start date.",
          due_date: trans.target_start_date,
          confidentiality_level: trans.confidentiality_level || "confidential",
        });
      }
    }

    // 7. Knowledge transfer overdue
    for (const kt of activeKtPlans) {
      if (kt.target_completion_date && new Date(kt.target_completion_date) < new Date()) {
        candidateAlerts.push({
          alert_type: "knowledge_transfer_overdue",
          source_entity_type: "KnowledgeTransferPlan",
          source_entity_id: kt.id,
          org_position_id: kt.org_position_id,
          transition_initiation_id: kt.transition_initiation_id,
          severity: "attention",
          title: "Knowledge transfer plan is overdue",
          description: "This knowledge transfer plan has passed its target completion date.",
          due_date: kt.target_completion_date,
          confidentiality_level: kt.confidentiality_level || "confidential",
        });
      }
    }

    // 8. Unresolved high transition risks
    for (const tp of transitionPlans) {
      if (!tp.risks) continue;
      const highRisks = tp.risks.filter((r: any) => r.severity === "high" && (r.status === "open" || r.status === "monitoring"));
      if (highRisks.length > 0) {
        candidateAlerts.push({
          alert_type: "unresolved_high_transition_risk",
          source_entity_type: "TransitionPlan",
          source_entity_id: tp.id,
          org_position_id: tp.org_position_id,
          transition_initiation_id: tp.transition_initiation_id,
          severity: "high",
          title: `${highRisks.length} unresolved high transition risk${highRisks.length > 1 ? "s" : ""}`,
          description: "This transition plan has unresolved high-severity risks.",
          confidentiality_level: tp.confidentiality_level || "confidential",
        });
      }
    }

    // ── Filter by confidentiality ──
    const visibleAlerts = candidateAlerts.filter((a: any) =>
      getClearanceRank(a.confidentiality_level) <= getClearanceRank(callerClearance)
    );

    // ── Load existing alerts for this tenant ──
    const existingAlerts = await base44.asServiceRole.entities.SuccessionMonitorAlert.filter({
      client_id: cid,
    }, "-detected_at", SCAN_LIMIT);

    let created = 0, updated = 0, reopened = 0, resolved = 0;

    // ── Process candidate alerts: create or update ──
    for (const ca of visibleAlerts) {
      const fingerprint = computeAlertFingerprint(cid, ca.alert_type, ca.source_entity_type, ca.source_entity_id);
      const existing = existingAlerts.find((a: any) => a.fingerprint === fingerprint);

      if (existing) {
        if (existing.status === "resolved" || existing.status === "dismissed") {
          // Condition recurred — reopen by creating a new alert
          await base44.asServiceRole.entities.SuccessionMonitorAlert.create({
            client_id: cid,
            cycle_id: ca.cycle_id || null,
            critical_role_id: ca.critical_role_id || null,
            org_position_id: ca.org_position_id || null,
            candidacy_id: ca.candidacy_id || null,
            readiness_conclusion_id: ca.readiness_conclusion_id || null,
            development_plan_link_id: ca.development_plan_link_id || null,
            development_action_id: ca.development_action_id || null,
            transition_initiation_id: ca.transition_initiation_id || null,
            source_entity_type: ca.source_entity_type,
            source_entity_id: ca.source_entity_id,
            alert_type: ca.alert_type,
            severity: ca.severity,
            title: ca.title,
            description: ca.description,
            due_date: ca.due_date || null,
            detected_at: now,
            last_detected_at: now,
            fingerprint,
            status: "open",
            confidentiality_level: ca.confidentiality_level,
            integrity_status: "active",
            created_at: now,
            updated_at: now,
          });
          reopened++;
        } else {
          // Update last_detected_at
          await base44.asServiceRole.entities.SuccessionMonitorAlert.update(existing.id, {
            last_detected_at: now,
            updated_at: now,
            severity: ca.severity,
            due_date: ca.due_date || null,
          });
          updated++;
        }
      } else {
        await base44.asServiceRole.entities.SuccessionMonitorAlert.create({
          client_id: cid,
          cycle_id: ca.cycle_id || null,
          critical_role_id: ca.critical_role_id || null,
          org_position_id: ca.org_position_id || null,
          candidacy_id: ca.candidacy_id || null,
          readiness_conclusion_id: ca.readiness_conclusion_id || null,
          development_plan_link_id: ca.development_plan_link_id || null,
          development_action_id: ca.development_action_id || null,
          transition_initiation_id: ca.transition_initiation_id || null,
          source_entity_type: ca.source_entity_type,
          source_entity_id: ca.source_entity_id,
          alert_type: ca.alert_type,
          severity: ca.severity,
          title: ca.title,
          description: ca.description,
          due_date: ca.due_date || null,
          detected_at: now,
          last_detected_at: now,
          fingerprint,
          status: "open",
          confidentiality_level: ca.confidentiality_level,
          integrity_status: "active",
          created_at: now,
          updated_at: now,
        });
        created++;
      }
    }

    // ── Resolve alerts whose condition is no longer present ──
    const candidateFingerprints = new Set(visibleAlerts.map((a: any) =>
      computeAlertFingerprint(cid, a.alert_type, a.source_entity_type, a.source_entity_id)
    ));

    for (const existing of existingAlerts) {
      if (existing.status === "open" || existing.status === "acknowledged") {
        if (!candidateFingerprints.has(existing.fingerprint)) {
          await base44.asServiceRole.entities.SuccessionMonitorAlert.update(existing.id, {
            status: "resolved",
            resolved_at: now,
            resolved_by_profile_id: auth.profile_id,
            resolution_note: "Automatically resolved — underlying condition cleared during refresh.",
            updated_at: now,
          });
          resolved++;
        }
      }
    }

    await writeSuccessionAuditEvent({
      base44,
      action_type: "monitor_refresh",
      target_entity_type: "SuccessionMonitorAlert",
      metadata: { created, updated, reopened, resolved, scan_limit: SCAN_LIMIT },
      client_id_override: cid,
    });

    await completeOperation(base44, opResult.operation.id, null, { created, updated, reopened, resolved });

    return Response.json({
      operation_id,
      created, updated, reopened, resolved,
      scan_limit: SCAN_LIMIT,
      scanned_records: visibleAlerts.length,
    });
  } catch (error) {
    await failOperation(base44, opResult.operation.id, "refresh_monitor_failed");
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

function getCallerClearance(auth: any): string {
  if (auth.isPlatformAdmin) return "legally_restricted";
  const adminRoles = ["Platform Admin", "Platform Administrator", "admin", "Super Administrator", "Admin Level 2", "Admin Level 1"];
  if (adminRoles.includes(auth.role)) return "highly_confidential";
  return "standard";
}