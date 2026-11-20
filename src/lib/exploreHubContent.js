// Sample data for the /explore demo's Leadership Intelligence Hub clone.
// Mirrors the real Hub (Insights → org tab → Enterprise / Talent / Workforce
// lenses) section by section, so the demo can be kept current by editing this
// one file. See docs/explore-demo-maintenance.md.

export const HUB_PAGE = {
  title: "Leadership Intelligence Hub",
  subtitle: "Analytics and strategic insights",
  dataConfidence: 40,
  filters: [
    { key: "timeframe", value: "All Time", options: ["All Time", "Last 12 Months", "Last 6 Months", "Last 3 Months"] },
    { key: "division", value: "All Divisions", options: ["All Divisions", "Operations", "Sales", "Technology", "Finance", "HR"] },
    { key: "level", value: "All Levels", options: ["All Levels", "Managers", "Directors", "VPs", "C-Suite"] },
    { key: "tenure", value: "All Tenure", options: ["All Tenure", "Under 1 Year", "1–2 Years", "3–5 Years", "6–10 Years", "20+ Years"] },
    { key: "risk", value: "All Risk Profiles", options: ["All Risk Profiles", "At-Risk Only", "High-Potential Only"] },
  ],
};

export const HUB_METRICS = [
  {
    id: "health",
    label: "Leadership Health",
    value: "68%",
    sub: "Manager Effectiveness Index",
    interpretation: "Building — targeted coaching recommended",
    tone: "indigo",
    howMeasured:
      "Weighted average of capability scores across assessed leaders: Decision Making (35%), Situational Intelligence (30%), Communication (20%), Performance Management (15%).",
  },
  {
    id: "risk",
    label: "Immediate Risk",
    value: "0",
    sub: "leaders requiring review this cycle",
    interpretation: "All leaders above performance threshold",
    tone: "emerald",
    howMeasured:
      "Leaders with capability assessment scores below 60%, indicating a need for targeted coaching or manager review. Not an employment risk classification.",
  },
  {
    id: "succession",
    label: "Succession Coverage",
    value: "0%",
    sub: "weighted bench score · 1 assessed leader",
    interpretation: "Thin bench — prioritise succession slate review",
    tone: "purple",
    howMeasured:
      "Weighted formula: Ready Now leaders count fully (85%+ score), Ready Soon leaders count at 50% weight (70–84%). Denominator is all assessed leaders (1).",
  },
  {
    id: "confidence",
    label: "Data Confidence",
    value: "40%",
    sub: "2 of 5 signals active",
    interpretation: "Platform-native only — 3 signals not connected",
    tone: "slate",
    howMeasured:
      "Hub-wide signal coverage: Capability and Execution connected. Missing: Development, Workforce, Engagement. Low confidence means all metrics should be treated as directional only.",
  },
];

export const HUB_PRIORITY = [
  {
    id: "bench",
    label: "Thin succession bench",
    tone: "amber",
    detail:
      "Only 0% weighted bench coverage. Prioritise the ready-soon cohort through stretch assignments and leadership validation.",
    action: "View Talent Pipeline →",
  },
  {
    id: "learning",
    label: "Learning velocity low",
    tone: "yellow",
    detail: "Learning completion at 33%. Review assignment relevance or remove blockers.",
    action: "View in Leadership Health →",
  },
  {
    id: "engagement",
    label: "Engagement not connected",
    tone: "slate",
    detail:
      "Employee sentiment data is not yet connected. Upload eNPS/engagement survey results to enable this signal.",
    action: "View connection module →",
  },
];

