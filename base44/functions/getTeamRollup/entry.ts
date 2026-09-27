import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import {
  buildReportingTree,
  deriveDirectReports,
} from "../../shared/teamHierarchy.ts";
import { resolveHRBPManagerEmails } from "../../shared/portfolioData.ts";

// ── Leadership-level → Team Landscape layout tier ─────────────────────────
// Levels 1-5 mirror the Competency Matrix. "hipo" is treated as Level 1 for
// layout purposes (IC-style roster). Null/undefined → auto-detect from depth.
const LEVEL_TIER = {
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, hipo: 1,
};

function resolveLeaderLevel(user, allUsers) {
  const explicit = user?.leadership_level ?? user?.data?.leadership_level;
  if (explicit && LEVEL_TIER[String(explicit)]) return LEVEL_TIER[String(explicit)];
  // Auto-detect from reporting-tree depth (number of layers below this user).
  const tree = buildReportingTree(allUsers, user.email, 10);
  // depth = max generations below root (0 = no reports, 1 = only directs, etc.)
  let maxDepth = 0;
  for (const node of tree) {
    const d = node.depth ?? 0;
    if (d > maxDepth) maxDepth = d;
  }
  if (maxDepth === 0) return 1;          // no reports → Leading Self
  if (maxDepth === 1) return 2;          // only directs, no managers below → Leading Others
  if (maxDepth === 2) return 3;          // managers of managers → Leading Managers
  if (maxDepth === 3) return 4;          // function-level → Leading Functions
  return 5;                              // org-level → Leading Organizations
}

// Build a per-direct-report subtree aggregate card.
// For each direct report, compute rolled-up health across everyone in their
// reporting subtree (inclusive).
function buildSubtreeCards(allUsers, directReports, goals, journeys, assessments, checkins, kpis) {
  const byManager = new Map();
  for (const u of allUsers) {
    if (!u.email) continue;
    const key = u.manager_email;
    if (!key) continue;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key).push(u);
  }

  // Recursive subtree email collector
  const collectSubtree = (email, seen = new Set()) => {
    if (!email || seen.has(email)) return [];
    seen.add(email);
    const children = byManager.get(email) || [];
    let all = [email];
    for (const child of children) {
      all = all.concat(collectSubtree(child.email, seen));
    }
    return all;
  };

  return directReports.map((dr) => {
    const subtreeEmails = collectSubtree(dr.email);
    const subtreeSet = new Set(subtreeEmails);
    const sGoals = goals.filter((g) => subtreeSet.has(g.created_by));
    const sJourneys = journeys.filter((j) => subtreeSet.has(j.user_email));
    const sAssessments = assessments.filter((a) => subtreeSet.has(a.email));
    const sCheckins = checkins.filter((c) => subtreeSet.has(c.employee_email));
    const gCompleted = sGoals.filter((g) => g.status === "completed").length;
    const scored = sAssessments.filter((a) => a.overall_pct != null);
    const avgPct = scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + (a.overall_pct || 0), 0) / scored.length)
      : null;
    const participation = subtreeEmails.length > 0
      ? Math.round((new Set(sCheckins.map((c) => c.employee_email)).size / subtreeEmails.length) * 100)
      : 0;

    // At-risk count within subtree (excluding the lead themselves)
    const subtreeMembers = allUsers.filter((u) => subtreeSet.has(u.email) && u.email !== dr.email);
    const atRiskCount = subtreeMembers.filter((m) => {
      const mGoals = sGoals.filter((g) => g.created_by === m.email);
      const mAssess = sAssessments.filter((a) => a.email === m.email);
      const mCheckins = sCheckins.filter((c) => c.employee_email === m.email);
      if (mAssess.length === 0) return true;
      if (mAssess[0]?.overall_pct != null && mAssess[0].overall_pct < 60) return true;
      if (mGoals.length === 0) return true;
      if (mCheckins.length === 0) return true;
      return false;
    }).length;

    return {
      email: dr.email,
      full_name: dr.full_name,
      current_role: dr.current_role,
      subtree_size: subtreeEmails.length,
      goals: {
        total: sGoals.length,
        completed: gCompleted,
        completion_pct: sGoals.length > 0 ? Math.round((gCompleted / sGoals.length) * 100) : 0,
      },
      journeys: {
        enrolled: sJourneys.length,
        in_progress: sJourneys.filter((j) => j.status === "in_progress").length,
        completed: sJourneys.filter((j) => j.status === "completed").length,
      },
      assessments: {
        count: scored.length,
        avg_overall_pct: avgPct,
      },
      checkins: { participation_pct: participation },
      at_risk_count: atRiskCount,
      kpis: (kpis || []).filter((k) => k.owner_email === dr.email).map((k) => ({
        id: k.id,
        title: k.title,
        current_value: k.current_value,
        target_value: k.target_value,
        unit: k.unit,
        progress: k.progress,
        direction: k.direction,
        status: k.status,
      })),
    };
  });
}

