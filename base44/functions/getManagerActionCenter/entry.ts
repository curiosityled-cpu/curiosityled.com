import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Returns the manager's "Needs Attention" action center: alerts for overdue goals,
 * off-track KPIs, missed check-ins, stale 1:1s, and declining trends.
 *
 * Each alert includes a suggested action and the backend function to invoke.
 * Payload: { manager_email?: string } — defaults to the authenticated user.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const managerEmail = (user.email || "").toLowerCase().trim();
    const subordinateEmails: string[] = user.data?.subordinate_emails || [];

    if (subordinateEmails.length === 0) {
      return Response.json({ alerts: [], summary: { total: 0, overdue_goals: 0, off_track_kpis: 0, missed_checkins: 0, stale_1on1s: 0, declining_trends: 0 } });
    }

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];

    // Fetch all relevant data in parallel
    const [goals, kpis, recentCheckIns, recentSessions, managerTrends] = await Promise.all([
      base44.asServiceRole.entities.Goal.filter({
        assigned_to_emails: { $in: subordinateEmails },
        status: "active",
      }, "-created_date", 500).catch(() => []),
      base44.asServiceRole.entities.KPI.filter({
        owner_email: { $in: subordinateEmails },
        status: "active",
      }, "-created_date", 200).catch(() => []),
      base44.asServiceRole.entities.DailyCheckIn.filter({
        user_email: { $in: subordinateEmails },
        created_date: { $gte: threeDaysAgo.toISOString() },
      }, "-created_date", 200).catch(() => []),
      base44.asServiceRole.entities.CoachingSession.filter({
        coachee_email: { $in: subordinateEmails },
      }, "-scheduled_date", 200).catch(() => []),
      base44.asServiceRole.entities.ManagerTrends.filter({
        user_email: { $in: subordinateEmails },
      }, "-created_date", 100).catch(() => []),
    ]);

    interface Alert {
      id: string;
      type: "overdue_goal" | "off_track_kpi" | "missed_checkin" | "stale_1on1" | "declining_trend";
      severity: "attention" | "high" | "informational";
      employee_email: string;
      title: string;
      description: string;
      action_label: string;
      action_function: string;
      action_payload: any;
    }

    const alerts: Alert[] = [];

    // 1. Overdue goals
    for (const goal of goals) {
      if (goal.timeframe_end && goal.status === "active" && new Date(goal.timeframe_end) < now && goal.progress < 100) {
        const employee = goal.assigned_to_emails?.[0] || "";
        alerts.push({
          id: `overdue_goal_${goal.id}`,
          type: "overdue_goal",
          severity: "high",
          employee_email: employee,
          title: `Overdue goal: ${goal.title}`,
          description: `Due ${goal.timeframe_end}, ${goal.progress}% complete. Assigned to ${employee}.`,
          action_label: "Adjust Goal",
          action_function: "createNotification",
          action_payload: { user_email: employee, type: "goal_deadline", title: `Goal overdue: ${goal.title}`, message: `This goal was due ${goal.timeframe_end}. Please review and update.` },
        });
      }
    }

    // 2. Off-track KPIs
    for (const kpi of kpis) {
      if (kpi.current_value !== undefined && kpi.target_value !== undefined && kpi.current_value !== null && kpi.target_value !== null) {
        let isOffTrack = false;
        if (kpi.direction === "higher_better" && kpi.current_value < kpi.target_value * 0.75) isOffTrack = true;
        if (kpi.direction === "lower_better" && kpi.current_value > kpi.target_value * 1.25) isOffTrack = true;
        if (isOffTrack) {
          alerts.push({
            id: `off_track_kpi_${kpi.id}`,
            type: "off_track_kpi",
            severity: "attention",
            employee_email: kpi.owner_email || "",
            title: `KPI off track: ${kpi.title}`,
            description: `Current ${kpi.current_value}${kpi.unit || ""} vs target ${kpi.target_value}${kpi.unit || ""} (${kpi.direction}). Owner: ${kpi.owner_email}.`,
            action_label: "Send Nudge",
            action_function: "createNotification",
            action_payload: { user_email: kpi.owner_email, type: "nudge", title: `KPI attention: ${kpi.title}`, message: `Your KPI "${kpi.title}" is off track. Current: ${kpi.current_value}, target: ${kpi.target_value}.` },
          });
        }
      }
    }

    // 3. Missed check-ins (no check-in in 3+ days)
    const checkInByEmail = new Map<string, string>();
    for (const ci of recentCheckIns) {
      if (ci.user_email && !checkInByEmail.has(ci.user_email)) {
        checkInByEmail.set(ci.user_email, ci.created_date);
      }
    }
    for (const email of subordinateEmails) {
      if (!checkInByEmail.has(email)) {
        alerts.push({
          id: `missed_checkin_${email}`,
          type: "missed_checkin",
          severity: "attention",
          employee_email: email,
          title: `No check-in in 3+ days: ${email}`,
          description: `${email} hasn't submitted a daily check-in recently. Consider a gentle nudge.`,
          action_label: "Send Reminder",
          action_function: "createNotification",
          action_payload: { user_email: email, type: "atreus_checkin", title: "Check-in reminder", message: "It's been a few days since your last check-in. Take a moment to share how you're doing." },
        });
      }
    }

    // 4. Stale 1:1s (no session in 45+ days)
    const sessionByEmail = new Map<string, string>();
    for (const s of recentSessions) {
      const sessionDate = s.scheduled_date || s.session_date || s.created_date;
      if (s.coachee_email && (!sessionByEmail.has(s.coachee_email) || new Date(sessionDate) > new Date(sessionByEmail.get(s.coachee_email)!))) {
        sessionByEmail.set(s.coachee_email, sessionDate);
      }
    }
    for (const email of subordinateEmails) {
      const lastSession = sessionByEmail.get(email);
      if (!lastSession || new Date(lastSession) < fortyFiveDaysAgo) {
        alerts.push({
          id: `stale_1on1_${email}`,
          type: "stale_1on1",
          severity: "attention",
          employee_email: email,
          title: `No 1:1 in 45+ days: ${email}`,
          description: lastSession
            ? `Last 1:1 with ${email} was ${lastSession.split("T")[0]}. Consider scheduling a check-in.`
            : `No 1:1 recorded with ${email}. Consider scheduling one.`,
          action_label: "Schedule 1:1",
          action_function: "createOneOnOneCalendarEvent",
          action_payload: { coachee_email: email, coach_email: managerEmail, agenda: "Quarterly check-in" },
        });
      }
    }

    // 5. Declining trends
    for (const trend of managerTrends) {
      const decliningFields = [trend.energy_trend, trend.confidence_trend, trend.resilience_trend, trend.motivation_trend, trend.optimism_trend];
      const decliningCount = decliningFields.filter((f) => f === "declining").length;
      if (decliningCount >= 2) {
        alerts.push({
          id: `declining_trend_${trend.id}`,
          type: "declining_trend",
          severity: "high",
          employee_email: trend.user_email || "",
          title: `Declining trends: ${trend.user_email || ""}`,
          description: `${decliningCount} indicators declining (energy: ${trend.energy_trend}, confidence: ${trend.confidence_trend}, resilience: ${trend.resilience_trend}).`,
          action_label: "Request Feedback",
          action_function: "createNotification",
          action_payload: { user_email: trend.user_email, type: "nudge", title: "How are you doing?", message: "I've noticed some changes in your recent check-ins. I'd love to hear how you're feeling and how I can support you." },
        });
      }
    }

    // Sort by severity (high first, then attention, then informational)
    const severityOrder = { high: 0, attention: 1, informational: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return Response.json({
      alerts,
      summary: {
        total: alerts.length,
        overdue_goals: alerts.filter((a) => a.type === "overdue_goal").length,
        off_track_kpis: alerts.filter((a) => a.type === "off_track_kpi").length,
        missed_checkins: alerts.filter((a) => a.type === "missed_checkin").length,
        stale_1on1s: alerts.filter((a) => a.type === "stale_1on1").length,
        declining_trends: alerts.filter((a) => a.type === "declining_trend").length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}