// Content for the regenerated commercial brief (16 November 2026).
// All prices and allowances are PROPOSED test terms from the November 2026 offer
// documents — not approved, published or contractual commitments.

// Packages publish coverage, never price. One minimum is the only number on the site.
export const TIERS = [
  {
    name: "Essentials",
    price: "Minimum $5,000 / year",
    unit: "quoted by user count, organization size and corporate structure",
    implementation: "Scoped",
    managers: "Atreus, Lead, Team, Practice and Leadership Intelligence",
    participants: "Performance Manager: check-ins and goals/KPIs/OKRs",
    teams: "Development Manager: everything except Signals",
    value: "Build consistency",
    outcome: "“Our managers have a clear process, practical support and visibility into progress.”",
    cta: "Talk to us about Essentials",
    promoted: true,
  },
  {
    name: "Growth",
    price: "Quoted",
    unit: "same minimum, priced on coverage and population",
    implementation: "Scoped",
    managers: "Everything in Essentials",
    participants: "Full Performance Manager: reviews, calibration, 360",
    teams: "Full Development Manager, including Signals",
    value: "Scale and optimize",
    outcome: "“We can see what works across teams, identify gaps earlier and make better intervention decisions.”",
    cta: "Talk to us about Growth",
    promoted: false,
  },
  {
    name: "Organization",
    price: "Quoted",
    unit: "annual quote, negotiated population",
    implementation: "Scoped",
    managers: "Everything in Growth",
    participants: "Talent Manager: competency library, succession, career paths",
    teams: "Enterprise-wide reporting",
    value: "Align and transform",
    outcome: "“We can connect manager behavior, team execution and business performance across units.”",
    cta: "Talk to us about Organization",
    promoted: false,
  },
];

// The floor, not a rate card: what the single published minimum implies.
export const UNIT_ECONOMICS = [
  { metric: "Published number on the site", essentials: "$5,000 minimum / year", growth: "—", note: "The only figure a prospect sees; every package is quoted above it" },
  { metric: "Revenue per manager / month at the floor", essentials: "$41.67", growth: "—", note: "5,000 ÷ 10 managers ÷ 12 — a floor, not a target rate" },
  { metric: "Revenue per participant / year at the floor", essentials: "$50", growth: "—", note: "At the floor's participant allowance" },
  { metric: "Implementation", essentials: "Scoped", growth: "Scoped", note: "No published fee; priced per deployment against the five-hour guardrail" },
  { metric: "Upgrade axis", essentials: "Coverage", growth: "Coverage + cross-team", note: "Buyers move up for capability, not for headcount" },
];

// Capacity blocks were removed from the offer on 17 November. What remains are the
// only extras that may be priced separately, and only in writing.
export const ADDONS = [
  {
    name: "Learning partner content",
    price: "Additional cost",
    why: "Third-party skills libraries and courses are billed at the partner rate — the only extra named on the public Growth card.",
  },
  {
    name: "Bespoke report layout",
    price: "Written scope",
    why: "Keeps client-specific reporting out of standard delivery, where it is the fastest way to lose margin.",
  },
  {
    name: "Advisory / managed administration",
    price: "Written scope",
    why: "Coaching, facilitation, data migration and managed performance administration stay explicitly out of every package.",
  },
];

