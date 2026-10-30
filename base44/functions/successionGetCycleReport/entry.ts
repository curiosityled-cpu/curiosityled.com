import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { bootstrapSuccessionAuth } from "../../shared/successionAuthBootstrap.ts";
import { authorizeSuccessionAction } from "../../shared/authorizeSuccessionAction.ts";
import { validateSameTenantReference } from "../../shared/successionCrossTenantValidation.ts";
import { computeDevelopmentFollowThrough } from "../../shared/successionFollowThrough.ts";
import { computeTransitionBlockers } from "../../shared/successionTransitionReadiness.ts";

/**
 * POST /successionGetCycleReport
 *
 * The full-cycle report: one assembled, reproducible picture of what a
 * succession cycle actually did — the roles in scope, the candidates and their
 * ratified readiness, the decisions and how they were disposed of, whether the
 * bench holds up, how development is following through, which transitions are
 * finished or blocked, and the compliance posture (holds, candidate notices,
 * sealed demographics).
 *
 * Read-only. Never writes, never ranks people, and every number is derived from
 * the same shared computations the individual screens use, so an exported
 * report cannot disagree with the screen it came from.
 */
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { operation_id, cycle_id } = body;

  if (!operation_id) {
    return Response.json({ error: "operation_id required" }, { status: 400 });
  }

  const auth = await bootstrapSuccessionAuth(base44);
  if (!auth.client_id) return Response.json({ error: "Tenant resolution failed — no client_id" }, { status: 403 });

  const authz = await authorizeSuccessionAction({
    base44, auth, action: "successionGetCycleReport",
    target_client_id: auth.client_id,
    required_permission: "succession.export",
  });
  if (!authz.allowed) return Response.json({ error: authz.denied_reason }, { status: 403 });

  try {
    const client_id = auth.client_id;

    // ── Cycle in scope ──
    let cycle: any = null;
    if (cycle_id) {
      cycle = await validateSameTenantReference(base44, "SuccessionCycle", cycle_id, client_id);
    }
    if (!cycle) {
      const recent = await base44.asServiceRole.entities.SuccessionCycle.filter(
        { client_id }, "-created_date", 5,
      );
      cycle = recent?.[0] || null;
    }
    if (!cycle) {
      return Response.json({ error: "No succession cycle found for this organization" }, { status: 404 });
    }

    const [candidacies, criticalRoles, conclusions, evidence, decisions, transitions] = await Promise.all([
      base44.asServiceRole.entities.SuccessorCandidacy.filter({ client_id, cycle_id: cycle.id }, "-created_date", 500),
      base44.asServiceRole.entities.CriticalRole.filter({ client_id }, "-created_date", 500),
      base44.asServiceRole.entities.ReadinessConclusion.filter({ client_id }, "-updated_date", 500),
      base44.asServiceRole.entities.EvidenceRecord.filter({ client_id }, "-created_date", 500),
      base44.asServiceRole.entities.SuccessionDecisionRecord.filter({ client_id, cycle_id: cycle.id }, "-recorded_at", 200),
      base44.asServiceRole.entities.TransitionInitiation.filter({ client_id }, "-created_date", 200),
    ]);

    const [holds, notices, demographics] = await Promise.all([
      base44.asServiceRole.entities.SuccessionLegalHold.filter({ client_id }, "-placed_at", 200),
      base44.asServiceRole.entities.SuccessionCandidateNotice.filter({ client_id, cycle_id: cycle.id }, "-drafted_at", 500),
      base44.asServiceRole.entities.SuccessionSealedDemographic.filter({ client_id }, "-collected_at", 1000).catch(() => []),
    ]);

    let auditCount: number | null = null;
    try {
      auditCount = await base44.asServiceRole.entities.SuccessionAuditEvent.count({ client_id });
    } catch {
      auditCount = null;
    }

    const candidateList = candidacies || [];

    // ── Ratified readiness, latest per candidacy ──
    const conclusionByCandidacy = new Map<string, any>();
    for (const c of conclusions || []) {
      if (!c.candidacy_id) continue;
      const held = conclusionByCandidacy.get(c.candidacy_id);
      const stamp = c.ratified_at || c.updated_date || c.created_date || "";
      const heldStamp = held ? held.ratified_at || held.updated_date || held.created_date || "" : "";
      if (!held || stamp > heldStamp) conclusionByCandidacy.set(c.candidacy_id, c);
    }

    const readinessCounts: Record<string, number> = {};
    const candidateRows = candidateList.map((c: any) => {
      const conclusion = conclusionByCandidacy.get(c.id);
      const value = conclusion?.ratified_readiness_value || conclusion?.readiness_value || null;
      const ratified = Boolean(conclusion?.ratified_at);
      const label = ratified ? value : "not_ratified";
      readinessCounts[label] = (readinessCounts[label] || 0) + 1;
      return {
        candidacy_id: c.id,
        candidate: c.candidate_name || c.candidate_email || c.candidate_ref || c.user_profile_id || "—",
        critical_role_id: c.critical_role_id || null,
        status: c.status || null,
        readiness: ratified ? value : null,
        readiness_state: ratified ? "ratified" : value ? "proposed_only" : "no_conclusion",
      };
    });

    const evidenceList = evidence || [];
    const evidenceByCandidacy = new Map<string, number>();
    for (const e of evidenceList) {
      if (!e.candidacy_id) continue;
      evidenceByCandidacy.set(e.candidacy_id, (evidenceByCandidacy.get(e.candidacy_id) || 0) + 1);
    }
    for (const row of candidateRows) {
      (row as any).evidence_count = evidenceByCandidacy.get(row.candidacy_id) || 0;
    }

    // ── Decisions ──
    const decisionList = decisions || [];
    const decisionByRole = new Map<string, any>();
    for (const d of decisionList) {
      if (!d.role_id) continue;
      const held = decisionByRole.get(d.role_id);
      if (!held || (d.version || 1) >= (held.version || 1)) decisionByRole.set(d.role_id, d);
    }
    const decisionCounts = {
      total: decisionList.length,
      ratified: decisionList.filter((d: any) => d.status === "ratified").length,
      awaiting_ratification: decisionList.filter((d: any) => d.status === "awaiting_ratification").length,
      returned: decisionList.filter((d: any) => d.status === "returned").length,
      superseded: decisionList.filter((d: any) => d.status === "superseded").length,
    };

    // ── Roles and bench ──
    const roles = (criticalRoles || []).filter((r: any) => r.status !== "retired");
    const candidatesByRole = new Map<string, any[]>();
    for (const c of candidateList) {
      if (!c.critical_role_id) continue;
      if (!candidatesByRole.has(c.critical_role_id)) candidatesByRole.set(c.critical_role_id, []);
      candidatesByRole.get(c.critical_role_id)!.push(c);
    }
    const READY_VALUES = ["ready_now", "ready_with_conditions"];
    const roleRows = roles.map((r: any) => {
      const mine = candidatesByRole.get(r.id) || [];
      const ready = mine.filter((c: any) => {
        const conclusion = conclusionByCandidacy.get(c.id);
        return conclusion?.ratified_at && READY_VALUES.includes(conclusion.ratified_readiness_value || conclusion.readiness_value);
      }).length;
      const decision = decisionByRole.get(r.id) || null;
      return {
        role_id: r.id,
        role: r.title || r.name || "(untitled role)",
        candidates: mine.length,
        ready,
        decision: decision ? `${decision.decision_type} (${decision.status})` : "no decision recorded",
      };
    });
    const bench = {
      roles: roleRows.length,
      roles_with_ready: roleRows.filter((r) => r.ready > 0).length,
      roles_without_ready: roleRows.filter((r) => r.ready === 0).length,
      single_bench_roles: roleRows.filter((r) => r.ready === 1).length,
    };

    // ── Transitions, and which are actually unblocked ──
    const transitionList = transitions || [];
    const liveTransitions = transitionList.filter((t: any) => t.status === "in_progress" || t.status === "approved");
    const blockedTransitions: any[] = [];
    for (const t of liveTransitions.slice(0, 25)) {
      const blockers = await computeTransitionBlockers(base44, client_id, t.id);
      if (blockers.blocked) {
        blockedTransitions.push({
          initiation_id: t.id,
          open_areas: blockers.open_areas,
        });
      }
    }

    // ── Development follow-through (same computation as the follow-through screen) ──
    const development = await computeDevelopmentFollowThrough(base44, client_id, cycle.id);

    // ── Compliance posture ──
    const compliance = {
      active_legal_holds: (holds || []).filter((h: any) => h.status === "active").length,
      legal_holds_total: (holds || []).length,
      notices_sent: (notices || []).filter((n: any) => n.status === "sent").length,
      notices_acknowledged: (notices || []).filter((n: any) => n.status === "acknowledged").length,
      notices_draft: (notices || []).filter((n: any) => n.status === "draft").length,
      sealed_demographic_rows: (demographics || []).filter((d: any) => d.status === "sealed").length,
    };

    const report = {
      generated_at: new Date().toISOString(),
      generated_by: auth.email || null,
      cycle: {
        id: cycle.id,
        name: cycle.name || cycle.cycle_name || cycle.key || "(unnamed cycle)",
        status: cycle.status || null,
        stage: cycle.process_stage || null,
        start_date: cycle.start_date || null,
        end_date: cycle.end_date || cycle.target_end_date || null,
      },
      scope: {
        candidacies: candidateList.length,
        roles_in_scope: roleRows.length,
        evidence_records: evidenceList.length,
      },
      bench,
      readiness: readinessCounts,
      evidence: {
        total: evidenceList.length,
        draft: evidenceList.filter((e: any) => e.status === "draft" || e.status === "submitted").length,
        accepted: evidenceList.filter((e: any) => e.status === "accepted" || e.status === "reviewed").length,
      },
      decisions: decisionCounts,
      development,
      transitions: {
        total: transitionList.length,
        live: liveTransitions.length,
        completed: transitionList.filter((t: any) => t.status === "completed").length,
        blocked: blockedTransitions.length,
        blocked_detail: blockedTransitions,
      },
      compliance,
      audit: { events_recorded: auditCount },
      rows: {
        roles: roleRows,
        candidates: candidateRows,
      },
    };

    return Response.json({ operation_id, report });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}