/**
 * Shared data-fetching + bundle-building logic for HRBP Portfolio and
 * Head-of-HR insights backend functions.
 *
 * Runs as service role (bypasses RLS) so an HRBP can see aggregated signals
 * for managers in their resolved portfolio. Private fields (DailyCheckIn
 * free-text notes, full conversation transcripts) are stripped here — only
 * scores, trends, and commitment summaries are exposed to the HRBP.
 */

export async function fetchManagerSignals(base44, managerEmails) {
  if (!managerEmails || managerEmails.length === 0) {
    return {
      trendsByEmail: {},
      latestDqiByEmail: {},
      lastMeetingByEmail: {},
      goalsByEmail: {},
      lastCheckinByEmail: {},
      commitmentsByEmail: {},
    };
  }

  const emailSet = new Set(managerEmails);

  const [trends, decisions, meetings, goals, checkins, turns] = await Promise.all([
    base44.asServiceRole.entities.ManagerTrends.list(500),
    base44.asServiceRole.entities.DecisionJournal.list(200),
    base44.asServiceRole.entities.MeetingRecord.list(500),
    base44.asServiceRole.entities.Goal.list(500),
    base44.asServiceRole.entities.DailyCheckIn.list(500),
    base44.asServiceRole.entities.AtreusConversationTurn.list(200),
  ]);

  const trendsByEmail = {};
  trends.forEach((t) => {
    if (emailSet.has(t.user_email)) trendsByEmail[t.user_email] = t;
  });

  const latestDqiByEmail = {};
  decisions.forEach((d) => {
    const email = d.user_email;
    if (emailSet.has(email)) {
      if (!latestDqiByEmail[email] || new Date(d.created_date) > new Date(latestDqiByEmail[email].created_date)) {
        latestDqiByEmail[email] = d;
      }
    }
  });

  const lastMeetingByEmail = {};
  meetings.forEach((m) => {
    const email = m.manager_email;
    if (emailSet.has(email)) {
      if (!lastMeetingByEmail[email] || new Date(m.meeting_date) > new Date(lastMeetingByEmail[email].meeting_date)) {
        lastMeetingByEmail[email] = m;
      }
    }
  });

  const goalsByEmail = {};
  goals.forEach((g) => {
    const email = g.created_by;
    if (emailSet.has(email)) {
      if (!goalsByEmail[email]) goalsByEmail[email] = [];
      goalsByEmail[email].push(g);
    }
  });

  const lastCheckinByEmail = {};
  checkins.forEach((c) => {
    const email = c.user_email;
    if (emailSet.has(email)) {
      if (!lastCheckinByEmail[email] || new Date(c.check_in_date) > new Date(lastCheckinByEmail[email].check_in_date)) {
        // Strip private notes — expose only scores and date
        lastCheckinByEmail[email] = {
          check_in_date: c.check_in_date,
          energy_score: c.energy_score,
          confidence_score: c.confidence_score,
          focus_score: c.focus_score,
          load_score: c.load_score,
          growth_score: c.growth_score,
        };
      }
    }
  });

  const commitmentsByEmail = {};
  turns.forEach((t) => {
    if (t.is_commitment && emailSet.has(t.user_email)) {
      if (!commitmentsByEmail[t.user_email]) commitmentsByEmail[t.user_email] = [];
      if (commitmentsByEmail[t.user_email].length < 3) {
        commitmentsByEmail[t.user_email].push({
          commitment_text: t.commitment_text,
          created_date: t.created_date,
        });
      }
    }
  });

  return {
    trendsByEmail,
    latestDqiByEmail,
    lastMeetingByEmail,
    goalsByEmail,
    lastCheckinByEmail,
    commitmentsByEmail,
  };
}