export const ENTITLEMENTS = [
  { capability: "Manager experience: Leadership Index, insight, priorities, development", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "ManagerToday, MyDevelopment, Assessments, scoreAssessmentSubmission" },
  { capability: "Atreus contextual guidance in the manager flow", essentials: "Included", growth: "Included", org: "Included", status: "Partial", evidence: "atreusOrchestrator, AtreusCoach — no usage metering, so no binding allowance can be published" },
  { capability: "Daily check-ins, morning/evening rhythm, custom questions", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "saveDailyCheckIn, resolveCheckInQuestions, CheckInSettings, Teams + token web check-in" },
  { capability: "Check-ins, goals, KPIs, OKRs and 1:1s", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "Goal, KPI, OneOnOneHub, saveDailyCheckIn, resolveCheckInQuestions" },
  { capability: "Performance reviews, calibration and 360 feedback", essentials: "—", growth: "Included", org: "Included", status: "Partial", evidence: "launchReviewCycle, reviewCycleCommand, getReviewWorkspace ready; 360 named publicly but the multi-rater flow is not yet exercised end to end" },
  { capability: "Signals: assessments, quizzes, surveys, pulse and feedback builders", essentials: "—", growth: "Included", org: "Included", status: "Partial", evidence: "CustomAssessment, CustomForm, SignalBuilder ready; no package gate exists yet" },
  { capability: "Talent Manager: competency library, succession, career paths", essentials: "—", growth: "—", org: "Included", status: "Partial", evidence: "Succession module complete behind successionSetActivation; no package gate exists yet" },
  { capability: "Standard manager and team dashboards", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "/today, /team, ManagerTeam, team rollup functions" },
  { capability: "Standard reporting templates and PDF export", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "ReportBuilder, 10 export*PDF functions, ReportTemplate entity" },
  { capability: "Cross-team pattern and trend analysis", essentials: "Own team only", growth: "Across teams", org: "Across units", status: "Partial", evidence: "computeBehaviorTrends, getHistoricalTrends, ManagerTrends — exists but not yet bounded by package" },
  { capability: "Historical trend window beyond the current cycle", essentials: "Current cycle", growth: "Multi-period", org: "Multi-period", status: "Partial", evidence: "getHistoricalTrends available; no documented retention window per tier" },
  { capability: "Workflow automation and scheduled reminders", essentials: "Standard reminders", growth: "Configurable", org: "Configurable", status: "Partial", evidence: "44 workflows, Automation entity, executeAutomation — no tenant-level entitlement control" },
  { capability: "Verified connectors", essentials: "CSV onboarding", growth: "Supported connectors", org: "Custom scoped", status: "Partial", evidence: "3 authorized (HubSpot, Outlook, Google Calendar), Teams bot, SFTP performance sync; CRM/HRIS breadth unverified" },
  { capability: "Multi-unit organizational hierarchy and rollup", essentials: "Single organization", growth: "Multiple teams", org: "Multi-unit", status: "Partial", evidence: "OrgPosition, OrgRole, ClientContext — hierarchy depth not validated for multi-unit reporting" },
  { capability: "Client-facing aggregated reporting with approval", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "ReportBuilder sharing, getClientContext, aggregation audits" },
  { capability: "Standard implementation (kickoff, roster import, 3 check-in templates, 1 report layout, training, 30-day review)", essentials: "Scoped", growth: "Scoped", org: "Scoped", status: "Proposed", evidence: "Process, not software — no delivery template exists in the app yet" },
  { capability: "Tenant isolation and role-scoped access", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "RLS on 163 entities; 37 reference Analyst, 23 subordinate scopes; tenant proof functions" },
  { capability: "Plan / entitlement enforcement in product", essentials: "Partial", growth: "Partial", org: "Partial", status: "Partial", evidence: "Client carries package, allowances and enforcement_mode; invite and roster adds are gated. Package gate built for Signals, review launch and Talent activation; career paths and 360 still to gate" },
  { capability: "Manager and participant allowance counting", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "getTenantAllowanceUsage plus tenantAllowance.ts; usage visible on the client record" },
  { capability: "AI consumption metering and allowance", essentials: "—", growth: "—", org: "—", status: "Absent", evidence: "No token or credit tracking around Atreus calls" },
  { capability: "Public pricing page", essentials: "Live", growth: "Live", org: "Live", status: "Ready", evidence: "/pricing: three bundles, no package price, one published minimum, package CTAs routing to a conversation" },
  { capability: "No-signup interactive demo", essentials: "—", growth: "—", org: "—", status: "Partial", evidence: "LandingInteractivePreview is a scripted mock with fictional personas, not labelled as fictional and not linked as the primary CTA" },
];