// Synthesize a Team Pulse narrative from structured signals via InvokeLLM.
async function synthesizeTeamPulse(base44, signals, clientId) {
  const { at_risk_count, stalled_goals, checkin_gap, avg_assessment_pct, subtree_cards } = signals;
  const prompt = `You are an executive coach reviewing a manager's team pulse for the week.
Synthesize a single situational read in 2-3 sentences. Lead with a headline count of who/what needs attention this week, then 1-2 sentences of context. Be direct, warm, and specific. Do not use bullet points or headers.

Team signals:
- People needing attention (at-risk): ${at_risk_count}
- Stalled or overdue goals: ${stalled_goals}
- Check-in participation gap (people who haven't checked in): ${checkin_gap}
- Average assessment score across team: ${avg_assessment_pct ?? "no data"}%
- Direct reports: ${subtree_cards.length}

Return only the synthesized paragraph.`;
  try {
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          body: { type: "string" },
        },
        required: ["headline", "body"],
      },
    });
    return { headline: res.headline, body: res.body };
  } catch (e) {
    console.warn("Team Pulse synthesis failed:", e.message);
    return null;
  }
}

/**
 * getTeamRollup — role-aware team rollup spanning the full reporting tree.
 *
 * Scope + detail by role:
 *  - User Level 2 (rollup manager):  vertical scope, directs-only detail.
 *      Full assessment results for directs; aggregated-only for the rest of the tree.
 *  - Analyst / Executive:            enterprise scope, aggregated-only (no individual scores).
 *  - HRBP:                           portfolio scope, full detail.
 *  - Admin Level 1/2, Super Admin, Platform Admin, Partner BA: enterprise scope, full detail.
 *
 * Response includes scope_type, detail_level, scope_label, scope_size, detail_size,
 * members (per-member stats — empty when aggregated-only), aggregates, at_risk, kpis.
 */
const ROLE_CONFIG = {
  "User Level 2":                   { scope: "vertical",   detail: "directs",    label: "Your Team" },
  Analyst:                          { scope: "enterprise", detail: "aggregated", label: "Enterprise" },
  Executive:                        { scope: "enterprise", detail: "aggregated", label: "Enterprise" },
  HRBP:                             { scope: "portfolio",  detail: "full",        label: "My Portfolio" },
  "Admin Level 1":                  { scope: "enterprise", detail: "full",      label: "Enterprise" },
  "Admin Level 2":                  { scope: "enterprise", detail: "full",      label: "Enterprise" },
  "Super Administrator":           { scope: "enterprise", detail: "full",      label: "Enterprise" },
  "Platform Admin":                { scope: "enterprise", detail: "full",      label: "Enterprise" },
  "Partner Business Administrator": { scope: "enterprise", detail: "full",      label: "Enterprise" },
};

