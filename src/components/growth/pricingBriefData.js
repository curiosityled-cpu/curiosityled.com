// Content for the regenerated commercial brief (16 November 2026).
// All prices and allowances are PROPOSED test terms from the November 2026 offer
// documents — not approved, published or contractual commitments.

export const TIERS = [
  {
    name: "Essentials",
    price: "$3,000",
    unit: "per year, billed annually",
    implementation: "$750",
    managers: "Up to 10 managers",
    participants: "Up to 100 staff participants",
    teams: "Multiple teams, one organization",
    value: "Build consistency",
    outcome: "“Our managers have a clear process, practical support and visibility into progress.”",
    cta: "Explore Curiosity Led",
    promoted: true,
  },
  {
    name: "Growth",
    price: "$7,200",
    unit: "per year, billed annually",
    implementation: "from $1,500",
    managers: "Up to 30 managers",
    participants: "Up to 300 staff participants",
    teams: "Multiple teams and units",
    value: "Scale and optimize",
    outcome: "“We can see what works across teams, identify gaps earlier and make better intervention decisions.”",
    cta: "Find your package",
    promoted: false,
  },
  {
    name: "Organization",
    price: "Custom",
    unit: "annual quote",
    implementation: "Scoped",
    managers: "Negotiated population",
    participants: "Negotiated population",
    teams: "Multi-unit and multi-site",
    value: "Align and transform",
    outcome: "“We can connect manager behavior, team execution and business performance across units.”",
    cta: "Talk to our team",
    promoted: false,
  },
];

// Unit economics derived from the proposed tiers — arithmetic on proposed terms, not validated pricing.
export const UNIT_ECONOMICS = [
  { metric: "Revenue per manager / month", essentials: "$25.00", growth: "$20.00", note: "3,000 ÷ 10 ÷ 12 and 7,200 ÷ 30 ÷ 12" },
  { metric: "Revenue per participant / year", essentials: "$30", growth: "$24", note: "At full allowance; unused allowance erodes the rate" },
  { metric: "Implementation per staff hour", essentials: "$150", growth: "—", note: "$750 ÷ 5-hour delivery guardrail" },
  { metric: "Implementation as % of year one", essentials: "25%", growth: "21%", note: "750 ÷ 3,750 and 1,500 ÷ 8,700" },
  { metric: "Manager allowance step", essentials: "10", growth: "+20", note: "The gap a 11–30 manager buyer must cross" },
];

