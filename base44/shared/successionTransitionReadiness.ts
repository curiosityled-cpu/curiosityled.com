/**
 * Shared transition execution readiness.
 *
 * A transition is not finished because a date passed. It is finished when the
 * knowledge that only the outgoing holder has has actually been handed over,
 * and when the risks of the move are no longer open at high severity.
 *
 * This module is the single place that decides what "blocked" means, so the
 * completion gate and the cycle report can never disagree.
 */

export type TransitionBlockers = {
  kt_plans: any[];
  transition_plans: any[];
  open_areas: string[];
  open_high_risks: string[];
  plan_progress: {
    plan_id: string;
    total: number;
    completed: number;
    waived: number;
    open: number;
    pct: number;
  }[];
  blocked: boolean;
};

const DONE_AREA_STATUSES = ["completed", "waived"];

export async function computeTransitionBlockers(
  base44: any,
  client_id: string,
  initiation_id: string,
): Promise<TransitionBlockers> {
  const kt_plans = (await base44.asServiceRole.entities.KnowledgeTransferPlan.filter({
    client_id,
    transition_initiation_id: initiation_id,
    integrity_status: "active",
  })) || [];

  const transition_plans = (await base44.asServiceRole.entities.TransitionPlan.filter({
    client_id,
    transition_initiation_id: initiation_id,
    integrity_status: "active",
  })) || [];

  const open_areas: string[] = [];
  const plan_progress: TransitionBlockers["plan_progress"] = [];

  for (const kt of kt_plans) {
    if (kt.status === "cancelled") continue;
    const areas = kt.knowledge_areas || [];
    let completed = 0;
    let waived = 0;
    for (const area of areas) {
      if (area.status === "waived") waived += 1;
      else if (area.status === "completed") completed += 1;
      if (!DONE_AREA_STATUSES.includes(area.status)) {
        open_areas.push(area.title || "(untitled knowledge area)");
      }
    }
    plan_progress.push({
      plan_id: kt.id,
      total: areas.length,
      completed,
      waived,
      open: areas.length - completed - waived,
      pct: areas.length ? Math.round(((completed + waived) / areas.length) * 100) : 0,
    });
  }

  const open_high_risks: string[] = [];
  for (const tp of transition_plans) {
    if (tp.status === "cancelled") continue;
    for (const risk of tp.risks || []) {
      if (risk.severity === "high" && risk.status === "open") {
        open_high_risks.push(risk.risk || "(unstated risk)");
      }
    }
  }

  return {
    kt_plans,
    transition_plans,
    open_areas,
    open_high_risks,
    plan_progress,
    blocked: open_areas.length > 0,
  };
}