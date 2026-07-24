// Curiosity Led Leadership Reboot Diagnostic
// Question definitions: 8 intake fields, 15 scored items (3 per construct), conditional follow-ups

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
    label: "Which leader populations are in scope right now?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "Newly promoted managers",
      "Newly hired managers",
      "Frontline leaders",
      "Mid-level leaders",
      "Senior leaders",
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
    label: "What is most true today?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "Support arrives too late",
      "Managers are overloaded",
      "Our leadership support feels disconnected from daily work",
      "We cannot clearly prove impact",
      "Information is fragmented across tools or systems",
      "Reporting and follow-through feel too manual",
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
    label: "What is already in place today?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "New leader onboarding program",
      "Leadership development programs",
      "Learning content (internal or external)",
      "LMS",
      "Assessment tools",
      "Performance tracking (HRIS / talent systems)",
      "Leadership competencies",
      "Leadership coaching",
      "Mentoring",
      "Manager toolkits",
      "Additional tools",
    ],
    conditionalReveal: {
      triggerValue: "Additional tools",
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
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "Manager performance or consistency concerns",
      "Manager burnout or overload",
      "Team engagement or turnover concerns",
      "Leadership readiness feels unclear",
      "Our current leadership support approach is not working as well as it should",
      "We are struggling to prove impact or justify investment",
      "A recent change, growth shift, or issue exposed a gap",
      "Just checking this out",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "why_now_other",
        label: "What else prompted you to take this diagnostic now?",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "concern_if_no_change",
    section: "Current reality",
    label: "If nothing changes in the next 6–12 months, what concerns you most?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "Turnover",
      "Manager burnout",
      "Leadership readiness",
      "Team performance",
      "Executive confidence",
      "Inability to prove value",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "concern_if_no_change_other",
        label: "What else concerns you most?",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "biggest_obstacle",
    section: "Current reality",
    label: "What is getting in the way most right now?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
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
];

// 15 scored diagnostic items (3 per construct) on a 5-point agreement scale
export const SCORE_SCALE = [
  "Strongly disagree",
  "Disagree",
  "Neither agree nor disagree",
  "Agree",
  "Strongly agree",
];

export const SCORED_ITEMS = [
  // Construct 1: Signal Delay (items 1-3)
  {
    id: 1,
    construct: "signal_delay",
    text: "Struggling or overloaded managers are often identified only after performance, engagement, or retention is already affected.",
    reverse: true,
  },
  {
    id: 2,
    construct: "signal_delay",
    text: "Newly promoted or newly hired leaders receive meaningful support early.",
    reverse: false,
  },
  {
    id: 3,
    construct: "signal_delay",
    text: "Leadership issues can escalate before support catches up.",
    reverse: true,
  },
  // Construct 2: Support Friction (items 4-6)
  {
    id: 4,
    construct: "support_friction",
    text: "When a leadership need is identified, we can quickly turn it into a practical next step.",
    reverse: false,
  },
  {
    id: 5,
    construct: "support_friction",
    text: "Our leadership support feels disconnected from what managers are facing day to day.",
    reverse: true,
  },
  {
    id: 6,
    construct: "support_friction",
    text: "Leadership support feels like an extra program to complete rather than an embedded part of managers' workflow.",
    reverse: true,
  },
  // Construct 3: Proof & Defensibility (items 7-9)
  {
    id: 7,
    construct: "proof_defensibility",
    text: "We can clearly explain how our leadership support efforts are evolving.",
    reverse: false,
  },
  {
    id: 8,
    construct: "proof_defensibility",
    text: "We can connect leadership needs, support actions, and progress into one story leaders can understand and trust.",
    reverse: false,
  },
  {
    id: 9,
    construct: "proof_defensibility",
    text: "Our leadership support efforts operate as a coherent system, not just as separate programs or activities.",
    reverse: false,
  },
  // Construct 4: Fragmentation & Admin Burden (items 10-12)
  {
    id: 10,
    construct: "fragmentation_admin",
    text: "Leadership support information is spread across too many tools, systems, or spreadsheets.",
    reverse: true,
  },
  {
    id: 11,
    construct: "fragmentation_admin",
    text: "Our team spends too much time chasing updates and stitching together reporting.",
    reverse: true,
  },
  {
    id: 12,
    construct: "fragmentation_admin",
    text: "Even when we know what needs to improve, acting on it creates too much administrative burden for HR, Talent, or L&D.",
    reverse: true,
  },
  // Construct 5: Cost of Inaction (items 13-15)
  {
    id: 13,
    construct: "cost_of_inaction",
    text: "Delayed leadership support creates meaningful downstream cost for the organization.",
    reverse: false,
  },
  {
    id: 14,
    construct: "cost_of_inaction",
    text: "Leadership gaps affect readiness, retention, or team performance more than our current reporting shows.",
    reverse: false,
  },
  {
    id: 15,
    construct: "cost_of_inaction",
    text: "We often underestimate the cost of waiting too long to support managers.",
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
    triggerCondition: { field: "already_in_place", operator: "includes", value: "Additional tools" },
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
};