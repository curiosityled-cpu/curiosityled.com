/**
 * Manager status derivation — maps existing trend/signal data into a
 * 3-band status (high_priority / watch / stable) with human-readable reasons.
 *
 * Reuses existing data only — does not invent new signals.
 * Used by the HRBP Portfolio page and the Head-of-HR aggregation view.
 */

const SIGNAL_DEFINITIONS = [
  {
    key: 'overload_rising',
    label: 'Overload rising',
    test: (ctx) => (ctx.trends?.overload_pattern_strength ?? 0) > 60,
    weight: 2,
  },
  {
    key: 'operator_risk_increasing',
    label: 'Operator-mode risk increasing',
    test: (ctx) => {
      const t = ctx.trends?.operator_risk_trajectory;
      return t === 'declining' || t === 'increasing';
    },
    weight: 2,
  },
  {
    key: 'confidence_declining',
    label: 'Confidence declining',
    test: (ctx) => (ctx.trends?.confidence_declining_days ?? 0) >= 3,
    weight: 1,
  },
  {
    key: 'workload_growth_divergence',
    label: 'Workload outpacing growth',
    test: (ctx) => (ctx.trends?.workload_growth_divergence_days ?? 0) >= 3,
    weight: 1,
  },
  {
    key: 'decision_quality_dropping',
    label: 'Decision quality declining',
    test: (ctx) => {
      const dqi = ctx.latestDecisionDqi;
      return dqi === 'early_draft' || (ctx.dqiCompleteness ?? 5) <= 1;
    },
    weight: 2,
  },
  {
    key: 'one_on_one_slipping',
    label: '1:1 cadence slipping',
    test: (ctx) => (ctx.daysSinceLast1on1 ?? 0) > 21,
    weight: 1,
  },
  {
    key: 'goals_stalling',
    label: 'Goals stalling',
    test: (ctx) => (ctx.stalledGoalCount ?? 0) > 0 || (ctx.overdueGoalCount ?? 0) > 0,
    weight: 1,
  },
  {
    key: 'disengagement_signal',
    label: 'Disengagement signal',
    test: (ctx) => (ctx.daysSinceLastCheckIn ?? 0) > 7,
    weight: 1,
  },
  {
    key: 'identity_friction',
    label: 'Identity friction active',
    test: (ctx) => ctx.trends?.identity_friction_active === true,
    weight: 2,
  },
];

/**
 * Derive a manager's status from available context data.
 * @param {Object} ctx - { trends, latestDecisionDqi, dqiCompleteness, daysSinceLast1on1, stalledGoalCount, overdueGoalCount, daysSinceLastCheckIn }
 * @returns {{ band: 'high_priority'|'watch'|'stable', reasons: Array<{key,label,weight}>, score: number, trend: 'improving'|'stable'|'declining' }}
 */
export function deriveManagerStatus(ctx = {}) {
  const reasons = SIGNAL_DEFINITIONS
    .filter((s) => s.test(ctx))
    .map((s) => ({ key: s.key, label: s.label, weight: s.weight }));

  const score = reasons.reduce((sum, r) => sum + r.weight, 0);

  let band;
  if (score >= 4 || reasons.some((r) => r.weight === 2 && r.key === 'overload_rising' && (ctx.trends?.overload_pattern_strength ?? 0) > 80)) {
    band = 'high_priority';
  } else if (score >= 1) {
    band = 'watch';
  } else {
    band = 'stable';
  }

  // Trend direction: improving if overload decreasing + confidence improving, declining if opposite
  let trend = 'stable';
  const t = ctx.trends;
  if (t) {
    const improvingSignals = (t.overload_pattern_strength < 30) && (t.confidence_declining_days === 0);
    const decliningSignals = (t.overload_pattern_strength > 60) || (t.confidence_declining_days >= 5);
    if (improvingSignals) trend = 'improving';
    else if (decliningSignals) trend = 'declining';
  }

  return { band, reasons, score, trend };
}

export const BAND_LABELS = {
  high_priority: { label: 'High Priority', short: 'Priority', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', dot: 'bg-red-500' },
  watch: { label: 'Watch', short: 'Watch', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200', dot: 'bg-amber-500' },
  stable: { label: 'Stable', short: 'Stable', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

export const TREND_LABELS = {
  improving: { label: 'Improving', icon: '↑', color: 'text-emerald-600' },
  stable: { label: 'Stable', icon: '→', color: 'text-gray-500' },
  declining: { label: 'Declining', icon: '↓', color: 'text-red-600' },
};

/**
 * Aggregate a list of manager statuses into portfolio-level counts.
 * @param {Array<{band}>} statuses
 * @returns {{ total, high_priority, watch, stable, support_needed, support_pct }}
 */
export function aggregatePortfolioStatus(statuses) {
  const total = statuses.length;
  const high_priority = statuses.filter((s) => s.band === 'high_priority').length;
  const watch = statuses.filter((s) => s.band === 'watch').length;
  const stable = statuses.filter((s) => s.band === 'stable').length;
  const support_needed = high_priority + watch;
  return {
    total,
    high_priority,
    watch,
    stable,
    support_needed,
    support_pct: total > 0 ? Math.round((support_needed / total) * 100) : 0,
  };
}