export function buildManagerBundle(user, signals) {
  const email = user.email;
  const mgrTrends = signals.trendsByEmail[email];
  const latestDecision = signals.latestDqiByEmail[email];
  const lastMeeting = signals.lastMeetingByEmail[email];
  const mgrGoals = signals.goalsByEmail[email] || [];
  const lastCheckin = signals.lastCheckinByEmail[email];
  const commitments = signals.commitmentsByEmail[email] || [];

  const now = Date.now();
  const daysSinceLast1on1 = lastMeeting
    ? Math.floor((now - new Date(lastMeeting.meeting_date).getTime()) / 86400000)
    : null;
  const daysSinceLastCheckIn = lastCheckin
    ? Math.floor((now - new Date(lastCheckin.check_in_date).getTime()) / 86400000)
    : null;

  const stalledGoalCount = mgrGoals.filter(
    (g) => g.status === "active" && (g.progress ?? 0) < 25
  ).length;
  const overdueGoalCount = mgrGoals.filter((g) => {
    if (!g.timeframe_end) return false;
    return new Date(g.timeframe_end).getTime() < now && g.status === "active";
  }).length;

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name || user.display_name || user.email,
      display_name: user.display_name,
      current_role: user.current_role,
      department: user.department,
      leadership_level: user.leadership_level,
    },
    trends: mgrTrends
      ? {
          overload_pattern_strength: mgrTrends.overload_pattern_strength,
          operator_risk_trajectory: mgrTrends.operator_risk_trajectory,
          confidence_declining_days: mgrTrends.confidence_declining_days,
          workload_growth_divergence_days: mgrTrends.workload_growth_divergence_days,
          identity_friction_active: mgrTrends.identity_friction_active,
          energy_trend: mgrTrends.energy_trend,
          confidence_trend: mgrTrends.confidence_trend,
          summary_7d: mgrTrends.summary_7d,
        }
      : null,
    latestDecisionDqi: latestDecision?.dqi_state || null,
    dqiCompleteness: latestDecision?.dqi_completeness ?? null,
    daysSinceLast1on1,
    daysSinceLastCheckIn,
    stalledGoalCount,
    overdueGoalCount,
    recentCommitments: commitments,
    lastCheckin: lastCheckin
      ? {
          energy_score: lastCheckin.energy_score,
          confidence_score: lastCheckin.confidence_score,
          load_score: lastCheckin.load_score,
        }
      : null,
  };
}

/**
 * Resolve a list of HRBPPortfolio assignments into a deduplicated manager
 * list. Supports all three assignment types: explicit (manager emails),
 * business_unit (BU/department/team node), and client (whole Client org).
 * Fetches the user list once and resolves all scopes from it.
 */
export async function resolvePortfolioManagers(base44, portfolios) {
  if (!portfolios || portfolios.length === 0) return [];

  const explicitEmails = new Set();
  const buScopes = [];
  const clientIds = new Set();
  for (const p of portfolios) {
    if (p.assignment_type === "explicit" && p.manager_emails) {
      p.manager_emails.forEach((e) => explicitEmails.add(e));
    } else if (p.assignment_type === "business_unit") {
      buScopes.push({
        business_unit: p.business_unit,
        department: p.department,
        team: p.team,
      });
    } else if (p.assignment_type === "client" && p.scope_client_id) {
      clientIds.add(p.scope_client_id);
    }
  }

  const allUsers = await base44.asServiceRole.entities.User.list(500);
  const explicitManagers = resolveExplicitManagers(allUsers, [...explicitEmails]);
  const buManagers = resolveBUManagersFromUsers(allUsers, buScopes);
  const clientManagers = resolveClientManagersFromUsers(allUsers, [...clientIds]);

  const seenEmails = new Set();
  return [...explicitManagers, ...buManagers, ...clientManagers].filter((m) => {
    if (seenEmails.has(m.email)) return false;
    seenEmails.add(m.email);
    return true;
  });
}

/**
 * Resolve managers from BU-scoped portfolio assignments (by department).
 */
export function resolveBUManagersFromUsers(allUsers, buScopes) {
  if (!buScopes || buScopes.length === 0) return [];
  const departments = [...new Set(buScopes.map((s) => s.department).filter(Boolean))];
  if (departments.length === 0) return [];
  return allUsers.filter(
    (u) =>
      departments.includes(u.department) &&
      (u.subordinate_emails?.length > 0 ||
        (u.leadership_level || "").includes("Leading") ||
        u.app_role === "User Level 2")
  );
}

/**
 * Resolve all managers within one or more whole Client organizations.
 */
export function resolveClientManagersFromUsers(allUsers, clientIds) {
  if (!clientIds || clientIds.length === 0) return [];
  return allUsers.filter((u) => {
    const uClientId = u.client_id || u.data?.client_id;
    return (
      clientIds.includes(uClientId) &&
      (u.subordinate_emails?.length > 0 ||
        (u.leadership_level || "").includes("Leading") ||
        u.app_role === "User Level 2")
    );
  });
}

