import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

/**
 * Aggregates all performance-relevant records for one employee into a chronological timeline feed.
 * Sources: Goals (with evidence_entries), KPIs (with value_history), CoachingSessions,
 * DailyCheckIns, WeeklyCheckIns, CustomFormSubmissions (review forms).
 *
 * Payload: { employee_email: string }
 * Returns: { timeline: TimelineItem[], employee: { email, name, department } }
 */
export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { employee_email } = body;
    if (!employee_email) {
      return Response.json({ error: "employee_email is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const email = employee_email.toLowerCase().trim();

    // Fetch all sources in parallel using service role for aggregation
    const [goals, kpis, coachingSessions, dailyCheckIns, weeklyCheckIns, reviewSubs] = await Promise.all([
      base44.asServiceRole.entities.Goal.filter({ assigned_to_emails: { $in: [email] } }, "-created_date", 200).catch(() => []),
      base44.asServiceRole.entities.KPI.filter({ owner_email: email }, "-created_date", 100).catch(() => []),
      base44.asServiceRole.entities.CoachingSession.filter({ coachee_email: email }, "-scheduled_date", 100).catch(() => []),
      base44.asServiceRole.entities.DailyCheckIn.filter({ user_email: email }, "-created_date", 100).catch(() => []),
      base44.asServiceRole.entities.WeeklyCheckIn.filter({ user_email: email }, "-created_date", 50).catch(() => []),
      base44.asServiceRole.entities.CustomFormSubmission.filter({ linked_employee_email: email }, "-submitted_at", 50).catch(() => []),
    ]);

    interface TimelineItem {
      date: string;
      type: string;
      title: string;
      description: string;
      source: string;
      metadata: any;
    }

    const timeline: TimelineItem[] = [];

    // Goals → progress milestones + evidence entries
    for (const goal of goals) {
      timeline.push({
        date: goal.created_date || goal.timeframe_start || "",
        type: "goal_created",
        title: `Goal set: ${goal.title}`,
        description: goal.description || "",
        source: "curiosity_led",
        metadata: { goal_id: goal.id, progress: goal.progress, status: goal.status },
      });
      if (goal.evidence_entries && goal.evidence_entries.length > 0) {
        for (const entry of goal.evidence_entries) {
          timeline.push({
            date: entry.date || entry.added_at || "",
            type: "evidence",
            title: `${entry.note_type}: ${goal.title}`,
            description: entry.description,
            source: entry.source || "manual",
            metadata: {
              goal_id: goal.id,
              note_type: entry.note_type,
              visibility: entry.visibility,
              added_by: entry.added_by_email,
              tags: entry.tags,
            },
          });
        }
      }
    }

    // KPIs → value_history entries
    for (const kpi of kpis) {
      if (kpi.value_history && kpi.value_history.length > 0) {
        for (const vh of kpi.value_history) {
          timeline.push({
            date: vh.date,
            type: "kpi_value",
            title: `${kpi.title}: ${vh.value}${kpi.unit || ""}`,
            description: `KPI value recorded via ${vh.source}`,
            source: vh.source || "manual",
            metadata: { kpi_id: kpi.id, kpi_title: kpi.title, value: vh.value, target: kpi.target_value },
          });
        }
      }
    }

    // Coaching sessions
    for (const session of coachingSessions) {
      timeline.push({
        date: session.scheduled_date || session.session_date || session.created_date || "",
        type: "coaching_session",
        title: `Coaching session: ${session.status || "scheduled"}`,
        description: session.agenda || session.pre_session_notes || session.notes || "",
        source: "curiosity_led",
        metadata: { session_id: session.id, coach: session.coach_email, status: session.status },
      });
    }

    // Daily check-ins
    for (const ci of dailyCheckIns) {
      timeline.push({
        date: ci.created_date || ci.check_in_date || "",
        type: "daily_checkin",
        title: `Daily check-in: ${ci.energy_level ? `Energy ${ci.energy_level}` : "submitted"}`,
        description: ci.notes || ci.reflection || ci.focus || "",
        source: "curiosity_led",
        metadata: { checkin_id: ci.id, energy: ci.energy_level, workload: ci.workload_level, mood: ci.mood },
      });
    }

    // Weekly check-ins
    for (const wci of weeklyCheckIns) {
      timeline.push({
        date: wci.created_date || wci.check_in_date || "",
        type: "weekly_checkin",
        title: `Weekly check-in`,
        description: wci.reflection || wci.notes || wci.wins || "",
        source: "curiosity_led",
        metadata: { checkin_id: wci.id },
      });
    }

    // Review submissions
    for (const sub of reviewSubs) {
      timeline.push({
        date: sub.submitted_at || sub.created_date || "",
        type: "review",
        title: `${sub.submitter_role || "Review"} submission`,
        description: sub.responses?.overall_rating ? `Rating: ${sub.responses.overall_rating}` : "",
        source: "curiosity_led",
        metadata: {
          submission_id: sub.id,
          review_cycle_id: sub.review_cycle_id,
          submitter_role: sub.submitter_role,
          acknowledged: !!sub.acknowledged_at,
          rating: sub.responses?.overall_rating,
        },
      });
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());

    // Derive employee info from the first goal or check-in
    const employeeInfo = {
      email: email,
      name: goals[0]?.members?.find((m: any) => m.user_email === email)?.user_name || email,
      department: goals[0]?.department || kpis[0]?.department || "",
    };

    return Response.json({
      timeline,
      employee: employeeInfo,
      counts: {
        goals: goals.length,
        kpis: kpis.length,
        coaching_sessions: coachingSessions.length,
        daily_checkins: dailyCheckIns.length,
        weekly_checkins: weeklyCheckIns.length,
        reviews: reviewSubs.length,
        total_items: timeline.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}