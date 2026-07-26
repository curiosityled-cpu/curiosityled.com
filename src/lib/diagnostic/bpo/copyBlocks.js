// Curiosity Led BPO Leadership Diagnostic
// Copy library: pattern definitions, 90-day modules, talking points, bridge copy

// ── Overall result interpretation blocks ──
export const OVERALL_RESULT_BLOCKS = {
  "Stronger Foundation":
    "Your results suggest that the foundations of stronger BPO leadership are already in place. Managers are more likely to address performance issues early, coaching is more consistent, and follow-through is more reliable. The next opportunity is not to add more programs, but to tighten consistency across teams and reduce the manual burden of keeping performance on track.",
  "Mixed / Uneven":
    "Your results suggest that meaningful leadership practices are happening, but not consistently enough across teams or populations. Some areas are likely working well, while others still depend on individual managers, firefighting, or manual coordination. The next 90 days should focus on the pattern most likely creating drag right now and tighten the supporting habits around it.",
  "High Risk Foundation":
    "Your results suggest that current leadership patterns are creating real performance, coaching, or retention risk. The combination of reactive management, inconsistent coaching, weak follow-through, or team strain is likely already affecting outcomes. The immediate priority is to identify the single pattern most worth fixing first and create a focused 90-day plan around it.",
};

// ── Primary pattern copy library (7 patterns) ──
export const PATTERN_BLOCKS = {
  performance_avoidance: {
    label: "Performance Avoidance",
    what_it_means:
      "Performance issues may be visible, but they are not being addressed quickly or directly enough. In BPO environments, that often allows small problems to compound into SLA misses, QA drift, avoidable escalations, or repeated coaching loops.",
    what_may_drive_it:
      "Leaders may be overloaded, conflict-avoidant, too reactive, or unsure how to move from observation into direct coaching.",
    what_is_at_stake:
      "If this pattern continues, performance inconsistency can spread faster than the team\u2019s ability to correct it.",
  },
  reactive_leadership: {
    label: "Reactive Leadership",
    what_it_means:
      "Managers may be responding after problems are already visible instead of acting on earlier signals. In BPO settings, that usually means customer or delivery impact has already started by the time intervention begins.",
    what_may_drive_it:
      "High pressure, constant firefighting, unclear priorities, or too little time spent on preventive action.",
    what_is_at_stake:
      "The cost is not just stress. It is slower recovery, more disruption, and less control over team outcomes.",
  },
  accountability_gap: {
    label: "Accountability Gap",
    what_it_means:
      "Priorities, actions, and commitments are being set, but not consistently carried through.",
    what_may_drive_it:
      "Too many competing priorities, weak tracking rhythms, unclear ownership, or low manager follow-through discipline.",
    what_is_at_stake:
      "When leaders do not close loops consistently, team execution becomes less dependable too.",
  },
  coaching_deficit: {
    label: "Coaching Deficit",
    what_it_means:
      "Coaching may be too infrequent, too generic, or too disconnected from the work to change behavior reliably.",
    what_may_drive_it:
      "Coaching may be treated as a side activity instead of an operating rhythm tied to real performance signals.",
    what_is_at_stake:
      "Without stronger coaching, the same issues tend to repeat without real capability building.",
  },
  overload_to_overcontrol: {
    label: "Overload to Overcontrol",
    what_it_means:
      "Under pressure, leaders may be narrowing decision-making, taking too much back onto themselves, or creating bottlenecks for the team.",
    what_may_drive_it:
      "High workload, pressure on outcomes, low trust in team execution, or lack of bandwidth to coach properly.",
    what_is_at_stake:
      "This can protect control in the short term while weakening confidence, speed, and ownership across the team.",
  },
  attrition_risk_behavior: {
    label: "Attrition Risk Behavior",
    what_it_means:
      "Current leadership patterns may be increasing burnout, disengagement, or avoidable attrition risk.",
    what_may_drive_it:
      "Low recognition, weak growth conversations, rigid pressure, overloaded leaders, or insufficient team support.",
    what_is_at_stake:
      "Attrition is not just a staffing issue. It destabilizes delivery, coaching continuity, and team trust.",
  },
  metric_myopia: {
    label: "Metric Myopia",
    what_it_means:
      "Leaders may be pushing hard on numeric targets while under-managing morale, judgment, and sustainable performance.",
    what_may_drive_it:
      "Heavy KPI pressure without enough attention to people signals, team strain, or leader capability.",
    what_is_at_stake:
      "Short-term metric wins can hide a growing people and quality cost.",
  },
};

