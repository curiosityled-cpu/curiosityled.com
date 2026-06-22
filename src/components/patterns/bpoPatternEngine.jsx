/**
 * BPO Pattern Engine — Phase 1
 * Scores and ranks leadership patterns from available signals.
 * Returns ranked array: [{ id, name, bucket, status, score, evidence, kpiLinks, tagline, whatsAtStake, cta, ctaType }]
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function last(arr, n = 7) {
  return (arr || []).slice(0, n);
}

function scoreToStatus(score) {
  if (score >= 75) return 'Persistent';
  if (score >= 50) return 'Active';
  if (score >= 25) return 'Emerging';
  return null;
}

// ── Pattern detectors ─────────────────────────────────────────────────────────

function detectPerformanceAvoidance({ trends, checkIns, goals }) {
  let score = 0;
  const evidence = [];

  // Confidence declining
  if (trends?.confidence_trend === 'declining') {
    score += 25;
    evidence.push('Confidence has been declining over recent check-ins');
  }
  if (trends?.confidence_declining_days >= 3) {
    score += 15;
    evidence.push(`Confidence declining for ${trends.confidence_declining_days} consecutive days`);
  }

  // Stalled goals with no recent movement
  const stalledGoals = (goals || []).filter(g => g.status === 'active' && g.progress < 10);
  if (stalledGoals.length >= 2) {
    score += 20;
    evidence.push(`${stalledGoals.length} active goals showing no progress`);
  }

  // Low growth scores (growth follow-through as proxy for coaching action)
  const recentGrowth = last(checkIns, 7).map(c => c.growth_score).filter(Boolean);
  const avgGrowth = avg(recentGrowth);
  if (avgGrowth !== null && avgGrowth <= 2.5) {
    score += 20;
    evidence.push(`Growth follow-through averaging ${avgGrowth.toFixed(1)}/5 over the last week`);
  }

  // Low confidence score average
  const recentConf = last(checkIns, 5).map(c => c.confidence_score).filter(Boolean);
  const avgConf = avg(recentConf);
  if (avgConf !== null && avgConf <= 2.5) {
    score += 15;
    evidence.push(`Confidence averaging ${avgConf.toFixed(1)}/5 — signalling avoidance of hard conversations`);
  }

  return {
    id: 'performance_avoidance',
    name: 'Performance Avoidance',
    bucket: 'Operational Risk',
    tagline: 'Performance issues are being noticed but not addressed directly.',
    whatsAtStake: 'Delayed coaching lets underperformance spread into SLA misses, QA drift, and avoidable escalations.',
    kpiLinks: ['SLA Adherence', 'QA', 'FCR', 'AHT'],
    cta: 'Prepare coaching conversation',
    ctaType: 'practice',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectReactiveLeadership({ trends, checkIns, goals, activities }) {
  let score = 0;
  const evidence = [];

  // Few or no Big 3 priorities set recently
  const recentWithBig3 = last(checkIns, 7).filter(c => c.big3_priorities?.length > 0);
  if (recentWithBig3.length <= 1) {
    score += 25;
    evidence.push('Fewer than 2 days with priorities set in the last week');
  } else if (recentWithBig3.length <= 3) {
    score += 12;
    evidence.push(`Only ${recentWithBig3.length} days with planned priorities in the last week`);
  }

  // High load but low growth (firefighting without proactive moves)
  const recentLoad = last(checkIns, 7).map(c => c.load_score).filter(Boolean);
  const recentGrowth = last(checkIns, 7).map(c => c.growth_score).filter(Boolean);
  const avgLoad = avg(recentLoad);
  const avgGrowth = avg(recentGrowth);
  if (avgLoad !== null && avgGrowth !== null && avgLoad >= 3.5 && avgGrowth <= 2.5) {
    score += 25;
    evidence.push(`High load (${avgLoad.toFixed(1)}/5) with low growth action (${avgGrowth.toFixed(1)}/5)`);
  }

  // Overload pattern present
  if (trends?.overload_pattern_strength >= 60) {
    score += 20;
    evidence.push('Overload pattern active — reactive mode likely');
  }

  // Stalled KPI goals
  const stalledKpi = (goals || []).filter(g => g.status === 'active' && g.progress < 20 && g.goal_type !== 'action_item');
  if (stalledKpi.length >= 2) {
    score += 15;
    evidence.push(`${stalledKpi.length} KPI-linked goals with no movement`);
  }

  return {
    id: 'reactive_leadership',
    name: 'Reactive Leadership',
    bucket: 'Operational Risk',
    tagline: 'Responding after problems surface instead of acting on early signals.',
    whatsAtStake: 'By the time a queue, SLA, or CSAT issue is fully visible, customer impact is already underway.',
    kpiLinks: ['SLA Adherence', 'CSAT', 'On-Time Delivery', 'Escalations'],
    cta: 'Set tomorrow\'s plan',
    ctaType: 'today',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectOverloadOvercontrol({ trends, checkIns, activities }) {
  let score = 0;
  const evidence = [];

  // Overload pattern strong
  if (trends?.overload_pattern_strength >= 70) {
    score += 30;
    evidence.push(`Overload pattern strength at ${trends.overload_pattern_strength}%`);
  } else if (trends?.overload_pattern_strength >= 50) {
    score += 15;
    evidence.push(`Overload pattern building — currently at ${trends.overload_pattern_strength}%`);
  }

  // Sustained high load
  const recentLoad = last(checkIns, 7).map(c => c.load_score).filter(Boolean);
  const highLoadDays = recentLoad.filter(s => s >= 4).length;
  if (highLoadDays >= 4) {
    score += 25;
    evidence.push(`Load at 4+/5 on ${highLoadDays} of the last 7 days`);
  } else if (highLoadDays >= 2) {
    score += 10;
    evidence.push(`Elevated load (4+/5) on ${highLoadDays} recent days`);
  }

  // Delegation gap signals
  if (trends?.delegation_gap_count_7d >= 2) {
    score += 20;
    evidence.push(`${trends.delegation_gap_count_7d} delegation gaps identified this week`);
  }

  // Low energy under pressure
  const recentEnergy = last(checkIns, 7).map(c => c.energy_score).filter(Boolean);
  const avgEnergy = avg(recentEnergy);
  if (avgEnergy !== null && avgEnergy <= 2.5) {
    score += 15;
    evidence.push(`Energy averaging ${avgEnergy.toFixed(1)}/5 — sustained pressure depleting capacity`);
  }

  // Back-to-back meeting density as proxy for no delegation
  const avgBtb = avg((activities || []).slice(0, 7).map(a => a.back_to_back_density).filter(v => v != null));
  if (avgBtb !== null && avgBtb >= 0.6) {
    score += 15;
    evidence.push('High back-to-back meeting density — calendar leaving little space to delegate');
  }

  return {
    id: 'overload_overcontrol',
    name: 'Overload → Overcontrol',
    bucket: 'People Risk',
    tagline: 'Under pressure, pulling decisions back and narrowing team autonomy.',
    whatsAtStake: 'This creates decision bottlenecks and weaker agent confidence — especially damaging in fast-moving BPO operations.',
    kpiLinks: ['Schedule Adherence', 'SLA', 'Throughput', 'Escalations'],
    cta: 'Use delegation planner',
    ctaType: 'practice',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectAccountabilityGap({ checkIns, goals, trends }) {
  let score = 0;
  const evidence = [];

  // Big 3 completion rate low
  const daysWithBig3 = last(checkIns, 14).filter(c => c.big3_priorities?.length > 0);
  const daysWithCompletion = daysWithBig3.filter(c =>
    c.big3_priorities?.some(p => p.status === 'completed')
  );
  if (daysWithBig3.length >= 3) {
    const completionRate = daysWithCompletion.length / daysWithBig3.length;
    if (completionRate <= 0.3) {
      score += 30;
      evidence.push(`Only ${Math.round(completionRate * 100)}% of planned priorities completed in the last 2 weeks`);
    } else if (completionRate <= 0.5) {
      score += 15;
      evidence.push(`${Math.round(completionRate * 100)}% priority completion rate — follow-through gap present`);
    }
  }

  // Multiple stalled active goals
  const stalledGoals = (goals || []).filter(g => g.status === 'active' && g.progress < 15);
  if (stalledGoals.length >= 3) {
    score += 25;
    evidence.push(`${stalledGoals.length} active goals with no meaningful progress`);
  } else if (stalledGoals.length >= 2) {
    score += 12;
    evidence.push(`${stalledGoals.length} active goals stalled below 15% progress`);
  }

  // Behavioral commitments created but not followed up
  if (trends?.behavioral_commitments_7d >= 2) {
    score += 20;
    evidence.push(`${trends.behavioral_commitments_7d} commitments made this week — close-the-loop check needed`);
  }

  // Low growth follow-through score as signal
  const recentGrowth = last(checkIns, 7).map(c => c.growth_score).filter(Boolean);
  const avgGrowth = avg(recentGrowth);
  if (avgGrowth !== null && avgGrowth <= 2.5) {
    score += 15;
    evidence.push(`Growth follow-through at ${avgGrowth.toFixed(1)}/5 — commitments may not be landing`);
  }

  return {
    id: 'accountability_gap',
    name: 'Accountability Gap',
    bucket: 'Execution',
    tagline: 'Priorities are being set, but not consistently closed out.',
    whatsAtStake: 'In BPO environments, weak manager follow-through quickly becomes weak team follow-through on QA, callbacks, and schedules.',
    kpiLinks: ['Schedule Adherence', 'SLA', 'QA', 'Delivery Consistency'],
    cta: 'Close one commitment today',
    ctaType: 'today',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * runBpoPatternEngine({ trends, checkIns, goals, activities, pulses })
 * Returns ranked array of patterns scoring >= 25, sorted by score descending.
 */
export function runBpoPatternEngine({ trends, checkIns = [], goals = [], activities = [], pulses = [] }) {
  const inputs = { trends, checkIns, goals, activities, pulses };

  const patterns = [
    detectPerformanceAvoidance(inputs),
    detectReactiveLeadership(inputs),
    detectOverloadOvercontrol(inputs),
    detectAccountabilityGap(inputs),
  ];

  return patterns
    .filter(p => p.score >= 25)
    .sort((a, b) => b.score - a.score);
}