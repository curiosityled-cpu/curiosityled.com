// Curiosity Led Leadership Reboot Diagnostic
// Question definitions: 10 intake fields, 24 scored items, conditional follow-ups

export const INTAKE_FIELDS = [
  // Section 1: Context
  {
    id: "area_of_focus",
    section: "Context",
    label: "Your area of focus",
    type: "single_select",
    required: true,
    helper: "Select the area that best reflects the lens you are bringing to this diagnostic.",
    options: ["HR", "Talent", "L&D", "People / People Ops", "Executive Leadership", "Other"],
  },
  {
    id: "leader_populations",
    section: "Context",
    label: "Which leader populations are in scope right now? Select all that apply.",
    type: "multi_select",
    required: true,
    helper: "Choose all leader groups you are currently most focused on supporting or improving.",
    options: [
      "Newly promoted managers",
      "Newly hired managers",
      "Frontline leaders",
      "Mid-level leaders",
      "Senior leaders",
      "Mixed population",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "leader_populations_other",
        label: "Please describe the leader population(s) in scope.",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "organization_size",
    section: "Context",
    label: "How would you describe your organization size?",
    type: "short_text",
    required: true,
    helper:
      "Examples: 400 employees, 2,300 employees across 12 sites, regional health system, or 8,000+ global workforce.",
  },
  // Section 2: Current reality
  {
    id: "most_true_today",
    section: "Current reality",
    label: "What is most true today? Select up to 3.",
    type: "multi_select",
    required: true,
    maxSelect: 3,
    helper: "Choose the issues that feel most pressing right now.",
    options: [
      "Support arrives too late",
      "Managers are overloaded",
      "Our programs feel disconnected from daily work",
      "We cannot clearly prove impact",
      "Data is fragmented across tools",
      "Reporting is too manual",
      "Leadership readiness is unclear",
      "Turnover or engagement concerns are rising",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "most_true_today_other",
        label: "What else feels true right now?",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "already_in_place",
    section: "Current reality",
    label: "What is already in place? Select all that apply.",
    type: "multi_select",
    required: true,
    helper: "Select the types of support, systems, or development infrastructure already in use.",
    options: [
      "Leadership programs",
      "Coaching",
      "LMS or learning platform",
      "360 or assessment tools",
      "HRIS / talent systems",
      "Mentoring",
      "Manager toolkits",
      "Additional Tools",
      "None / very little",
    ],
    conditionalReveal: {
      triggerValue: "Additional Tools",
      field: {
        id: "additional_tools_text",
        label: "What additional tools are currently part of your leadership support approach?",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "why_now",
    section: "Current reality",
    label: "What prompted you to take this diagnostic now?",
    type: "short_text",
    required: true,
    helper: "Share the immediate trigger, concern, or internal conversation that made this feel timely.",
  },
  {
    id: "concern_if_no_change",
    section: "Current reality",
    label: "If nothing changes in the next 6–12 months, what concerns you most?",
    type: "short_text",
    required: true,
    helper:
      "Examples: turnover, manager burnout, leadership readiness, team performance, executive confidence, or inability to prove value.",
  },
  {
    id: "biggest_obstacle",
    section: "Current reality",
    label: "What is the biggest obstacle to improving leadership support right now?",
    type: "single_select",
    required: true,
    helper: "Choose the barrier that most limits progress today.",
    options: [
      "Capacity / team bandwidth",
      "Budget",
      "Executive buy-in",
      "Fragmented tools or systems",
      "Low manager adoption",
      "Unclear ownership",
      "Weak measurement or reporting",
      "No clear process for follow-through",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "biggest_obstacle_other",
        label: "Please describe the obstacle.",
        type: "short_text",
        required: true,
      },
    },
  },
  // Section 3: Optional detail
  {
    id: "late_support_example",
    section: "Optional detail",
    label: "Describe one recent example where leadership support arrived too late.",
    type: "short_text",
    required: false,
    helper: "A real example helps make your feedback more specific and actionable.",
  },
  {
    id: "manager_tools",
    section: "Optional detail",
    label: "What tools or systems do managers already use most in their day-to-day work?",
    type: "short_text",
    required: false,
    helper:
      "Examples: Teams, Slack, email, HRIS, spreadsheets, internal check-in routines, or manager one-on-ones.",
  },
];

// 24 scored diagnostic items on a 5-point agreement scale
export const SCORE_SCALE = [
  "Strongly disagree",
  "Disagree",
  "Neither agree nor disagree",
  "Agree",
  "Strongly agree",
];

export const SCORED_ITEMS = [
  // Construct 1: Signal Delay (items 1-4, weight 25%)
  {
    id: 1,
    construct: "signal_delay",
    text: "We usually know which managers need support before team problems become visible.",
    reverse: false,
  },
  {
    id: 2,
    construct: "signal_delay",
    text: "Struggling or overloaded managers are often identified only after performance, engagement, or retention is already affected.",
    reverse: true,
  },
  {
    id: 3,
    construct: "signal_delay",
    text: "Newly promoted or newly hired leaders receive meaningful attention early, not only after issues emerge.",
    reverse: false,
  },
  {
    id: 4,
    construct: "signal_delay",
    text: "By the time leadership concerns become clear, the impact is often already noticeable.",
    reverse: true,
  },
  // Construct 2: Support Friction (items 5-9, weight 25%)
  {
    id: 5,
    construct: "support_friction",
    text: "When a leadership need is identified, we can quickly turn it into a practical next step.",
    reverse: false,
  },
  {
    id: 6,
    construct: "support_friction",
    text: "Much of our current leadership support feels disconnected from what managers are facing in real time.",
    reverse: true,
  },
  {
    id: 7,
    construct: "support_friction",
    text: "Managers are likely to experience our development support as useful, not as one more requirement.",
    reverse: false,
  },
  {
    id: 8,
    construct: "support_friction",
    text: "Leadership support usually shows up in the tools, routines, or moments where managers are already working, rather than as an extra program to complete.",
    reverse: false,
  },
  {
    id: 9,
    construct: "support_friction",
    text: "Our current support approach reduces cognitive load for managers instead of adding another layer for them to remember or manage.",
    reverse: false,
  },
  // Construct 3: Proof & Defensibility (items 10-14, weight 20%)
  {
    id: 10,
    construct: "proof_defensibility",
    text: "We can clearly explain what our leadership development efforts are changing.",
    reverse: false,
  },
  {
    id: 11,
    construct: "proof_defensibility",
    text: "When executives ask what is working, we can answer with more than anecdotes.",
    reverse: false,
  },
  {
    id: 12,
    construct: "proof_defensibility",
    text: "We can show where support is happening and what progress is following from it.",
    reverse: false,
  },
  {
    id: 13,
    construct: "proof_defensibility",
    text: "We can connect leadership signals, support actions, and observed progress into one story executives can understand and trust.",
    reverse: false,
  },
  {
    id: 14,
    construct: "proof_defensibility",
    text: "Our leadership development efforts are visible as a coherent system, not just as separate programs or activities.",
    reverse: false,
  },
  // Construct 4: Fragmentation & Admin Burden (items 15-19, weight 15%)
  {
    id: 15,
    construct: "fragmentation_admin",
    text: "Leadership support information is spread across too many tools, systems, or spreadsheets.",
    reverse: true,
  },
  {
    id: 16,
    construct: "fragmentation_admin",
    text: "Our team spends too much time chasing updates and stitching together reporting.",
    reverse: true,
  },
  {
    id: 17,
    construct: "fragmentation_admin",
    text: "Assigning, tracking, and monitoring leadership support is more manual than it should be.",
    reverse: true,
  },
  {
    id: 18,
    construct: "fragmentation_admin",
    text: "Improving leadership support with our current approach would require significant additional manual effort from HR or Talent.",
    reverse: true,
  },
  {
    id: 19,
    construct: "fragmentation_admin",
    text: "Even when we know what needs to improve, our current system makes it difficult to act without creating more coordination burden.",
    reverse: true,
  },
  // Construct 5: Cost of Inaction (items 20-24, weight 15%)
  {
    id: 20,
    construct: "cost_of_inaction",
    text: "Delayed leadership support creates meaningful downstream cost for the organization.",
    reverse: false,
  },
  {
    id: 21,
    construct: "cost_of_inaction",
    text: "We are likely paying a hidden price for reactive leadership support, even if we cannot quantify it precisely today.",
    reverse: false,
  },
  {
    id: 22,
    construct: "cost_of_inaction",
    text: "Leadership gaps affect readiness, retention, or team performance more than our current reporting shows.",
    reverse: false,
  },
  {
    id: 23,
    construct: "cost_of_inaction",
    text: "Trying to improve leadership support manually is likely costing us time and consistency we cannot easily afford.",
    reverse: false,
  },
  {
    id: 24,
    construct: "cost_of_inaction",
    text: "Slow, manual improvement creates risk because leadership issues can escalate before support catches up.",
    reverse: false,
  },
];

// Follow-up question definitions with trigger conditions
export const FOLLOW_UPS = {
  // Score-triggered (trigger when construct score < 50)
  signal_delay: {
    triggerType: "score",
    triggerCondition: { construct: "signal_delay", operator: "<", value: 50 },
    question: "Where do leadership issues usually become visible first?",
    type: "single_select",
    options: [
      "Team performance issues",
      "Employee engagement concerns",
      "Turnover or retention issues",
      "Escalations or complaints",
      "Manager self-report",
      "Leadership review or talent review",
      "Other",
    ],
  },
  support_friction: {
    triggerType: "score",
    triggerCondition: { construct: "support_friction", operator: "<", value: 50 },
    question: "What most often gets in the way of managers using available support?",
    type: "single_select",
    options: [
      "It feels like an extra program",
      "It arrives too late",
      "It is too generic",
      "It is hard to access in the flow of work",
      "Managers do not see the value",
      "Managers do not have time",
      "Other",
    ],
  },
  proof_defensibility: {
    triggerType: "score",
    triggerCondition: { construct: "proof_defensibility", operator: "<", value: 50 },
    question: "What is hardest to explain clearly to leadership today?",
    type: "single_select",
    options: [
      "Which leaders are most at risk",
      "Whether support is being used",
      "Whether behavior is changing",
      "Whether readiness is improving",
      "Whether investment is paying off",
      "Where to focus intervention next",
      "Other",
    ],
  },
  fragmentation_admin: {
    triggerType: "score",
    triggerCondition: { construct: "fragmentation_admin", operator: "<", value: 50 },
    question: "Where is the most manual effort happening right now?",
    type: "single_select",
    options: [
      "Tracking participation or follow-through",
      "Chasing updates from managers",
      "Reporting to leadership",
      "Coordinating across tools or vendors",
      "Identifying who needs support",
      "Following up after learning or coaching",
      "Other",
    ],
  },
  cost_of_inaction: {
    triggerType: "score",
    triggerCondition: { construct: "cost_of_inaction", operator: "<", value: 50 },
    question: "What feels most at risk if nothing changes?",
    type: "single_select",
    options: [
      "Manager retention",
      "Team engagement",
      "Leadership readiness",
      "Performance consistency",
      "Executive confidence in leadership investment",
      "Time and capacity of HR / Talent / L&D",
      "Other",
    ],
  },

  // Context-triggered
  multiple_populations: {
    triggerType: "context",
    triggerCondition: { field: "leader_populations", operator: "length>=", value: 2 },
    question: "Which of these populations feels most urgent right now?",
    type: "single_select_from_selected",
  },
  additional_tools: {
    triggerType: "context",
    triggerCondition: { field: "already_in_place", operator: "includes", value: "Additional Tools" },
    question: "Which of these tools plays the biggest role in how leadership support is delivered today?",
    type: "short_text",
  },
  executive_leadership: {
    triggerType: "context",
    triggerCondition: { field: "area_of_focus", operator: "equals", value: "Executive Leadership" },
    question: "What would make leadership support feel more credible or useful at the executive level?",
    type: "single_select",
    options: [
      "Clearer risk signals",
      "Better readiness insight",
      "Stronger proof of progress",
      "Better visibility into intervention",
      "More confidence in where to invest",
      "Other",
    ],
  },

  // Conflict-triggered
  many_systems_low_friction: {
    triggerType: "conflict",
    triggerCondition: {
      and: [
        { field: "already_in_place", operator: "length>=", value: 4 },
        { construct: "support_friction", operator: "<", value: 50 },
      ],
    },
    question: "Which best describes the gap in your current approach?",
    type: "single_select",
    options: [
      "We have enough support, but it is poorly connected",
      "We have support, but managers are not using it",
      "We have support, but it is hard to track",
      "We have support, but it is too slow to activate",
      "Other",
    ],
  },
  strong_score_urgent_narrative: {
    triggerType: "conflict",
    triggerCondition: {
      and: [
        { field: "overall_score", operator: ">=", value: 75 },
        { field: "late_support_example", operator: "not_empty" },
      ],
    },
    question:
      "Is the issue you are trying to solve concentrated in a specific cohort, function, or recent event?",
    type: "short_text",
  },
};