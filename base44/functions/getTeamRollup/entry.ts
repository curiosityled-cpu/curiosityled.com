import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * getTeamRollup — aggregates progress across a manager's team for the Team view.
 * Returns roster with per-member stats, team-level aggregates, team KPIs, and at-risk flags.
 *
 * Access:
 *  - User Level 2: own team only (subordinate_emails).
 *  - Analyst / admins: any manager_email within their org (client_id).
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    if (!currentUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = [
      'User Level 2', 'Analyst', 'Admin Level 1', 'Admin Level 2',
      'Super Administrator', 'Partner Business Administrator', 'Platform Admin'
    ];
    if (!allowedRoles.includes(currentUser.app_role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const managerEmail = body.manager_email || currentUser.email;

    // User Level 2 may only query their own team
    if (currentUser.app_role === 'User Level 2' && managerEmail !== currentUser.email) {
      return Response.json({ error: 'You can only view your own team' }, { status: 403 });
    }

    const clientId = currentUser.client_id;

    // Resolve the manager's subordinate_emails from their full user record
    const allUsers = await base44.asServiceRole.entities.User.list();
    const managerUser = allUsers.find(u => u.email === managerEmail);
    if (!managerUser) return Response.json({ error: 'Manager not found' }, { status: 404 });

    const subordinateEmails = Array.from(new Set((managerUser.subordinate_emails || []).filter(Boolean)));

    const empty = {
      manager_email: managerEmail,
      team_size: 0,
      members: [],
      aggregates: {
        goals: { total: 0, completed: 0, in_progress: 0, completion_pct: 0 },
        journeys: { enrolled: 0, in_progress: 0, completed: 0 },
        assessments: { count: 0, avg_overall_pct: 0, completion_rate: 0 },
        checkins: { total_submitted: 0, participation_pct: 0 },
        kpis: []
      },
      at_risk: []
    };

    if (subordinateEmails.length === 0) {
      return Response.json(empty);
    }

    // Team member profiles
    const members = allUsers.filter(u => subordinateEmails.includes(u.email));
    const emailIn = { $in: subordinateEmails };

    // Fetch all team data in one parallel batch (service-role, scoped in code)
    const [goals, journeys, assessments, checkins, learnerProgress, kpis] = await Promise.all([
      base44.asServiceRole.entities.Goal.filter({ created_by: emailIn }),
      base44.asServiceRole.entities.JourneyEnrollment.filter({ user_email: emailIn }),
      base44.asServiceRole.entities.Assessment.filter({ email: emailIn }),
      base44.asServiceRole.entities.WeeklyCheckIn.filter({ manager_email: managerEmail }),
      base44.asServiceRole.entities.LearnerProgress.filter({ user_email: emailIn }),
      base44.asServiceRole.entities.KPI.filter({ client_id: clientId })
    ]);

    // Per-member stats
    const memberStats = members.map(m => {
      const mGoals = goals.filter(g => g.created_by === m.email);
      const mJourneys = journeys.filter(j => j.user_email === m.email);
      const mAssessments = assessments
        .filter(a => a.email === m.email)
        .sort((a, b) => new Date(b.submission_ts || 0) - new Date(a.submission_ts || 0));
      const mCheckins = checkins
        .filter(c => c.employee_email === m.email)
        .sort((a, b) => new Date(b.week_of || 0) - new Date(a.week_of || 0));
      const mLp = learnerProgress.filter(l => l.user_email === m.email);

      const goalsCompleted = mGoals.filter(g => g.status === 'completed').length;
      const goalsInProgress = mGoals.filter(g => g.status === 'active' || g.status === 'in_progress').length;
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
        goals: { total: mGoals.length, completed: goalsCompleted, in_progress: goalsInProgress, avg_progress: avgProgress },
        journeys: {
          enrolled: mJourneys.length,
          in_progress: mJourneys.filter(j => j.status === 'in_progress').length,
          completed: mJourneys.filter(j => j.status === 'completed').length
        },
        assessments: {
          count: mAssessments.length,
          latest_overall_pct: mAssessments[0]?.overall_pct ?? null,
          latest_date: mAssessments[0]?.submission_ts ?? null,
          latest_band: mAssessments[0]?.band_overall ?? null
        },
        checkins: { submitted_count: mCheckins.length, last_submitted: mCheckins[0]?.week_of ?? null },
        learner_progress: {
          started: mLp.length,
          completed: mLp.filter(l => l.status === 'completed').length,
          in_progress: mLp.filter(l => l.status === 'in_progress').length
        }
      };
    });

    // Team aggregates
    const totalGoals = goals.length;
    const goalsCompleted = goals.filter(g => g.status === 'completed').length;
    const goalsInProgress = goals.filter(g => g.status === 'active' || g.status === 'in_progress').length;
    const scoredAssessments = assessments.filter(a => a.overall_pct != null);
    const avgOverall = scoredAssessments.length > 0
      ? Math.round(scoredAssessments.reduce((s, a) => s + (a.overall_pct || 0), 0) / scoredAssessments.length)
      : 0;
    const assessmentCompletionRate = members.length > 0
      ? Math.round(new Set(scoredAssessments.map(a => a.email)).size / members.length * 100)
      : 0;
    const totalCheckins = checkins.length;
    const checkinParticipation = members.length > 0
      ? Math.round(new Set(checkins.map(c => c.employee_email)).size / members.length * 100)
      : 0;

    // KPIs: team-owned (owner is manager or a direct) + org-wide shared KPIs
    const teamOwnedKpis = kpis.filter(k => k.owner_email && (k.owner_email === managerEmail || subordinateEmails.includes(k.owner_email)));
    const sharedOrgKpis = kpis.filter(k => k.visibility === 'shared' && !k.owner_email);
    const rolledUpKpis = [...teamOwnedKpis, ...sharedOrgKpis].map(k => ({
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
      visibility: k.visibility
    }));

    // At-risk flags
    const atRisk = memberStats.map(m => {
      const reasons = [];
      if (m.assessments.count === 0) reasons.push('No assessment on file');
      if (m.assessments.latest_overall_pct != null && m.assessments.latest_overall_pct < 60) reasons.push('Low assessment score');
      if (m.goals.total === 0) reasons.push('No active goals');
      if (m.checkins.submitted_count === 0) reasons.push('No recent check-ins');
      return reasons.length > 0 ? { email: m.email, full_name: m.full_name, reasons } : null;
    }).filter(Boolean);

    return Response.json({
      manager_email: managerEmail,
      team_size: members.length,
      members: memberStats,
      aggregates: {
        goals: {
          total: totalGoals,
          completed: goalsCompleted,
          in_progress: goalsInProgress,
          completion_pct: totalGoals > 0 ? Math.round(goalsCompleted / totalGoals * 100) : 0
        },
        journeys: {
          enrolled: journeys.length,
          in_progress: journeys.filter(j => j.status === 'in_progress').length,
          completed: journeys.filter(j => j.status === 'completed').length
        },
        assessments: { count: scoredAssessments.length, avg_overall_pct: avgOverall, completion_rate: assessmentCompletionRate },
        checkins: { total_submitted: totalCheckins, participation_pct: checkinParticipation },
        kpis: rolledUpKpis
      },
      at_risk: atRisk
    });
  } catch (error) {
    console.error('getTeamRollup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}