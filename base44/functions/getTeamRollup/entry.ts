import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import {
  buildReportingTree,
  deriveDirectReports,
} from "../../shared/teamHierarchy.ts";
import { resolveHRBPManagerEmails } from "../../shared/portfolioData.ts";

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
      members: [],
      aggregates: emptyAggregates(),
      at_risk: [],
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

    return Response.json({
      ...base,
      members,
      aggregates,
      at_risk: atRisk,
    });
  } catch (error) {
    console.error("getTeamRollup error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}