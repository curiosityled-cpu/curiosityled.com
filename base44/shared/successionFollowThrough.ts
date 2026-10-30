/**
 * Shared development follow-through computation.
 *
 * Used by the follow-through view and by the full cycle report so both show
 * exactly the same numbers. Reads only; never writes or changes readiness.
 *
 * Follow-through answers one question: of the development work that was
 * committed to, what was actually closed, and what is drifting? It is a
 * measure of the plan's execution, not of the person.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function computeDevelopmentFollowThrough(
  base44: any,
  client_id: string,
  cycle_id?: string | null,
) {
  const today = isoDate(new Date());
  const horizon = isoDate(new Date(Date.now() + 14 * DAY_MS));

  const planLinks = (await base44.asServiceRole.entities.DevelopmentPlanLink.filter(
    { client_id, integrity_status: "active" },
    "-created_at",
    200,
  )) || [];

  let links = planLinks;
  if (cycle_id) {
    const candidacies = (await base44.asServiceRole.entities.SuccessorCandidacy.filter(
      { client_id, cycle_id },
      "-created_date",
      500,
    )) || [];
    const inCycle = new Set(candidacies.map((c: any) => c.id));
    links = planLinks.filter((l: any) => inCycle.has(l.candidacy_id));
  }

  const linkIds = new Set(links.map((l: any) => l.id));
  const allActions = (await base44.asServiceRole.entities.DevelopmentAction.filter(
    { client_id, integrity_status: "active" },
    "due_date",
    500,
  )) || [];
  const actions = allActions.filter((a: any) => linkIds.has(a.development_plan_link_id));

  const isOpen = (a: any) => a.status !== "completed" && a.status !== "cancelled";
  const overdue = (a: any) => isOpen(a) && a.due_date && a.due_date < today;
  const dueSoon = (a: any) => isOpen(a) && a.due_date && a.due_date >= today && a.due_date <= horizon;
  const completedLate = (a: any) => a.status === "completed" && a.completion_date && a.due_date && a.completion_date > a.due_date;

  const byStatus = { not_started: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const a of actions) {
    if (byStatus[a.status] !== undefined) byStatus[a.status] += 1;
  }

  const typeMap = new Map<string, any>();
  for (const a of actions) {
    const key = a.action_type || "other";
    if (!typeMap.has(key)) typeMap.set(key, { action_type: key, total: 0, completed: 0, overdue: 0 });
    const row = typeMap.get(key);
    row.total += 1;
    if (a.status === "completed") row.completed += 1;
    if (overdue(a)) row.overdue += 1;
  }

  const planRows = links.map((link: any) => {
    const mine = actions.filter((a: any) => a.development_plan_link_id === link.id);
    const active = mine.filter((a: any) => a.status !== "cancelled");
    const overdueCount = mine.filter(overdue).length;
    const nextDue = active.filter(isOpen).map((a: any) => a.due_date).filter(Boolean).sort()[0] || null;
    return {
      plan_link_id: link.id,
      candidacy_id: link.candidacy_id,
      total: active.length,
      completed: mine.filter((a: any) => a.status === "completed").length,
      overdue: overdueCount,
      closure_pct: active.length ? Math.round((mine.filter((a: any) => a.status === "completed").length / active.length) * 100) : 0,
      next_due_date: nextDue,
    };
  });

  const completedOnTime = actions.filter(
    (a: any) => a.status === "completed" && a.completion_date && a.due_date && a.completion_date <= a.due_date,
  ).length;
  const completedTotal = byStatus.completed;

  return {
    today,
    horizon,
    scope: {
      cycle_id: cycle_id || null,
      plans: links.length,
    },
    totals: {
      actions: actions.length,
      ...byStatus,
      overdue: actions.filter(overdue).length,
      due_soon: actions.filter(dueSoon).length,
      completed_late: actions.filter(completedLate).length,
      stalled: actions.filter((a: any) => a.status === "in_progress" && a.due_date && a.due_date < today).length,
    },
    closure: {
      completed: completedTotal,
      on_time: completedOnTime,
      late: completedTotal - completedOnTime,
      on_time_rate: completedTotal ? Math.round((completedOnTime / completedTotal) * 100) : null,
      open_of_committed: actions.filter(isOpen).length,
    },
    by_type: Array.from(typeMap.values()).sort((a, b) => b.total - a.total),
    plans: planRows.sort((a, b) => b.overdue - a.overdue || a.closure_pct - b.closure_pct),
    overdue_actions: actions
      .filter(overdue)
      .map((a: any) => ({
        action_id: a.id,
        title: a.title,
        action_type: a.action_type,
        due_date: a.due_date,
        days_overdue: Math.max(
          1,
          Math.round((new Date(today).getTime() - new Date(a.due_date).getTime()) / DAY_MS),
        ),
        owner_profile_id: a.owner_profile_id,
        plan_link_id: a.development_plan_link_id,
      }))
      .sort((a: any, b: any) => b.days_overdue - a.days_overdue)
      .slice(0, 20),
  };
}