const emptyAggregates = () => ({
  goals: { total: 0, completed: 0, in_progress: 0, completion_pct: 0 },
  journeys: { enrolled: 0, in_progress: 0, completed: 0 },
  assessments: { count: 0, avg_overall_pct: 0, completion_rate: 0 },
  checkins: { total_submitted: 0, participation_pct: 0 },
  kpis: [],
});

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    if (!currentUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const role = currentUser.app_role;
    const config = ROLE_CONFIG[role];
    if (!config) return Response.json({ error: "Insufficient permissions" }, { status: 403 });

    const clientId = currentUser.client_id;
    const allUsers = await base44.asServiceRole.entities.User.list(500);

    // ── Resolve leadership level (explicit field or auto from depth) ──
    const leaderLevel = resolveLeaderLevel(currentUser, allUsers);

    // ── Resolve scope + detail email sets ─────────────────────────────
    let scopeEmails = [];
    let detailEmails = [];

    if (config.scope === "vertical") {
      const tree = buildReportingTree(allUsers, currentUser.email, 10);
      scopeEmails = tree.map((u) => u.email).filter(Boolean);
      const directs = deriveDirectReports(allUsers, currentUser.email);
      const directSet = new Set(directs.map((u) => u.email));
      detailEmails = [...directSet].filter((e) => scopeEmails.includes(e));
      // Fallback: if no directs resolved but tree has people, use first-level children
      if (detailEmails.length === 0 && scopeEmails.length > 0) {
        detailEmails = allUsers
          .filter((u) => u.manager_email === currentUser.email && scopeEmails.includes(u.email))
          .map((u) => u.email);
      }
    } else if (config.scope === "enterprise") {
      let enterpriseUsers;
      if (role === "Platform Admin") {
        enterpriseUsers = allUsers;
      } else if (role === "Partner Business Administrator") {
        const partnerClientIds = currentUser.partner_client_ids || currentUser.data?.partner_client_ids || [];
        enterpriseUsers = allUsers.filter((u) => partnerClientIds.includes(u.client_id));
      } else {
        enterpriseUsers = allUsers.filter((u) => u.client_id === clientId);
      }
      scopeEmails = enterpriseUsers.map((u) => u.email).filter(Boolean).filter((e) => e !== currentUser.email);
      if (config.detail === "full") detailEmails = [...scopeEmails];
    } else if (config.scope === "portfolio") {
      const { managers } = await resolveHRBPManagerEmails(base44, currentUser.email);
      scopeEmails = managers.map((m) => m.email).filter(Boolean);
      detailEmails = [...scopeEmails];
    }

    const base = {
      scope_type: config.scope,
      detail_level: config.detail,
      scope_label: config.label,
      scope_size: scopeEmails.length,
      detail_size: detailEmails.length,
      leader_level: leaderLevel,
      members: [],
      aggregates: emptyAggregates(),
      at_risk: [],
      subtree_cards: [],
      team_pulse: null,
    };

    if (scopeEmails.length === 0) {
      return Response.json(base);
    }

    const emailIn = { $in: scopeEmails };
    const partnerClientIds = currentUser.partner_client_ids || currentUser.data?.partner_client_ids || [];

    // ── Fetch all scoped data in parallel ──────────────────────────────
    const [goals, journeys, assessments, checkins, learnerProgress, kpisRaw] = await Promise.all([
      base44.asServiceRole.entities.Goal.filter({ created_by: emailIn }, "-created_date", 500),
      base44.asServiceRole.entities.JourneyEnrollment.filter({ user_email: emailIn }, "-created_date", 500),
      base44.asServiceRole.entities.Assessment.filter({ email: emailIn }, "-submission_ts", 500),
      base44.asServiceRole.entities.WeeklyCheckIn.filter({ employee_email: emailIn }, "-week_of", 500),
      base44.asServiceRole.entities.LearnerProgress.filter({ user_email: emailIn }, "-created_date", 500),
      role === "Platform Admin"
        ? base44.asServiceRole.entities.KPI.list(500)
        : role === "Partner Business Administrator"
          ? base44.asServiceRole.entities.KPI.filter({ client_id: { $in: partnerClientIds } }, "-created_date", 500)
          : base44.asServiceRole.entities.KPI.filter({ client_id: clientId }, "-created_date", 500),
    ]);

    // ── Aggregates across the full scope ───────────────────────────────
    const totalGoals = goals.length;
    const goalsCompleted = goals.filter((g) => g.status === "completed").length;
    const goalsInProgress = goals.filter((g) => g.status === "active" || g.status === "in_progress").length;
    const scoredAssessments = assessments.filter((a) => a.overall_pct != null);
    const avgOverall = scoredAssessments.length > 0
      ? Math.round(scoredAssessments.reduce((s, a) => s + (a.overall_pct || 0), 0) / scoredAssessments.length)
      : 0;
    const assessmentCompletionRate = scopeEmails.length > 0
      ? Math.round((new Set(scoredAssessments.map((a) => a.email)).size / scopeEmails.length) * 100)
      : 0;
    const totalCheckins = checkins.length;
    const checkinParticipation = scopeEmails.length > 0
      ? Math.round((new Set(checkins.map((c) => c.employee_email)).size / scopeEmails.length) * 100)
      : 0;

    // KPI scoping: enterprise = all fetched; vertical/portfolio = owned-in-scope + shared org-wide
    let scopedKpis;
    if (config.scope === "enterprise") {
      scopedKpis = kpisRaw;
    } else {
      const scopeSet = new Set(scopeEmails);
      scopedKpis = kpisRaw.filter(
        (k) => (k.owner_email && scopeSet.has(k.owner_email)) || (k.visibility === "shared" && !k.owner_email)
      );
    }
    const rolledUpKpis = scopedKpis.map((k) => ({
      id: k.id,
      title: k.title,
      owner_email: k.owner_email || null,
      current_value: k.current_value,
      target_value: k.target_value,
      unit: k.unit,
      progress: k.progress,
      status: k.status,
      direction: k.direction,
      linked_goal_ids: k.linked_goal_ids || [],
      visibility: k.visibility,
    }));

    const aggregates = {
      goals: {
        total: totalGoals,
        completed: goalsCompleted,
        in_progress: goalsInProgress,
        completion_pct: totalGoals > 0 ? Math.round((goalsCompleted / totalGoals) * 100) : 0,
      },
      journeys: {
        enrolled: journeys.length,
        in_progress: journeys.filter((j) => j.status === "in_progress").length,
        completed: journeys.filter((j) => j.status === "completed").length,
      },
      assessments: { count: scoredAssessments.length, avg_overall_pct: avgOverall, completion_rate: assessmentCompletionRate },
      checkins: { total_submitted: totalCheckins, participation_pct: checkinParticipation },
      kpis: rolledUpKpis,
    };

    // ── Per-member detail (full / directs only — never for aggregated) ─
    let members = [];
    let atRisk = [];

    if (config.detail !== "aggregated" && detailEmails.length > 0) {
      const detailSet = new Set(detailEmails);
      const detailUsers = allUsers.filter((u) => detailSet.has(u.email));

      members = detailUsers.map((m) => {
        const mGoals = goals.filter((g) => g.created_by === m.email);
        const mJourneys = journeys.filter((j) => j.user_email === m.email);
        const mAssessments = assessments
          .filter((a) => a.email === m.email)
          .sort((a, b) => new Date(b.submission_ts || 0) - new Date(a.submission_ts || 0));
        const mCheckins = checkins
          .filter((c) => c.employee_email === m.email)
          .sort((a, b) => new Date(b.week_of || 0) - new Date(a.week_of || 0));
        const mLp = learnerProgress.filter((l) => l.user_email === m.email);

        const gCompleted = mGoals.filter((g) => g.status === "completed").length;
        const gInProgress = mGoals.filter((g) => g.status === "active" || g.status === "in_progress").length;
        const avgProgress = mGoals.length > 0
          ? Math.round(mGoals.reduce((s, g) => s + (g.progress_percentage || g.progress || 0), 0) / mGoals.length)
          : 0;

        return {
          id: m.id,
          email: m.email,
          full_name: m.full_name,
          current_role: m.current_role,
          app_role: m.app_role,
          manager_email: m.manager_email,
          goals: { total: mGoals.length, completed: gCompleted, in_progress: gInProgress, avg_progress: avgProgress },
          journeys: {
            enrolled: mJourneys.length,
            in_progress: mJourneys.filter((j) => j.status === "in_progress").length,
            completed: mJourneys.filter((j) => j.status === "completed").length,
          },
          assessments: {
            count: mAssessments.length,
            latest_overall_pct: mAssessments[0]?.overall_pct ?? null,
            latest_date: mAssessments[0]?.submission_ts ?? null,
            latest_band: mAssessments[0]?.band_overall ?? null,
          },
          checkins: { submitted_count: mCheckins.length, last_submitted: mCheckins[0]?.week_of ?? null },
          learner_progress: {
            started: mLp.length,
            completed: mLp.filter((l) => l.status === "completed").length,
            in_progress: mLp.filter((l) => l.status === "in_progress").length,
          },
          kpis: scopedKpis.filter((k) => k.owner_email === m.email).map((k) => ({
            id: k.id,
            title: k.title,
            current_value: k.current_value,
            target_value: k.target_value,
            unit: k.unit,
            progress: k.progress,
            direction: k.direction,
            status: k.status,
          })),
        };
      });

      atRisk = members
        .map((m) => {
          const reasons = [];
          if (m.assessments.count === 0) reasons.push("No assessment on file");
          if (m.assessments.latest_overall_pct != null && m.assessments.latest_overall_pct < 60) reasons.push("Low assessment score");
          if (m.goals.total === 0) reasons.push("No active goals");
          if (m.checkins.submitted_count === 0) reasons.push("No recent check-ins");
          return reasons.length > 0 ? { email: m.email, full_name: m.full_name, reasons } : null;
        })
        .filter(Boolean);
    }

    // ── Subtree cards (Level 3+ — each direct report leads a sub-team) ──
    let subtreeCards = [];
    if (leaderLevel >= 3 && config.scope === "vertical") {
      const directs = deriveDirectReports(allUsers, currentUser.email);
      if (directs.length > 0) {
        subtreeCards = buildSubtreeCards(allUsers, directs, goals, journeys, assessments, checkins, scopedKpis);
      }
    }

    // ── Team Pulse synthesis (structured signals → natural-language read) ──
    const pulseSignals = {
      at_risk_count: atRisk.length,
      stalled_goals: goals.filter((g) => g.status === "active" || g.status === "in_progress").length - goals.filter((g) => (g.status === "active" || g.status === "in_progress") && (g.progress_percentage || g.progress || 0) > 0).length,
      checkin_gap: scopeEmails.length - new Set(checkins.map((c) => c.employee_email)).size,
      avg_assessment_pct: avgOverall || null,
      subtree_cards: subtreeCards,
    };
    const teamPulse = await synthesizeTeamPulse(base44, pulseSignals, clientId);

    return Response.json({
      ...base,
      members,
      aggregates,
      at_risk: atRisk,
      subtree_cards: subtreeCards,
      team_pulse: teamPulse,
    });
  } catch (error) {
    console.error("getTeamRollup error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}