export const HUB_LIFECYCLE = [
  { id: "attraction", label: "Attract & Hire", description: "Pipeline & leadership signals", status: "watch" },
  { id: "onboarding", label: "Onboarding", description: "90-day integration", status: "watch" },
  { id: "development", label: "Develop", description: "Coaching & capability", status: "ok" },
  { id: "performance", label: "Perform", description: "Goals & effectiveness", status: "ok" },
  { id: "transition", label: "Mobility & Succession", description: "Readiness decisions", status: "watch" },
  { id: "retention", label: "Retain", description: "Flight risk & loyalty", status: "watch" },
  { id: "separation", label: "Separation", description: "Exit & continuity", status: "soon" },
];

export const HUB_BRIEFING = {
  eyebrow: "Executive Briefing",
  subtitle: "A concise readout for leadership — what changed, evidence, context, and next steps",
  headline: "Leadership capability building toward benchmark at 68% ME Index",
  stats: [
    { label: "ME Index", value: "68%" },
    { label: "At-risk leaders", value: "0" },
    { label: "High-potential", value: "0" },
    { label: "Assessments", value: "1" },
  ],
  summary: "Based on 1 assessment, leadership capability averages 68% ME Index.",
  columns: [
    ["ME Index: 68% — building toward benchmark", "High-potential: 0 at 85%+"],
    ["At-risk leaders: 0 below 60%", "Signal coverage: 1 of 4 domains connected"],
  ],
  footnote:
    "Small sample — findings are directional. Treat as context for investigation, not definitive conclusions.",
  contextTitle: "Strategic Context",
  contextBody:
    "The 68% ME Index sits in the building band. Decision Making (65%) is the drag on the composite while Situational Intelligence (72%) carries it, which reads as a cognitive bottleneck rather than a capability gap: leaders can read the situation, and stall at the point of committing to a call. Resource Management (60%) is the widest gap to target at -18 points. The highest-leverage move is not more training hours; it is fewer, better-framed decisions with a named owner.",
  contextFootnote:
    "AI-generated synthesis from 1 assessment, 7 goals, 3 learning records. Intended for development conversation prep — not sole decision criteria.",
};

export const HUB_HEALTH = {
  title: "Organizational Leadership Health",
  subtitle: "Manager Effectiveness, skill gaps, and risk signals",
  badge: "Decision-ready",
  meIndex: {
    label: "ME Index",
    status: "Building",
    value: "68%",
    description: "Building — targeted coaching recommended.",
    decisionQuality: "68%",
    assessed: "1 leaders assessed",
    distribution: "DM 35% · SI 30% · Comm 20% · PM 15%",
  },
  riskSignals: [
    { label: "Below 50%", value: "0" },
    { label: "Stale goals", value: "0" },
    { label: "Incomplete learning", value: "2" },
  ],
  learningVelocity: {
    status: "Low",
    stats: [
      { label: "Completion", value: "33%" },
      { label: "Done", value: "1" },
      { label: "Assigned", value: "3" },
    ],
  },
  dimensionsNote: "Top 2 strengths & top 2 gaps vs. industry benchmark",
  insight:
    "Leadership Health is being held back most by Resource Management and Decision Making. These are the highest-leverage areas for development investment.",
  dimensions: [
    { label: "Situational Intelligence", score: 72, delta: "-3% vs target", primary: true },
    { label: "Decision Making", score: 65, delta: "-10% vs target" },
    { label: "Resource Management", score: 60, delta: "-18% vs target" },
    { label: "Communication", score: 68, delta: "-7% vs target" },
    { label: "Performance Management", score: 71, delta: "-4% vs target" },
  ],
};

