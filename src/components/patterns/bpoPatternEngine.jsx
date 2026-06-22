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
  if (score >= 15) return 'Emerging';
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

// ── Phase 2 detectors ─────────────────────────────────────────────────────────

function detectAttritionRiskBehavior({ trends, checkIns, activities }) {
  let score = 0;
  const evidence = [];

  // Identity friction active (manager struggling with their own role)
  if (trends?.identity_friction_active) {
    score += 25;
    evidence.push('Identity friction signals detected — role clarity and confidence under strain');
  } else if (trends?.identity_friction_signals >= 2) {
    score += 12;
    evidence.push(`${trends.identity_friction_signals} identity friction signals present`);
  }

  // Sustained high load + low growth = people feeling stuck
  const recentLoad = last(checkIns, 7).map(c => c.load_score).filter(Boolean);
  const recentGrowth = last(checkIns, 7).map(c => c.growth_score).filter(Boolean);
  const avgLoad = avg(recentLoad);
  const avgGrowth = avg(recentGrowth);
  if (avgLoad !== null && avgGrowth !== null && avgLoad >= 4 && avgGrowth <= 2) {
    score += 30;
    evidence.push(`High sustained load (${avgLoad.toFixed(1)}/5) with very low growth (${avgGrowth.toFixed(1)}/5) — team likely feeling stuck`);
  } else if (avgLoad !== null && avgGrowth !== null && avgLoad >= 3.5 && avgGrowth <= 2.5) {
    score += 15;
    evidence.push(`Elevated load with low development energy — conditions that increase disengagement risk`);
  }

  // Workload-growth divergence
  if (trends?.workload_growth_divergence_days >= 3) {
    score += 20;
    evidence.push(`Load vs growth gap persisting for ${trends.workload_growth_divergence_days} days — unsustainable pace`);
  }

  // Low 1:1 activity
  const avg1on1 = avg((activities || []).slice(0, 7).map(a => a.one_to_one_count).filter(v => v != null));
  if (avg1on1 !== null && avg1on1 < 0.5) {
    score += 15;
    evidence.push('Very few 1:1 meetings detected — team support cadence may be eroding');
  }

  // Low confidence + energy together signal team morale risk
  const avgConf = avg(last(checkIns, 7).map(c => c.confidence_score).filter(Boolean));
  const avgEnergy = avg(last(checkIns, 7).map(c => c.energy_score).filter(Boolean));
  if (avgConf !== null && avgEnergy !== null && avgConf <= 2.5 && avgEnergy <= 2.5) {
    score += 15;
    evidence.push('Both confidence and energy low — risk of disengagement spreading to the team');
  }

  return {
    id: 'attrition_risk',
    name: 'Attrition Risk Behavior',
    bucket: 'People Risk',
    tagline: "Current patterns are increasing the risk that people disengage or leave.",
    whatsAtStake: 'Attrition is one of the most expensive risks in BPO, and immediate managers are often a primary cause.',
    kpiLinks: ['Attrition', 'Absenteeism', 'Schedule Adherence', 'CSAT'],
    cta: 'Schedule a support conversation',
    ctaType: 'practice',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectCoachingDeficit({ trends, checkIns, activities, goals }) {
  let score = 0;
  const evidence = [];

  // Practice / learning tools not being used
  if (trends?.learning_stall_detected) {
    score += 25;
    evidence.push('Learning stall detected — development activity has dropped off');
  }

  // Long gap since practice flow used
  const practiceDays = (activities || []).slice(0, 1)[0]?.practice_flow_last_used_days;
  if (practiceDays != null && practiceDays >= 14) {
    score += 25;
    evidence.push(`Practice coaching tools not used in ${practiceDays} days`);
  } else if (practiceDays != null && practiceDays >= 7) {
    score += 12;
    evidence.push(`Practice coaching tools last used ${practiceDays} days ago`);
  }

  // Recurring performance signals without coaching goals
  const perfGoals = (goals || []).filter(g =>
    g.status === 'active' && g.goal_type === 'coaching_goal'
  );
  if (perfGoals.length === 0) {
    score += 20;
    evidence.push('No active coaching goals — performance improvement may be unstructured');
  }

  // Low growth score sustained
  const recentGrowth = last(checkIns, 10).map(c => c.growth_score).filter(Boolean);
  const avgGrowth = avg(recentGrowth);
  if (avgGrowth !== null && avgGrowth <= 2.5) {
    score += 20;
    evidence.push(`Growth follow-through averaging ${avgGrowth.toFixed(1)}/5 — coaching cadence likely inconsistent`);
  }

  // Low 1:1 count as coaching proxy
  const avg1on1 = avg((activities || []).slice(0, 7).map(a => a.one_to_one_count).filter(v => v != null));
  if (avg1on1 !== null && avg1on1 < 0.5) {
    score += 15;
    evidence.push('Low 1:1 frequency — coaching opportunities being missed');
  }

  return {
    id: 'coaching_deficit',
    name: 'Coaching Deficit',
    bucket: 'Execution',
    tagline: 'Coaching is too infrequent, too generic, or disconnected from the actual work.',
    whatsAtStake: 'BPO performance is maintained through repetition, observation, and feedback — not just dashboards and reminders.',
    kpiLinks: ['QA', 'FCR', 'AHT', 'CSAT', 'Attrition'],
    cta: 'Start coaching flow',
    ctaType: 'practice',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectMetricMyopia({ trends, checkIns, goals, activities }) {
  let score = 0;
  const evidence = [];

  // High focus on KPI goals but near-zero people/growth actions
  const kpiGoals = (goals || []).filter(g => g.status === 'active' && g.goal_type === 'standard');
  const coachingGoals = (goals || []).filter(g => g.status === 'active' && g.goal_type === 'coaching_goal');
  if (kpiGoals.length >= 3 && coachingGoals.length === 0) {
    score += 25;
    evidence.push(`${kpiGoals.length} metric-focused goals with no people development goals`);
  }

  // Load spikes but growth stays flat — squeezing without developing
  const recentLoad = last(checkIns, 7).map(c => c.load_score).filter(Boolean);
  const recentGrowth = last(checkIns, 7).map(c => c.growth_score).filter(Boolean);
  const avgLoad = avg(recentLoad);
  const avgGrowth = avg(recentGrowth);
  if (avgLoad !== null && avgGrowth !== null && avgLoad >= 4 && avgGrowth <= 2) {
    score += 25;
    evidence.push(`Metrics pressure high (load ${avgLoad.toFixed(1)}/5) while team development flat (${avgGrowth.toFixed(1)}/5)`);
  }

  // Workload-growth divergence sustained
  if (trends?.workload_growth_divergence_days >= 4) {
    score += 20;
    evidence.push(`${trends.workload_growth_divergence_days} consecutive days of output-focus without growth investment`);
  }

  // High overload + no delegation = squeezing rather than scaling
  if (trends?.overload_pattern_strength >= 60 && (trends?.delegation_intent_count_7d || 0) === 0) {
    score += 20;
    evidence.push('Overload present but no delegation activity — numbers prioritised over sustainable capacity');
  }

  // Practice tools unused
  const practiceDays = (activities || []).slice(0, 1)[0]?.practice_flow_last_used_days;
  if (practiceDays != null && practiceDays >= 10) {
    score += 10;
    evidence.push('People development tools unused — purely operational mode');
  }

  return {
    id: 'metric_myopia',
    name: 'Metric Myopia',
    bucket: 'Operational Risk',
    tagline: 'Over-fixated on numeric targets while under-managing morale and sustainable performance.',
    whatsAtStake: 'Short-term metrics may move, but team trust and retention are quietly eroding — a false win.',
    kpiLinks: ['AHT', 'SLA', 'QA', 'Attrition', 'Schedule Adherence'],
    cta: 'Rebalance the week',
    ctaType: 'practice',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectRecognitionDrought({ trends, checkIns, activities, goals }) {
  let score = 0;
  const evidence = [];

  // No recognition/support activity in recent goals
  const recognitionGoals = (goals || []).filter(g =>
    g.status === 'active' &&
    (g.title?.toLowerCase().includes('recogni') ||
     g.title?.toLowerCase().includes('appreciate') ||
     g.title?.toLowerCase().includes('1:1') ||
     g.title?.toLowerCase().includes('one on one') ||
     g.goal_type === 'coaching_goal')
  );
  if (recognitionGoals.length === 0) {
    score += 20;
    evidence.push('No recognition or support-oriented goals or actions in the last week');
  }

  // Sustained high load — conditions where recognition gets dropped first
  const recentLoad = last(checkIns, 7).map(c => c.load_score).filter(Boolean);
  const highLoadDays = recentLoad.filter(s => s >= 4).length;
  if (highLoadDays >= 4) {
    score += 20;
    evidence.push(`High pressure for ${highLoadDays} days — recognition and acknowledgement likely deprioritised`);
  }

  // Low growth + low energy = team morale signals
  const avgGrowth = avg(last(checkIns, 7).map(c => c.growth_score).filter(Boolean));
  const avgEnergy = avg(last(checkIns, 7).map(c => c.energy_score).filter(Boolean));
  if (avgGrowth !== null && avgGrowth <= 2.5) {
    score += 20;
    evidence.push(`Growth follow-through at ${avgGrowth.toFixed(1)}/5 — team likely not feeling seen or developed`);
  }
  if (avgEnergy !== null && avgEnergy <= 2.5) {
    score += 15;
    evidence.push(`Low energy (${avgEnergy.toFixed(1)}/5) — conditions that erode team motivation`);
  }

  // Very low 1:1 frequency
  const avg1on1 = avg((activities || []).slice(0, 7).map(a => a.one_to_one_count).filter(v => v != null));
  if (avg1on1 !== null && avg1on1 < 0.3) {
    score += 20;
    evidence.push('Almost no 1:1 time — agents unlikely to feel recognised or individually supported');
  }

  return {
    id: 'recognition_drought',
    name: 'Recognition Drought',
    bucket: 'People Risk',
    tagline: 'Team members are going too long without acknowledgement or individual support.',
    whatsAtStake: 'In BPO environments, micro-recognition frequency directly predicts agent attrition and absenteeism before any metric shows it.',
    kpiLinks: ['Attrition', 'Absenteeism', 'CSAT', 'Schedule Adherence'],
    cta: 'Schedule a recognition moment',
    ctaType: 'practice',
    evidence,
    score,
    status: scoreToStatus(score),
  };
}

function detectOneOnOneCadenceGap({ trends, checkIns, activities, goals }) {
  let score = 0;
  const evidence = [];

  // Low 1:1 count in activity data
  const recentActivities = (activities || []).slice(0, 7);
  const avg1on1 = avg(recentActivities.map(a => a.one_to_one_count).filter(v => v != null));
  if (avg1on1 !== null && avg1on1 < 0.3) {
    score += 35;
    evidence.push('Fewer than 1 formal 1:1 meeting per week — cadence has broken down');
  } else if (avg1on1 !== null && avg1on1 < 0.7) {
    score += 18;
    evidence.push(`1:1 frequency below recommended cadence — averaging ${avg1on1.toFixed(1)}/week`);
  }

  // 1:1 prep tool not used recently
  const prepDays = recentActivities[0]?.one_on_one_prep_last_used_days;
  if (prepDays != null && prepDays >= 14) {
    score += 25;
    evidence.push(`1:1 preparation tools not used in ${prepDays} days`);
  } else if (prepDays != null && prepDays >= 7) {
    score += 12;
    evidence.push(`1:1 prep last used ${prepDays} days ago — conversations may be unstructured`);
  }

  // Low growth scores as downstream effect of missed 1:1s
  const avgGrowth = avg(last(checkIns, 7).map(c => c.growth_score).filter(Boolean));
  if (avgGrowth !== null && avgGrowth <= 2.5) {
    score += 15;
    evidence.push(`Growth follow-through at ${avgGrowth.toFixed(1)}/5 — consistent with low coaching contact`);
  }

  // No coaching goals set
  const coachingGoals = (goals || []).filter(g => g.status === 'active' && g.goal_type === 'coaching_goal');
  if (coachingGoals.length === 0) {
    score += 15;
    evidence.push('No active coaching goals — 1:1s may lack structured focus');
  }

  return {
    id: 'one_on_one_gap',
    name: '1:1 Cadence Gap',
    bucket: 'Execution',
    tagline: '1:1 meetings are happening too infrequently or without enough structure.',
    whatsAtStake: 'Managers who miss or shorten 1:1s typically see QA and AHT drift within 2–3 weeks — it is a trackable leading indicator.',
    kpiLinks: ['QA', 'FCR', 'AHT', 'Attrition'],
    cta: 'Prep your next 1:1',
    ctaType: 'practice',
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
    // Phase 1
    detectPerformanceAvoidance(inputs),
    detectReactiveLeadership(inputs),
    detectOverloadOvercontrol(inputs),
    detectAccountabilityGap(inputs),
    // Phase 2
    detectAttritionRiskBehavior(inputs),
    detectCoachingDeficit(inputs),
    detectMetricMyopia(inputs),
    detectRecognitionDrought(inputs),
    detectOneOnOneCadenceGap(inputs),
  ];

  return patterns
    .filter(p => p.score >= 15)
    .sort((a, b) => b.score - a.score);
}