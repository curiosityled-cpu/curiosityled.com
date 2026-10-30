import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";

/**
 * POST /successionCycleReport
 *
 * The report a board pack, an auditor or a works council asks for: everything
 * that happened in one succession cycle, assembled server-side and returned as
 * flat, exportable sections.
 *
 * Read-only. It composes what already exists rather than recomputing judgement:
 *   coverage     — bench behind every critical role (ratified conclusions only)
 *   readiness    — the value in force for every candidate
 *   decisions    — every decision record, including those awaiting ratification
 *   development  — actions and whether they reached closure (follow-through)
 *   transitions  — transitions and the state of each knowledge-transfer plan
 *   compliance   — holds, notices and sealed-demographic counts (aggregate only)
 *   evidence     — evidence records by state
 *
 * Sealed demographic attributes are never read here: only how many exist, so
 * the report can state that adverse-impact analysis is possible without ever
 * carrying the values themselves.
 */

const COMPLETE_AREA_STATES = ["complete", "completed", "done", "transferred"];

export default async function (req) {
  const base44 = createClientFromRequest(req);

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44,
    auth,
    action: "successionCycleReport",
    target_client_id: auth.client_id,
    required_permission: "succession.cycles.view",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const cycleId = String(body.cycle_id || "").trim();
  if (!cycleId) return Response.json({ error: "cycle_id is required" }, { status: 400 });

  const clientId = auth.client_id;
  const entities = base44.asServiceRole.entities;

  const tenantRows = async (entity, limit) => {
    try {
      const rows = await entities[entity].filter({ client_id: clientId }, "-created_date", limit || 2000);
      return rows || [];
    } catch {
      return [];
    }
  };

  const fetchByIds = async (entity, ids) => {
    const pending = Array.from(new Set(ids.filter(Boolean)));
    const out = [];
    while (pending.length) {
      const chunk = pending.splice(0, 100);
      try {
        const rows = await entities[entity].filter({ id: { $in: chunk } }, "-created_date", 500);
        if (rows) out.push(...rows);
      } catch {
        /* a chunk failure must not empty the whole report */
      }
    }
    return out;
  };

  try {
    const cycleRows = await entities.SuccessionCycle.filter({ id: cycleId, client_id: clientId });
    const cycle = cycleRows && cycleRows[0];
    if (!cycle) return Response.json({ error: "Cycle not found" }, { status: 404 });

    const [roles, candidacies, conclusions, decisions, transitions, holds, notices, sealed, evidenceAll, planLinks, actions, ktPlans] =
      await Promise.all([
        tenantRows("CriticalRole"),
        tenantRows("SuccessorCandidacy"),
        tenantRows("ReadinessConclusion", 4000),
        tenantRows("SuccessionDecisionRecord"),
        tenantRows("TransitionInitiation"),
        tenantRows("SuccessionLegalHold"),
        tenantRows("SuccessionCandidateNotice"),
        tenantRows("SuccessionSealedDemographic"),
        tenantRows("EvidenceRecord", 4000),
        tenantRows("DevelopmentPlanLink"),
        tenantRows("DevelopmentAction", 4000),
        tenantRows("KnowledgeTransferPlan"),
      ]);

    const cycleRoles = roles.filter((r) => r.cycle_id === cycleId && r.status !== "removed");
    const cycleCandidacies = candidacies.filter((c) => c.cycle_id === cycleId);
    const candidacyIds = new Set(cycleCandidacies.map((c) => c.id));
    const cycleDecisions = decisions.filter((d) => d.cycle_id === cycleId);
    const cycleTransitions = transitions.filter((t) => t.cycle_id === cycleId);
    const transitionIds = new Set(cycleTransitions.map((t) => t.id));

    const cyclePlanLinks = planLinks.filter((p) => candidacyIds.has(p.candidacy_id));
    const planLinkIds = new Set(cyclePlanLinks.map((p) => p.id));
    const cycleActions = actions.filter(
      (a) => candidacyIds.has(a.candidacy_id) || planLinkIds.has(a.development_plan_link_id),
    );
    const cycleKtPlans = ktPlans.filter((k) => transitionIds.has(k.transition_initiation_id));
    const cycleEvidence = evidenceAll.filter((e) => candidacyIds.has(e.candidacy_id));

    const [positions, profiles] = await Promise.all([
      fetchByIds("OrgPosition", [
        ...cycleRoles.map((r) => r.org_position_id),
        ...cycleTransitions.map((t) => t.org_position_id),
      ]),
      fetchByIds("UserProfile", [
        ...cycleCandidacies.map((c) => c.user_profile_id),
        ...cycleTransitions.map((t) => t.successor_profile_id),
      ]),
    ]);

    const roleTitleById = new Map();
    for (const p of positions) if (p && p.id) roleTitleById.set(p.id, p.title || p.position_identifier || "Untitled role");
    const profileById = new Map();
    for (const p of profiles) if (p && p.id) profileById.set(p.id, p);

    const candidateName = (id) => {
      const p = profileById.get(id);
      return p ? p.full_name || p.display_name || p.email || null : null;
    };
    const candidateEmail = (id) => {
      const p = profileById.get(id);
      return p ? p.email || null : null;
    };
    const roleTitle = (roleId) => {
      const role = cycleRoles.find((r) => r.id === roleId) || roles.find((r) => r.id === roleId);
      return role ? roleTitleById.get(role.org_position_id) || "Untitled role" : null;
    };

    // Latest ratified conclusion per candidacy — the value in force right now.
    const inForce = new Map();
    for (const conclusion of conclusions) {
      if (!candidacyIds.has(conclusion.candidacy_id)) continue;
      if (conclusion.workflow_status !== "ratified" && conclusion.workflow_status !== "overridden") continue;
      if (conclusion.integrity_status === "quarantined") continue;
      const existing = inForce.get(conclusion.candidacy_id);
      if (!existing || (conclusion.version || 0) > (existing.version || 0)) inForce.set(conclusion.candidacy_id, conclusion);
    }

    const coverageRows = cycleRoles
      .map((role) => {
        const roleCandidacies = cycleCandidacies.filter(
          (c) => c.critical_role_id === role.id && c.status === "active" && c.integrity_status !== "quarantined",
        );
        let readyNow = 0;
        let conditional = 0;
        let emerging = 0;
        let other = 0;
        for (const c of roleCandidacies) {
          const value = inForce.get(c.id) ? inForce.get(c.id).ratified_value : null;
          if (value === "ready_now") readyNow += 1;
          else if (value === "ready_with_conditions") conditional += 1;
          else if (value === "emerging") emerging += 1;
          else other += 1;
        }
        const coverage = readyNow > 0 ? "covered" : conditional > 0 ? "thin" : "gap";
        return {
          role: roleTitleById.get(role.org_position_id) || "Untitled role",
          criticality: role.criticality_level || null,
          status: role.status || null,
          pool_size: roleCandidacies.length,
          ready_now: readyNow,
          ready_with_conditions: conditional,
          emerging,
          no_decision: other,
          coverage,
        };
      })
      .sort((a, b) => String(a.coverage).localeCompare(String(b.coverage)) || String(a.role).localeCompare(String(b.role)));

    const readinessRows = cycleCandidacies
      .filter((c) => c.integrity_status !== "quarantined")
      .map((c) => {
        const conclusion = inForce.get(c.id);
        return {
          candidate: candidateName(c.user_profile_id) || candidateEmail(c.user_profile_id) || "(unresolved person)",
          email: candidateEmail(c.user_profile_id),
          role: roleTitle(c.critical_role_id),
          candidacy_status: c.status,
          value_in_force: conclusion ? conclusion.ratified_value : null,
          decided_at: conclusion ? conclusion.proposed_at || null : null,
          next_review: conclusion ? conclusion.next_review_date || null : null,
          version: conclusion ? conclusion.version || null : null,
        };
      })
      .sort((a, b) => String(a.role || "").localeCompare(String(b.role || "")));

    const decisionRows = cycleDecisions
      .slice()
      .sort((a, b) => String(b.recorded_at || "").localeCompare(String(a.recorded_at || "")))
      .map((d) => ({
        role: d.role_title || roleTitle(d.role_id) || null,
        decision: d.decision_type,
        selected: d.selected_candidate_name || d.selected_candidate_email || null,
        readiness: d.selected_readiness_value || null,
        status: d.status,
        version: d.version || 1,
        recorded_by: d.recorded_by_email || null,
        recorded_at: d.recorded_at || null,
        ratified_by: d.ratified_by_email || null,
        ratified_at: d.ratified_at || null,
      }));

    const countableActions = cycleActions.filter((a) => a.status !== "cancelled");
    const completedActions = countableActions.filter((a) => a.status === "completed");
    const followThrough = countableActions.length
      ? Math.round((completedActions.length / countableActions.length) * 100)
      : null;

    const developmentRows = cycleActions
      .slice()
      .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))
      .map((a) => {
        const candidacy = cycleCandidacies.find((c) => c.id === a.candidacy_id);
        return {
          candidate: candidacy ? candidateName(candidacy.user_profile_id) : null,
          action: a.title,
          type: a.action_type || null,
          due_date: a.due_date || null,
          status: a.status,
          completed_at: a.completion_date || null,
          outcome: a.outcome_notes ? "recorded" : null,
        };
      });

    const transitionRows = cycleTransitions.map((t) => {
      const plan = cycleKtPlans.find((k) => k.transition_initiation_id === t.id);
      const areas = plan && Array.isArray(plan.knowledge_areas) ? plan.knowledge_areas : [];
      const transferred = areas.filter((area) =>
        COMPLETE_AREA_STATES.includes(String((area && (area.status || area.transfer_status)) || "").toLowerCase()),
      ).length;
      return {
        role: roleTitleById.get(t.org_position_id) || roleTitle(t.critical_role_id) || null,
        successor: candidateName(t.successor_profile_id) || null,
        type: t.initiation_type,
        status: t.status,
        target_start: t.target_start_date || null,
        approved_at: t.approved_at || null,
        knowledge_plan: plan ? plan.status : "none",
        knowledge_areas: areas.length,
        areas_transferred: transferred,
      };
    });

    const activeHolds = holds.filter((h) => h.status === "active");
    const holdRows = holds
      .slice()
      .sort((a, b) => String(b.placed_at || "").localeCompare(String(a.placed_at || "")))
      .map((h) => ({
        scope: h.scope_type,
        subject: h.subject_email || (h.cycle_id === cycleId ? "this cycle" : h.target_entity_id || null),
        status: h.status,
        reason: h.reason || null,
        placed_by: h.placed_by_email || null,
        placed_at: h.placed_at || null,
        released_at: h.released_at || null,
      }));

    const cycleNotices = notices.filter((n) => n.cycle_id === cycleId);
    const noticeRows = cycleNotices.map((n) => ({
      type: n.notice_type,
      role: n.role_title || null,
      candidate: n.subject_email || null,
      status: n.status,
      version: n.version || 1,
      sent_at: n.sent_at || null,
      acknowledged_at: n.acknowledged_at || null,
    }));

    const sealedActive = sealed.filter((s) => s.status === "sealed").length;
    const sealedPurged = sealed.filter((s) => s.status === "purged").length;

    const evidenceCounts = new Map();
    for (const e of cycleEvidence) {
      const key = e.status || "unknown";
      evidenceCounts.set(key, (evidenceCounts.get(key) || 0) + 1);
    }
    const evidenceRows = Array.from(evidenceCounts.entries())
      .map(([state, records]) => ({ state, records }))
      .sort((a, b) => b.records - a.records);

    const sections = [
      {
        key: "coverage",
        title: "Bench behind every critical role",
        note: "Counts ratified readiness only — a proposal nobody countersigned is not bench.",
        columns: [
          { key: "role", label: "Critical role" },
          { key: "criticality", label: "Criticality" },
          { key: "pool_size", label: "Candidates" },
          { key: "ready_now", label: "Ready now" },
          { key: "ready_with_conditions", label: "Ready with conditions" },
          { key: "emerging", label: "Emerging" },
          { key: "no_decision", label: "No decision" },
          { key: "coverage", label: "Coverage" },
        ],
        rows: coverageRows,
      },
      {
        key: "readiness",
        title: "Readiness in force",
        note: "The value each candidate stands at today, and when it was set.",
        columns: [
          { key: "candidate", label: "Candidate" },
          { key: "email", label: "Email" },
          { key: "role", label: "For role" },
          { key: "candidacy_status", label: "Candidacy" },
          { key: "value_in_force", label: "Readiness in force" },
          { key: "decided_at", label: "Set at" },
          { key: "next_review", label: "Next review" },
        ],
        rows: readinessRows,
      },
      {
        key: "decisions",
        title: "Decisions recorded",
        note: "Includes decisions still awaiting ratification — an unratified decision is still a fact.",
        columns: [
          { key: "role", label: "Role" },
          { key: "decision", label: "Decision" },
          { key: "selected", label: "Selected" },
          { key: "readiness", label: "Readiness" },
          { key: "status", label: "Status" },
          { key: "recorded_by", label: "Recorded by" },
          { key: "recorded_at", label: "Recorded at" },
          { key: "ratified_by", label: "Ratified by" },
          { key: "ratified_at", label: "Ratified at" },
        ],
        rows: decisionRows,
      },
      {
        key: "development",
        title: "Development follow-through",
        note: "Every action raised to close a gap, and whether it reached closure.",
        columns: [
          { key: "candidate", label: "Candidate" },
          { key: "action", label: "Action" },
          { key: "type", label: "Type" },
          { key: "due_date", label: "Due" },
          { key: "status", label: "Status" },
          { key: "completed_at", label: "Completed at" },
          { key: "outcome", label: "Outcome" },
        ],
        rows: developmentRows,
      },
      {
        key: "transitions",
        title: "Transitions and knowledge transfer",
        note: "Each transition into the role, and how much knowledge has actually moved.",
        columns: [
          { key: "role", label: "Role" },
          { key: "successor", label: "Successor" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "target_start", label: "Target start" },
          { key: "knowledge_plan", label: "Knowledge plan" },
          { key: "knowledge_areas", label: "Areas" },
          { key: "areas_transferred", label: "Transferred" },
        ],
        rows: transitionRows,
      },
      {
        key: "holds",
        title: "Legal holds",
        note: "Nothing under an active hold may be purged, withdrawn or changed.",
        columns: [
          { key: "scope", label: "Scope" },
          { key: "subject", label: "Applies to" },
          { key: "status", label: "Status" },
          { key: "reason", label: "Reason" },
          { key: "placed_by", label: "Placed by" },
          { key: "placed_at", label: "Placed at" },
          { key: "released_at", label: "Released at" },
        ],
        rows: holdRows,
      },
      {
        key: "notices",
        title: "Candidate notices",
        note: "What each candidate has been told about their own record.",
        columns: [
          { key: "type", label: "Notice" },
          { key: "candidate", label: "Candidate" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
          { key: "sent_at", label: "Sent at" },
          { key: "acknowledged_at", label: "Acknowledged at" },
        ],
        rows: noticeRows,
      },
      {
        key: "evidence",
        title: "Evidence records by state",
        note: "What the judgements in this report were built on.",
        columns: [
          { key: "state", label: "State" },
          { key: "records", label: "Records" },
        ],
        rows: evidenceRows,
      },
    ];

    const latest = Array.from(inForce.values());
    const ratifiedDecisions = cycleDecisions.filter((d) => d.status === "ratified").length;
    const summary = {
      critical_roles: cycleRoles.length,
      candidates: cycleCandidacies.filter((c) => c.status === "active").length,
      ready_now: latest.filter((c) => c.ratified_value === "ready_now").length,
      ready_with_conditions: latest.filter((c) => c.ratified_value === "ready_with_conditions").length,
      roles_covered: coverageRows.filter((r) => r.coverage === "covered").length,
      roles_thin: coverageRows.filter((r) => r.coverage === "thin").length,
      roles_gap: coverageRows.filter((r) => r.coverage === "gap").length,
      decisions_ratified: ratifiedDecisions,
      decisions_awaiting: cycleDecisions.filter((d) => d.status === "awaiting_ratification").length,
      development_actions: countableActions.length,
      development_completed: completedActions.length,
      follow_through_rate: followThrough,
      transitions_active: cycleTransitions.filter((t) => ["requested", "approved", "in_progress"].includes(String(t.status))).length,
      transitions_completed: cycleTransitions.filter((t) => t.status === "completed").length,
      active_holds: activeHolds.length,
      notices_sent: cycleNotices.filter((n) => n.status === "sent" || n.status === "acknowledged").length,
      sealed_demographics: sealedActive,
      sealed_purged: sealedPurged,
      adverse_impact_possible: sealedActive > 0 && ratifiedDecisions > 0,
    };

    return Response.json({
      report: {
        cycle: {
          id: cycle.id,
          name: cycle.name || cycle.cycle_key || cycle.id.slice(-8),
          cycle_key: cycle.cycle_key || null,
          status: cycle.status || null,
          process_stage: cycle.process_stage || null,
          started_at: cycle.started_at || null,
          closed_at: cycle.closed_at || null,
          confidentiality_level: cycle.confidentiality_level || null,
        },
        generated_at: new Date().toISOString(),
        generated_by_email: auth.user_email || null,
        summary,
        sections,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}