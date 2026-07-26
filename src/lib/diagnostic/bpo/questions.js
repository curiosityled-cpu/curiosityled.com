// Curiosity Led BPO Leadership Diagnostic
// Question definitions: 8 intake fields, 15 scored items (3 per construct)

export const INTAKE_FIELDS = [
  // Section 1: Your context
  {
    id: "role",
    section: "Your context",
    label: "Your role",
    type: "single_select",
    required: true,
    helper: "Select the role that best reflects your lens.",
    options: [
      "Operations leader",
      "Site leader",
      "Team leader",
      "QA leader",
      "Training / enablement leader",
      "Workforce / support leader",
      "People / HR leader",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "role_other",
        label: "Please describe your role.",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "operation_type",
    section: "Your context",
    label: "What type of operation are you closest to?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: ["Inbound", "Outbound", "Blended", "Voice", "Non-voice", "Back-office / shared services", "Other"],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "operation_type_other",
        label: "Please describe the operation type.",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "leader_populations",
    section: "Your context",
    label: "Which populations are in scope right now?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "New team leaders",
      "Experienced team leaders",
      "Frontline managers",
      "QA / support leaders",
      "Senior operations leaders",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "leader_populations_other",
        label: "Please describe the population(s) in scope.",
        type: "short_text",
        required: true,
      },
    },
  },
  {
    id: "operation_size",
    section: "Your context",
    label: "How would you describe your team or operation size?",
    type: "short_text",
    required: true,
    helper: "Examples: 150 agents across 3 teams, 800 agents on one site, multi-site operation with 2,000+ seats.",
  },
  // Section 2: Current reality
  {
    id: "most_true_today",
    section: "Current reality",
    label: "What feels most true today?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: [
      "Managers are firefighting too often",
      "Coaching is inconsistent",
      "Performance issues linger too long",
      "Follow-through is weak",
      "Leaders are overloaded",
      "Attrition or burnout risk is rising",
      "Team performance is too inconsistent",
      "Reporting and coordination take too much manual effort",
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
    id: "outcomes_under_pressure",
    section: "Current reality",
    label: "Which outcomes are most under pressure right now?",
    type: "multi_select",
    required: true,
    helper: "Select all that apply.",
    options: ["SLA", "QA", "AHT", "FCR", "CSAT", "Schedule adherence", "Attrition", "Absenteeism", "Escalations", "Other"],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "outcomes_under_pressure_other",
        label: "What other outcome is under pressure?",
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
      "Performance consistency concerns",
      "Coaching quality concerns",
      "Attrition or burnout concerns",
      "KPI pressure is rising",
      "Leaders are too reactive",
      "Follow-through is too inconsistent",
      "A recent issue exposed a leadership gap",
      "Just checking this out",
      "Other",
    ],
    conditionalReveal: {
      triggerValue: "Other",
      field: {
        id: "why_now_other",
        label: "What else prompted you to take this diagnostic?",
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
      "Team leader bandwidth",
      "Manager capability gaps",
      "Coaching inconsistency",
      "Too much firefighting",
      "Weak follow-through",
      "Too much manual coordination",
      "Poor visibility into what is driving team performance",
      "Low ownership or accountability",
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
  // Construct 1: Performance Response (items 1-3)
  { id: 1, construct: "performance_response", text: "Performance issues are addressed quickly before they spread into larger team problems.", reverse: false },
  { id: 2, construct: "performance_response", text: "Managers tend to act on early signs rather than waiting for KPI problems to become obvious.", reverse: false },
  { id: 3, construct: "performance_response", text: "Underperformance is often allowed to drift for too long before direct action is taken.", reverse: true },
  // Construct 2: Coaching Cadence & Quality (items 4-6)
  { id: 4, construct: "coaching_cadence", text: "Coaching happens consistently and is tied to real performance signals.", reverse: false },
  { id: 5, construct: "coaching_cadence", text: "Coaching is often too generic or too disconnected from the actual work.", reverse: true },
  { id: 6, construct: "coaching_cadence", text: "Leaders follow through on coaching conversations and agreed actions.", reverse: false },
  // Construct 3: Operational Control Without Overcontrol (items 7-9)
  { id: 7, construct: "operational_control", text: "Leaders maintain standards without becoming bottlenecks for the team.", reverse: false },
  { id: 8, construct: "operational_control", text: "Pressure on results often turns into micromanagement or overcontrol.", reverse: true },
  { id: 9, construct: "operational_control", text: "Leaders can respond under pressure without creating more confusion or dependency.", reverse: false },
  // Construct 4: Follow-through & Accountability (items 10-12)
  { id: 10, construct: "follow_through", text: "Priorities and commitments are carried through consistently.", reverse: false },
  { id: 11, construct: "follow_through", text: "Important actions often stall after they have been discussed or assigned.", reverse: true },
  { id: 12, construct: "follow_through", text: "Team leaders reliably close loops on what they say they will do.", reverse: false },
  // Construct 5: Team Stability Risk (items 13-15)
  { id: 13, construct: "team_stability", text: "Current leadership behavior is helping protect morale and retention.", reverse: false },
  { id: 14, construct: "team_stability", text: "Burnout or disengagement risk is building faster than leaders are responding to it.", reverse: true },
  { id: 15, construct: "team_stability", text: "The way teams are being led right now may be increasing avoidable attrition risk.", reverse: true },
];

// BPO diagnostic does not use conditional follow-up questions — pattern mapping
// is driven entirely by construct scores + intake answers.
export const FOLLOW_UPS = {};