// Capacity add-ons I recommend to close the gap created by the lower allowances.
export const ADDONS = [
  {
    name: "+5 manager block",
    price: "$1,200 / year",
    why: "Lets an 11–10 manager buyer stay on Essentials ($4,200 total) instead of being forced to $7,200, while keeping Growth's real advantages for the upgrade.",
  },
  {
    name: "+100 participant block",
    price: "$600 / year",
    why: "Answers the few-managers-many-participants case the offer documents already flag, without selling unused manager access.",
  },
  {
    name: "Additional reusable report layout",
    price: "$500 one-time",
    why: "Keeps bespoke client reporting out of standard delivery, where it is the fastest way to lose margin.",
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
  { capability: "Goals, KPIs, 1:1s, performance reviews and calibration", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "Goal, KPI, OneOnOneHub, launchReviewCycle, getReviewWorkspace" },
  { capability: "360 feedback", essentials: "Included", growth: "Included", org: "Included", status: "Partial", evidence: "Assessment360Manager component exists; no dedicated multi-rater cycle flow traced" },
  { capability: "Standard manager and team dashboards", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "/today, /team, ManagerTeam, team rollup functions" },
  { capability: "Standard reporting templates and PDF export", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "ReportBuilder, 10 export*PDF functions, ReportTemplate entity" },
  { capability: "Cross-team pattern and trend analysis", essentials: "Standard", growth: "Included", org: "Included", status: "Partial", evidence: "computeBehaviorTrends, getHistoricalTrends, ManagerTrends — exists but not packaged or bounded" },
  { capability: "Historical trend window beyond the current cycle", essentials: "Current cycle", growth: "Multi-period", org: "Multi-period", status: "Partial", evidence: "getHistoricalTrends available; no documented retention window per tier" },
  { capability: "Workflow automation and scheduled reminders", essentials: "Standard reminders", growth: "Configurable", org: "Configurable", status: "Partial", evidence: "44 workflows, Automation entity, executeAutomation — no tenant-level entitlement control" },
  { capability: "Verified connectors", essentials: "CSV onboarding", growth: "Supported connectors", org: "Custom scoped", status: "Partial", evidence: "3 authorized (HubSpot, Outlook, Google Calendar), Teams bot, SFTP performance sync; CRM/HRIS breadth unverified" },
  { capability: "Multi-unit organizational hierarchy and rollup", essentials: "Single organization", growth: "Multiple teams", org: "Multi-unit", status: "Partial", evidence: "OrgPosition, OrgRole, ClientContext — hierarchy depth not validated for multi-unit reporting" },
  { capability: "Client-facing aggregated reporting with approval", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "ReportBuilder sharing, getClientContext, aggregation audits" },
  { capability: "Standard implementation (kickoff, roster import, 3 check-in templates, 1 report layout, training, 30-day review)", essentials: "$750", growth: "from $1,500", org: "Scoped", status: "Proposed", evidence: "Process, not software — no delivery template exists in the app yet" },
  { capability: "Tenant isolation and role-scoped access", essentials: "Included", growth: "Included", org: "Included", status: "Ready", evidence: "RLS on 163 entities; 37 reference Analyst, 23 subordinate scopes; tenant proof functions" },
  { capability: "Plan / entitlement enforcement in product", essentials: "—", growth: "—", org: "—", status: "Absent", evidence: "0 of 163 entities carry a plan, tier or allowance field; no payments or plan gate in app code" },
  { capability: "Manager and participant allowance counting", essentials: "—", growth: "—", org: "—", status: "Absent", evidence: "No counter exists; Client has license_count only, set by hand" },
  { capability: "AI consumption metering and allowance", essentials: "—", growth: "—", org: "—", status: "Absent", evidence: "No token or credit tracking around Atreus calls" },
  { capability: "Public pricing page", essentials: "—", growth: "—", org: "—", status: "Absent", evidence: "No /pricing route; no price string anywhere in public pages" },
  { capability: "No-signup interactive demo", essentials: "—", growth: "—", org: "—", status: "Partial", evidence: "LandingInteractivePreview is a scripted mock with fictional personas, not labelled as fictional and not linked as the primary CTA" },
];

export const CLAIMS = [
  { claim: "“Evidence that judgment changed”", where: "LandingAssessDevelopProve.jsx:92", state: "Unsubstantiated", risk: "P0", fix: "“Evidence of what managers did differently” and show the record type that supports it" },
  { claim: "“$319B–$398B lost annually… 50% of employees have left a job to get away from their manager”", where: "LandingHero.jsx:237, LandingProblem.jsx:6", state: "Needs qualification", risk: "P0", fix: "Cite the 2015 Gallup source, population and wording, or replace with a sourced 2024+ figure" },
  { claim: "“Consolidates 6–8 point tools into one layer”", where: "LandingBeyond.jsx:16", state: "Unsupported", risk: "P1", fix: "Name the specific tool categories the product replaces, or drop the count" },
  { claim: "“Take the 8-minute diagnostic”", where: "LandingHero.jsx:104/118, LandingFinalCTA.jsx:12/20", state: "Unverified", risk: "P1", fix: "Time the live /diagnostic flow; publish the real duration or remove the number" },
  { claim: "Fictional manager personas and scores presented as customer data", where: "LandingInteractivePreview.jsx", state: "Demo only", risk: "P1", fix: "Label SAMPLE at the point of use and name the demo as the primary CTA" },
  { claim: "Teams / Slack / email write-back and Microsoft compliance", where: "Industry landing components", state: "Unverified", risk: "P1", fix: "Confirm what is shipped (Teams bot exists; Slack connector does not) before retaining" },
  { claim: "Unlimited AI or Atreus usage", where: "Not currently published", state: "Must stay unpublished", risk: "P0 if added", fix: "Meter first; publish an explicit allowance only after unit economics are measured" },
  { claim: "Launch assurance: core workflow live within 15 business days", where: "Offer document only", state: "Proposed", risk: "P1", fix: "Operational and contractual review before it appears on the site" },
];

export const GATES = [
  { gate: "1 — Inventory capabilities and access boundaries", status: "Done", note: "163 entities, 559 functions, 44 workflows, 125 pages, 87 routes classified in this audit" },
  { gate: "2 — Define measurable entitlements", status: "Not started", note: "Matrix drafted here; still needs allowance fields and a counting rule per tenant" },
  { gate: "3 — Validate technical enforcement", status: "Blocked", note: "No plan data exists to enforce. Requires a Client package field plus server-side checks" },
  { gate: "4 — Test price/value with qualified prospects", status: "Not started", note: "10-prospect Essentials test; Growth stays quoting-only" },
  { gate: "5 — Approve copy, CTAs and contractual language", status: "Blocked", note: "Two P0 claims and the unverified diagnostic duration must be resolved first" },
];

export const PLAN = [
  {
    window: "Now — week 1",
    focus: "Make claims honest, sell without a pricing page",
    items: [
      "Correct the two P0 claims and label the demo as fictional sample data.",
      "Sell Essentials from an order form; provision tenants by hand using the existing Client record.",
      "Write the acceptance definition and the capacity-block terms into the order form.",
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
      "Ship a pricing page that leads with Essentials and presents Growth as a conversation.",
      "Add the no-signup demo as the primary CTA, clearly labelled fictional.",
      "Instrument pricing views, package selection, demo starts and demo completions before launch.",
    ],
  },
  {
    window: "Weeks 7–12",
    focus: "Run the commercial test",
    items: [
      "Ten qualified prospects from one reachable segment, same offer, no exceptions.",
      "Track time-to-acceptance against the 5-hour implementation guardrail and Atreus cost per active manager.",
      "Decide at day 90: hold price, change allowance, or change the boundary between Essentials and Growth.",
    ],
  },
];

export const DECISIONS = [
  {
    title: "Advertise one price, quote the other two",
    body: "Essentials at $3,000 + $750 implementation is the only published number. Growth and Organization stay behind “find your package” until entitlement enforcement exists.",
    tag: "Commercial",
  },
  {
    title: "Keep the manager experience whole in every tier",
    body: "Check-ins, goals, 1:1s, reviews, 360s, assessment and Atreus stay in Essentials. Differentiation is scale, cross-team intelligence, automation, connectors and delivery — never the core manager loop.",
    tag: "Packaging",
  },
  {
    title: "Add capacity blocks, not a fourth tier",
    body: "The 11–30 manager buyer currently jumps from $3,000 to $7,200 for capacity alone. A $1,200 / +5 manager block keeps that deal, and Growth keeps a reason to exist beyond headcount.",
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
      { id: "1.4", task: "Write order form v1: Essentials scope, capacity blocks, acceptance definition", done: "One document a prospect can sign without amendment", owner: "Commercial" },
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
      { id: "3.1", task: "Publish a pricing page: Essentials only, Growth as “talk to us”", done: "Page live with no Growth or Organization price shown", owner: "Site" },
      { id: "3.2", task: "Make the no-signup demo the primary CTA, reachable from the persistent nav", done: "Demo linked on every public page", owner: "Site" },
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
    signal: "Two or more of ten sign at list price, no discount",
    read: "The offer holds; keep the price and finish the enforcement work.",
  },
  {
    signal: "Prospects disqualify themselves at the 10-manager line",
    read: "The allowance is the objection, not the price: lead with the +5 manager block in the conversation.",
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