// ── 90-Day plan module library ──
export const BLUEPRINT_MODULES = {
  performance_response: {
    title: "Address performance issues earlier",
    whyItMatters:
      "When underperformance is not addressed early, the impact spreads into quality, delivery, and team confidence.",
    days: {
      "1-30": "Identify where performance concerns are being noticed but not acted on quickly enough.",
      "31-60": "Create a simple manager coaching trigger for one recurring issue area.",
      "61-90": "Review whether earlier conversations are reducing repeated team issues.",
    },
  },
  coaching_cadence: {
    title: "Rebuild coaching consistency",
    whyItMatters:
      "Coaching is one of the most direct ways to improve team performance without relying only on pressure or reminders.",
    days: {
      "1-30": "Define what \u201cgood coaching cadence\u201d means for one manager population.",
      "31-60": "Track whether coaching is becoming more specific and tied to real work.",
      "61-90": "Review whether repeated issues are resolving faster with stronger coaching.",
    },
  },
  operational_control: {
    title: "Reduce manager bottlenecks",
    whyItMatters:
      "When pressure turns into overcontrol, leader capacity shrinks and team ownership weakens.",
    days: {
      "1-30": "Identify where leaders are becoming the bottleneck.",
      "31-60": "Shift one recurring decision or workflow back toward clearer team ownership.",
      "61-90": "Review whether escalation volume, confusion, or dependency has improved.",
    },
  },
  follow_through: {
    title: "Tighten follow-through",
    whyItMatters:
      "Without consistent follow-through, coaching, performance action, and team commitments lose traction.",
    days: {
      "1-30": "Choose one commitment rhythm to tighten.",
      "31-60": "Add a simple close-the-loop process.",
      "61-90": "Measure whether commitments are being completed more consistently.",
    },
  },
  team_stability: {
    title: "Reduce attrition risk behaviors",
    whyItMatters:
      "Leadership patterns can quietly increase burnout, disengagement, and exits long before attrition becomes fully visible.",
    days: {
      "1-30": "Identify where leadership behavior may be amplifying team strain.",
      "31-60": "Add one consistent support or recognition behavior for the highest-risk population.",
      "61-90": "Review whether early people-risk signals are improving.",
    },
  },
};

// ── Pattern-based 90-day plan modules (keyed by pattern key) ──
export const PATTERN_BLUEPRINT_MODULES = {
  performance_avoidance: BLUEPRINT_MODULES.performance_response,
  reactive_leadership: {
    ...BLUEPRINT_MODULES.performance_response,
    title: "Shift from reactive to preventive action",
    whyItMatters:
      "When managers respond only after problems are visible, customer or delivery impact has already started by the time intervention begins.",
    days: {
      "1-30": "Identify the 2\u20133 most common issues that arrive late to managers and define the earlier signal for each.",
      "31-60": "Set a simple preventive check for the most common late-arriving issue so managers act before impact spreads.",
      "61-90": "Review whether earlier action is reducing repeat issues and recovery time.",
    },
  },
  accountability_gap: BLUEPRINT_MODULES.follow_through,
  coaching_deficit: BLUEPRINT_MODULES.coaching_cadence,
  overload_to_overcontrol: BLUEPRINT_MODULES.operational_control,
  attrition_risk_behavior: BLUEPRINT_MODULES.team_stability,
  metric_myopia: {
    title: "Balance metric pressure with people signals",
    whyItMatters:
      "Pushing hard on numeric targets while under-managing morale and judgment creates short-term wins that hide a growing people and quality cost.",
    days: {
      "1-30": "Identify which teams are under the heaviest KPI pressure and check whether people-risk signals are being tracked alongside metrics.",
      "31-60": "Add one people-signal check (strain, recognition, coaching need) to the weekly team review for the highest-pressure team.",
      "61-90": "Review whether balancing metric and people signals is improving both performance and stability.",
    },
  },
};

// ── What to bring to leadership ──
export const LEADERSHIP_TALKING_POINTS = {
  performance_avoidance:
    "Performance issues are not being addressed quickly or directly enough, and that is allowing small problems to compound into SLA, QA, or delivery impact.",
  reactive_leadership:
    "Managers are responding after problems are already visible instead of acting on earlier signals, which means customer or delivery impact has already started by the time intervention begins.",
  accountability_gap:
    "Priorities and commitments are being set but not consistently carried through, which is making team execution less dependable.",
  coaching_deficit:
    "Coaching is too infrequent, too generic, or too disconnected from the work to change behavior reliably, and the same issues keep repeating without capability building.",
  overload_to_overcontrol:
    "Under pressure, leaders are narrowing decision-making and creating bottlenecks, which protects control short-term while weakening team ownership and speed.",
  attrition_risk_behavior:
    "Current leadership patterns are increasing burnout, disengagement, or attrition risk, which destabilizes delivery, coaching continuity, and team trust.",
  metric_myopia:
    "Leaders are pushing hard on numeric targets while under-managing morale and sustainable performance, which is hiding a growing people and quality cost.",
};

export const LEADERSHIP_FRAMING_SENTENCE =
  "The next 90 days should focus on the leadership pattern most likely affecting performance and team stability first \u2014 not on adding more programs or more reporting.";

// ── Curiosity Led bridge ──
export const CURIOSITY_LED_BRIDGE = {
  sentence1:
    "Meaningful progress can be made internally with the leaders, systems, and ownership already in place.",
  sentence2:
    "What typically slows execution is the combination of coaching inconsistency, reactive management, follow-through gaps, and operating pressure this diagnostic surfaced.",
  sentence3:
    "Curiosity Led helps reduce that burden by making the pattern easier to see, easier to act on, and easier to improve without replacing internal ownership.",
};