export const CLAIMS = [
  { claim: "“Evidence that judgment changed”", where: "LandingAssessDevelopProve.jsx:92", state: "Corrected", risk: "P0", fix: "Now reads “Evidence of what managers did differently”, with the record type shown beside it" },
  { claim: "“$319B–$398B lost annually… 50% of employees have left a job to get away from their manager”", where: "LandingHero.jsx:240, LandingProblem.jsx:6", state: "Sourced", risk: "P0", fix: "Both places now attribute the figure to Gallup, 2015, US workforce. A newer source would be better than a corrected old one" },
  { claim: "“Consolidates 6–8 point tools into one layer”", where: "LandingBeyond.jsx:25", state: "Removed", risk: "P1", fix: "The count and the consolidation claim are gone; the paragraph now describes the record the product keeps" },
  { claim: "“Take the 8-minute diagnostic”", where: "LandingHero.jsx, LandingFinalCTA.jsx", state: "Removed", risk: "P1", fix: "No duration is published on any public page. Re-add a number only after a stopwatch run" },
  { claim: "Fictional manager personas and scores presented as customer data", where: "LandingInteractivePreview.jsx:240", state: "Labelled", risk: "P1", fix: "A visible “Sample data” note sits at the point of use, above the personas" },
  { claim: "Teams / Slack / email write-back and Microsoft compliance", where: "Industry landing components", state: "Qualified", risk: "P1", fix: "The Slack reference is gone; Teams and email are the shipped channels and the only ones named" },
  { claim: "Unlimited AI or Atreus usage", where: "Not currently published", state: "Must stay unpublished", risk: "P0 if added", fix: "Meter first; publish an explicit allowance only after unit economics are measured" },
  { claim: "Launch assurance: core workflow live within 15 business days", where: "Offer document only", state: "Proposed", risk: "P1", fix: "Operational and contractual review before it appears on the site" },
];

export const GATES = [
  { gate: "1 — Inventory capabilities and access boundaries", status: "Done", note: "163 entities, 559 functions, 44 workflows, 125 pages, 87 routes classified in this audit" },
  { gate: "2 — Define measurable entitlements", status: "Done", note: "Package, allowances, add-on capacity and enforcement mode on every tenant; one counting function returns the position" },
  { gate: "3 — Validate technical enforcement", status: "Partial", note: "Invite, manual create and roster import are gated, and packageEntitlements refuses Signals, review launch and Talent activation below their bundle. Career paths and the 360 flow are still to gate" },
  { gate: "4 — Test price/value with qualified prospects", status: "Not started", note: "10-prospect Essentials test; Growth stays quoting-only" },
  { gate: "5 — Approve copy, CTAs and contractual language", status: "Partial", note: "P0 claims corrected and duration removed; 360 is named on Growth before its flow is exercised" },
];

export const PLAN = [
  {
    window: "Now — week 1",
    focus: "Make claims honest, sell without a pricing page",
    items: [
      "Correct the two P0 claims and label the demo as fictional sample data.",
      "Sell Essentials from an order form; provision tenants by hand using the existing Client record.",
      "Write the acceptance definition and the three-bundle scope into the order form.",
    ],
  },
  {
    window: "Weeks 2–3",
    focus: "Make allowances countable",
    items: [
      "Add package, manager allowance, participant allowance and implementation fee to the Client record.",
      "Build one counting query: managers (role-based users who use the manager experience) vs participants (roster + check-in identities), admin-only and view-only excluded.",
      "Enforce at invite and roster import only — never at the check-in or review flow the manager already relies on.",
    ],
  },
  {
    window: "Weeks 4–6",
    focus: "Publish a narrow, enforceable offer",
    items: [
      "Ship a pricing page with three bundles, one published minimum and no package prices.",
      "Keep the no-signup diagnostic one click from every package CTA, clearly labelled fictional.",
      "Instrument pricing views, package selection, demo starts and demo completions before launch.",
    ],
  },
  {
    window: "Weeks 7–12",
    focus: "Run the commercial test",
    items: [
      "Ten qualified prospects from one reachable segment, same offer, no exceptions.",
      "Track time-to-acceptance against the 5-hour implementation guardrail and Atreus cost per active manager.",
      "Decide at day 90: hold the minimum, move a bundle boundary, or change what Growth includes.",
    ],
  },
];

export const DECISIONS = [
  {
    title: "Publish one minimum, quote every package",
    body: "The site carries a single number — $5,000 a year, varying by user count, organization size and corporate structure. No package shows a price; each CTA is “talk to us about [package]”.",
    tag: "Commercial",
  },
  {
    title: "Keep the manager experience whole in every tier",
    body: "Atreus, Lead, Team, Practice, Leadership Intelligence, check-ins and goals/KPIs/OKRs stay in Essentials. Differentiation is coverage: full performance and development in Growth, the talent bench in Organization.",
    tag: "Packaging",
  },
  {
    title: "Sell coverage, not seats",
    body: "Capacity blocks and a package calculator were removed from the offer. They turned a decision into a configurator and invited nickel-and-diming; buyers now upgrade for capability, and population is handled in the quote.",
    tag: "Pricing",
  },
  {
    title: "Do not publish an entitlement the app cannot enforce",
    body: "No entity carries plan data and no payments or plan gate exists in app code. Publishing tiers today creates contractual promises with no technical boundary.",
    tag: "Readiness",
  },
  {
    title: "Meter Atreus before promising any AI allowance",
    body: "There is no token or credit tracking around Atreus calls, so cost per active manager is unknown. Unlimited-AI language must stay off the site.",
    tag: "Economics",
  },
];

