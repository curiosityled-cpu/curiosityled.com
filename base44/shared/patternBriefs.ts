/**
 * patternBriefs — normalize ManagerTrends + at-risk goals into pattern briefs,
 * and diff against a user's active workout recommendations.
 *
 * Used by refreshPatternWorkouts (nightly) and could be reused by on-demand flows.
 */

export interface PatternBrief {
  pattern_id: string;
  label: string;
  evidence: string[];
  strength: number;
  competency: string;
  type: 'skill' | 'task';
  user_context: string;
  modality_hint?: string;
}

/**
 * Build pattern briefs from a user's ManagerTrends record + active goals.
 * Each brief is either "skill" (build a competency) or "task" (work through a real situation).
 */
export async function buildPatternBriefs(
  base44: any,
  user: any,
  trends: any,
  goals: any[],
): Promise<PatternBrief[]> {
  const briefs: PatternBrief[] = [];
  const userContext = `${user.app_role || user.role || 'manager'}`;

  // ── Skill briefs (from trends) ──
  if (trends?.identity_friction_active) {
    briefs.push({
      pattern_id: 'identity_friction',
      label: 'Leadership identity friction',
      evidence: ['Identity friction signals detected in recent check-ins'],
      strength: 72,
      competency: 'Self Leadership',
      type: 'skill',
      user_context: userContext,
      modality_hint: 'roleplay',
    });
  }

  if (trends?.overload_pattern_strength && trends.overload_pattern_strength >= 55) {
    briefs.push({
      pattern_id: 'overload',
      label: 'Overload pattern',
      evidence: [`Overload pattern strength at ${trends.overload_pattern_strength}%`],
      strength: trends.overload_pattern_strength,
      competency: 'Tactical',
      type: 'skill',
      user_context: userContext,
      modality_hint: 'reflection',
    });
  }

  if (trends?.confidence_trend === 'declining') {
    briefs.push({
      pattern_id: 'declining_confidence',
      label: 'Declining confidence',
      evidence: ['Confidence trend declining over recent check-ins'],
      strength: 66,
      competency: 'Self Leadership',
      type: 'skill',
      user_context: userContext,
      modality_hint: 'scenario',
    });
  }

  // ── Task briefs (from trends + real goals) ──
  if (trends?.delegation_gap_count_7d && trends.delegation_gap_count_7d >= 2) {
    briefs.push({
      pattern_id: 'delegation_gap',
      label: 'Delegation gap',
      evidence: [`${trends.delegation_gap_count_7d} delegation gaps identified this week`],
      strength: 62,
      competency: 'People Leadership',
      type: 'task',
      user_context: userContext,
      modality_hint: 'scenario',
    });
  }

  const now = Date.now();
  const atRiskGoals = (goals || []).filter((g: any) => {
    if (g.status !== 'active' || !g.timeframe_end) return false;
    const due = new Date(g.timeframe_end).getTime();
    const days = Math.floor((due - now) / 86400000);
    return days >= 0 && days <= 14 && (g.progress || 0) < 60;
  });
  atRiskGoals.slice(0, 2).forEach((g: any) => {
    const due = new Date(g.timeframe_end).getTime();
    const daysLeft = Math.floor((due - now) / 86400000);
    briefs.push({
      pattern_id: `goal_${g.id}`,
      label: g.title || 'At-risk goal',
      evidence: [g.description || `Goal at ${g.progress || 0}% with ${daysLeft} days left`],
      strength: 60,
      competency: 'Tactical',
      type: 'task',
      user_context: userContext,
      modality_hint: 'scenario',
    });
  });

  // Sort by strength descending
  return briefs.sort((a, b) => b.strength - a.strength);
}

/**
 * Diff a user's active workout recommendations against the current briefs.
 * Returns { to_create, to_expire, active_count }.
 * - to_create: briefs not already covered by an active workout (capped to keep active <= 3).
 * - to_expire: active recs whose source pattern is quiet, or that are 7-day unstarted.
 */
export interface DiffOptions {
  maxActive?: number;
  unstartedExpiryDays?: number;
}

export async function diffActiveWorkouts(
  base44: any,
  userEmail: string,
  briefs: PatternBrief[],
  options?: DiffOptions,
): Promise<{ to_create: PatternBrief[]; to_expire: any[]; active_count: number }> {
  const maxActive = options?.maxActive ?? 3;
  const unstartedExpiryDays = options?.unstartedExpiryDays ?? 7;
  // Fetch all conversational_module recommendations for the user
  let recs: any[] = [];
  try {
    recs = await base44.entities.LearningRecommendation.filter({
      user_email: userEmail,
      resource_type: 'conversational_module',
    });
  } catch { recs = []; }

  // Only consider pending/viewed as "active"
  const activeRecs = recs.filter((r: any) => r.status === 'pending' || r.status === 'viewed');

  // Load linked modules to read source_pattern_id
  const moduleIds = activeRecs.map((r: any) => r.resource_id).filter(Boolean);
  const modulesById: Record<string, any> = {};
  if (moduleIds.length > 0) {
    try {
      const modules = await base44.entities.ConversationalLearningModule.filter({ id: { $in: moduleIds } });
      (modules || []).forEach((m: any) => { modulesById[m.id] = m; });
    } catch { /* ignore */ }
  }

  const activePatternIds = new Set<string>();
  activeRecs.forEach((r: any) => {
    const mod = modulesById[r.resource_id];
    const pid = mod?.source_pattern_id;
    if (pid) activePatternIds.add(pid);
  });

  const briefPatternIds = new Set(briefs.map((b) => b.pattern_id));

  // to_expire: pattern quiet (not in briefs) or 7-day unstarted
  const now = Date.now();
  const to_expire: any[] = [];
  for (const r of activeRecs) {
    const mod = modulesById[r.resource_id];
    const pid = mod?.source_pattern_id;
    if (pid && !briefPatternIds.has(pid)) {
      to_expire.push({ recommendation_id: r.id, module_id: r.resource_id, reason: 'pattern_quiet' });
      continue;
    }
    if (r.status === 'pending') {
      const generated = r.generated_date ? new Date(r.generated_date).getTime() : 0;
      if (generated && (now - generated) > unstartedExpiryDays * 86400000) {
        to_expire.push({ recommendation_id: r.id, module_id: r.resource_id, reason: 'unstarted_7d' });
      }
    }
  }

  // to_create: briefs not in activePatternIds
  const uncovered = briefs.filter((b) => !activePatternIds.has(b.pattern_id));

  // Cap active at 3 (accounting for expirations)
  const remainingActive = activeRecs.length - to_expire.length;
  const allowedCreate = Math.max(0, maxActive - remainingActive);
  const to_create = uncovered.slice(0, allowedCreate);

  return { to_create, to_expire, active_count: activeRecs.length };
}