export const HUB_WELLBEING = {
  title: "Manager Wellbeing Intelligence",
  subtitle:
    "Aggregate, anonymised signals from Atreus check-ins — Category B data only. No individual attribution.",
  privacy:
    "Groups below 5 managers are suppressed to prevent identification. Individual check-in content, confidence history, identity friction, and reflections are always private.",
  categoryBTitle: "Category B — Aggregated signals only",
  categoryB:
    "No individual manager data is shown here. All metrics represent group trends across 12 managers. Groups below 5 are suppressed. Individual check-in content, confidence history, identity friction, and reflections are always private to each manager.",
  cards: [
    {
      id: "engagers",
      label: "Active engagers (14d)",
      value: "67%",
      of: "8 of 12 managers",
      note: "% of managers with ≥3 check-ins in last 14 days",
    },
    {
      id: "stretched",
      label: "Stretched frequently",
      value: "25%",
      of: "3 of 12 managers",
      note: "Reported stretched ≥5x in 14 days · aggregate self-report",
    },
    {
      id: "stall",
      label: "Learning stall rate",
      value: "33%",
      of: "4 of 12 managers",
      note: "No learning activity in 7+ days · engagement signal, not performance",
    },
    {
      id: "delegation",
      label: "Delegation gap rate",
      value: "17%",
      of: "2 of 12 managers",
      note: "Declared intent didn't match behavior (7d) · morning intent vs evening actuals",
    },
  ],
  identityFriction: {
    value: "8%",
    caption: "Reporting role/identity friction this week",
    note: "Always private at individual level. Aggregate only.",
  },
  energyTrend: [3.4, 3.1, 3.6, 3.2, 2.9, 3.3, 3.5, 3.2, 3.0, 3.4, 3.6, 3.3, 3.1, 3.4],
  overload: [
    { label: "Sustainable", value: 6, tone: "green" },
    { label: "Stretched", value: 4, tone: "amber" },
    { label: "At risk", value: 2, tone: "red" },
  ],
  overloadNote: "Operator-mode risk trajectory",
};

export const HUB_TALENT = {
  coverage: [
    { label: "Ready now", value: "0", note: "85%+ capability score" },
    { label: "Ready soon", value: "1", note: "70–84% capability score" },
    { label: "Weighted coverage", value: "0%", note: "thin bench — prioritise slate review" },
  ],
  rows: [
    { name: "Priya Raman", role: "Operations Manager", score: "72%", band: "Ready soon", tone: "amber" },
    { name: "Marcus Bell", role: "Customer Care Manager", score: "68%", band: "Building", tone: "amber" },
    { name: "Dana Whitfield", role: "Finance Manager", score: "64%", band: "Building", tone: "amber" },
    { name: "Sam Okafor", role: "Warehouse Manager", score: "—", band: "Not assessed", tone: "gray" },
  ],
  note:
    "Bench strength is measured from assessed leaders only. Unassessed managers are not counted as ready, which is why coverage reads thin.",
};

export const HUB_WORKFORCE = {
  stability: [
    { label: "Overall turnover", value: "12%", note: "Target: <15%" },
    { label: "Regrettable turnover", value: "4%", note: "Target: <5%" },
    { label: "First-year turnover", value: "9%", note: "Target: <10%" },
    { label: "Critical role vacancies", value: "2", note: "Target: <5%" },
  ],
  engagement: [
    { label: "eNPS", value: "+18", note: "Last survey · 61% response rate" },
    { label: "Engagement index", value: "71%", note: "Stable quarter on quarter" },
    { label: "Flight risk (high)", value: "3", note: "Managers flagged by pattern" },
  ],
  note:
    "Workforce signals come from the HRIS import. Turnover is read alongside leadership scores, never as a performance verdict on an individual manager.",
};

export const HUB_RISKS = [
  {
    title: "Decision Making is the composite drag",
    detail: "65% with Decision Quality at 68% — the bottleneck is committing to a call, not reading the situation.",
  },
  {
    title: "Resource Management sits 18 points under target",
    detail: "The widest gap in the profile, and the one most likely to show up as overload in check-ins.",
  },
];

export const HUB_OPPORTUNITIES = [
  {
    title: "Situational Intelligence is a strength to lean on",
    detail: "72% — use it as the entry point for decision practice rather than starting from a deficit.",
  },
  {
    title: "Learning velocity can move quickly",
    detail: "1 of 3 assigned items complete. Removing one blocker usually converts the next item within a week.",
  },
];