/**
 * Resolve managers from BU-scoped portfolio assignments by querying users
 * in the matching department(s) who appear to be managers.
 */
export async function resolveBUManagers(base44, buScopes) {
  if (!buScopes || buScopes.length === 0) return [];
  const allUsers = await base44.asServiceRole.entities.User.list(500);
  return resolveBUManagersFromUsers(allUsers, buScopes);
}

/**
 * Resolve explicit manager emails to user bundles. If a User record exists,
 * use it; otherwise create a minimal bundle from the email so demo/seed
 * managers without full User profiles still appear in the portfolio.
 */
/**
 * Resolve the full set of manager emails an HRBP can see — their own active
 * portfolio assignments PLUS any active delegations where they are the backup
 * (to_hrbp_email). Returns deduplicated manager records along with the
 * portfolio + delegation summaries used by the HRBP lens and scoping helpers.
 *
 * Shared by resolveHRBPPortfolio (full + scope-only) and getOrgPulseAggregates
 * (HRBP-scoped wellbeing aggregates) so scoping stays consistent.
 */
function isDelegationActive(d) {
  if (d.status !== "active") return false;
  const now = new Date();
  if (d.start_date && new Date(d.start_date) > now) return false;
  if (d.end_date) {
    const end = new Date(d.end_date);
    end.setHours(23, 59, 59, 999);
    if (end < now) return false;
  }
  return true;
}

export async function resolveHRBPManagerEmails(base44, hrbpEmail) {
  // 1. Own active portfolio assignments
  const ownPortfolios = await base44.asServiceRole.entities.HRBPPortfolio.filter({
    hrbp_email: hrbpEmail,
    status: "active",
  });
  const ownManagers = await resolvePortfolioManagers(base44, ownPortfolios);

  // 2. Active delegations TO this HRBP (backup coverage)
  const delegationsRaw = await base44.asServiceRole.entities.HRBPDelegation.filter({
    to_hrbp_email: hrbpEmail,
    status: "active",
  });
  const activeDelegations = delegationsRaw.filter(isDelegationActive);

  // 3. Resolve delegated managers (whole portfolio or single assignment)
  const delegatedManagers = [];
  const delegationSummaries = [];
  for (const d of activeDelegations) {
    let delegatedPortfolios = [];
    if (d.scope === "all") {
      delegatedPortfolios = await base44.asServiceRole.entities.HRBPPortfolio.filter({
        hrbp_email: d.from_hrbp_email,
        status: "active",
      });
    } else if (d.assignment_id) {
      const p = await base44.asServiceRole.entities.HRBPPortfolio
        .get(d.assignment_id)
        .catch(() => null);
      if (p && p.status === "active") delegatedPortfolios = [p];
    }
    const managers = await resolvePortfolioManagers(base44, delegatedPortfolios);
    managers.forEach((m) => {
      delegatedManagers.push({
        ...m,
        delegated_from: d.from_hrbp_email,
        delegation_id: d.id,
      });
    });
    delegationSummaries.push({
      id: d.id,
      from_hrbp_email: d.from_hrbp_email,
      scope: d.scope,
      assignment_id: d.assignment_id,
      start_date: d.start_date,
      end_date: d.end_date,
      reason: d.reason,
      manager_count: managers.length,
    });
  }

  // 4. Combine + dedupe — own portfolio takes precedence over delegated
  const seenEmails = new Set();
  const managers = [];
  for (const m of ownManagers) {
    if (seenEmails.has(m.email)) continue;
    seenEmails.add(m.email);
    managers.push({ ...m, delegated_from: null, delegation_id: null });
  }
  for (const m of delegatedManagers) {
    if (seenEmails.has(m.email)) continue;
    seenEmails.add(m.email);
    managers.push(m);
  }

  return { managers, ownPortfolios, delegationSummaries };
}

export function resolveExplicitManagers(allUsers, explicitEmails) {
  const userMap = {};
  allUsers.forEach((u) => {
    userMap[u.email] = u;
  });
  return explicitEmails.map((email) => {
    if (userMap[email]) return userMap[email];
    const name = email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id: null,
      email,
      full_name: name,
      display_name: name,
      current_role: null,
      department: null,
      leadership_level: null,
    };
  });
}