export const TASKS = [
  {
    sprint: "Sprint 1 — Honest claims and a sellable offer (week 1)",
    items: [
      { id: "1.1", task: "Replace “Evidence that judgment changed” with a claim the product supports", done: "No causal or proof language on any public page", owner: "Site copy" },
      { id: "1.2", task: "Qualify or replace the $319B–$398B / 50% statistic", done: "Source, year and population cited, or the statistic removed", owner: "Site copy" },
      { id: "1.3", task: "Label the interactive preview personas and scores as fictional samples", done: "Visible SAMPLE label at the point of use", owner: "Site copy" },
      { id: "1.4", task: "Write order form v1: three-bundle scope, the $5,000 minimum, acceptance definition", done: "One document a prospect can sign without amendment", owner: "Commercial" },
      { id: "1.5", task: "Shortlist ten qualified prospects, one segment, 3–10 managers each", done: "Ten named organisations with a named internal owner", owner: "Commercial" },
    ],
  },
  {
    sprint: "Sprint 2 — Make allowances countable (weeks 2–3)",
    items: [
      { id: "2.1", task: "Add package, manager allowance, participant allowance, implementation fee and billing start to the Client record", done: "Fields editable by platform admin on an existing tenant", owner: "Data" },
      { id: "2.2", task: "Build one counting function: managers (role-based users) vs participants (roster and check-in identities), excluding admin-only and view-only", done: "Returns counts and allowances for a tenant in one call", owner: "Backend" },
      { id: "2.3", task: "Enforce at invite and roster import only, with a clear over-allowance message", done: "An over-allowance add fails server-side, and no manager flow is blocked", owner: "Backend" },
      { id: "2.4", task: "Meter Atreus usage per tenant and per active manager", done: "Monthly cost per active manager is reportable", owner: "Backend" },
    ],
  },
  {
    sprint: "Sprint 3 — Publish narrowly (weeks 4–6)",
    items: [
      { id: "3.1", task: "Publish a pricing page: three bundles, no package price, one published minimum", done: "Page live with no package price and the minimum stated once", owner: "Site" },
      { id: "3.2", task: "Route every package CTA to the same conversation and keep Pricing in the persistent nav", done: "“Talk to us about [package]” on all three cards, diagnostic one click away", owner: "Site" },
      { id: "3.3", task: "Instrument pricing_view, package_select, demo_start, demo_complete, contact_request", done: "Events firing with package and page attached", owner: "Analytics" },
      { id: "3.4", task: "Turn the 90-Day Manager Launch into a runbook with the five-hour guardrail", done: "A per-implementation checklist that records actual hours", owner: "Delivery" },
    ],
  },
  {
    sprint: "Sprint 4 — Test and decide (weeks 7–12)",
    items: [
      { id: "4.1", task: "Run ten prospect conversations on identical terms", done: "Ten outcomes logged: signed, declined, deferred, reason", owner: "Commercial" },
      { id: "4.2", task: "Track delivery hours per implementation", done: "Median at or under five hours across the first three", owner: "Delivery" },
      { id: "4.3", task: "Track Atreus cost and manager return rate in week two", done: "Cost per active manager and week-two return measured", owner: "Product" },
      { id: "4.4", task: "Run the day-90 decision review", done: "One recorded decision: hold, re-band or re-boundary", owner: "Founder" },
    ],
  },
];

export const DECISION_RULES = [
  {
    signal: "Two or more of ten sign at the quoted figure, no discount",
    read: "The offer holds; keep the minimum and finish the bundle boundaries.",
  },
  {
    signal: "Every prospect asks for a number before the conversation",
    read: "The minimum is doing its job as a floor: give the figure in writing, and stop short of a range.",
  },
  {
    signal: "Buyers want cross-team analytics but not more managers",
    read: "The Essentials/Growth boundary is wrong: move the analytics boundary, not the headcount.",
  },
  {
    signal: "Fewer than two sign and no one names price",
    read: "The problem is credibility, not packaging. Return to proof, scope and the demo before touching price.",
  },
];