// Public pricing and packaging content (16 November 2026).
// Only Essentials carries a published price. Growth and Organization are
// scoped in conversation because their boundaries are set per tenant.
// Nothing here promises an AI allowance, a launch dates or a multi-unit
// rollup before those are measured or proven.

export const BOOK_DEMO_URL = "https://cal.com/curiosityled/bookdemo";
export const DIAGNOSTIC_URL = "/diagnostic";

export const TIER_CARDS = [
  {
    key: "essentials",
    name: "Essentials",
    price: "$3,000",
    unit: "per year, billed annually",
    implementation: "$750 one-time implementation",
    fit: "Up to 10 managers and 100 participants",
    promise: "Build consistency",
    promoted: true,
    features: [
      "The whole manager experience: Leadership Index assessment, daily check-ins, priorities and development",
      "Goals, KPIs, 1:1s, performance reviews and calibration",
      "Standard manager and team dashboards",
      "Standard report templates with PDF export",
      "Standard scheduled reminders",
      "CSV onboarding and tenant isolation",
    ],
    cta: "Book a demo",
    secondary: { label: "See the manager view", href: DIAGNOSTIC_URL },
  },
  {
    key: "growth",
    name: "Growth",
    price: null,
    priceLabel: "Find your package",
    unit: "scoped in a 30-minute fit conversation",
    implementation: "Implementation scoped with the package",
    fit: "Typically 11–30 managers and up to 300 participants",
    promise: "Scale and optimize",
    promoted: false,
    features: [
      "Everything in Essentials",
      "Cross-team pattern and trend analysis",
      "Multi-period history beyond the current cycle",
      "Configurable automation alongside standard reminders",
      "Supported connectors: HubSpot, Outlook, Google Calendar and the Microsoft Teams bot",
      "A named implementation plan for your population",
    ],
    cta: "Find your package",
  },
  {
    key: "organization",
    name: "Organization",
    price: null,
    priceLabel: "Talk to our team",
    unit: "annual quote, negotiated population",
    implementation: "Scoped per deployment",
    fit: "Multi-unit and multi-site organizations",
    promise: "Align and transform",
    promoted: false,
    features: [
      "Everything in Growth",
      "Multi-unit reporting, scoped and validated per deployment",
      "Custom connector scope, quoted in writing",
      "Negotiated manager and participant populations",
      "Named delivery plan with acceptance criteria",
      "Advisory available as a separately scoped engagement",
    ],
    cta: "Talk to our team",
  },
];

export const CAPACITY_BLOCKS = [
  {
    name: "+5 manager block",
    price: "$1,200 / year",
    detail: "Adds five manager seats to the package you already have.",
  },
  {
    name: "+100 participant block",
    price: "$600 / year",
    detail: "Adds one hundred staff participant seats, including frontline people who never sign in.",
  },
  {
    name: "Additional reusable report layout",
    price: "$500 one-time",
    detail: "A new standard report layout, built once and reusable across the tenant.",
  },
  {
    name: "Advisory & managed administration",
    price: "Written scope",
    detail: "Coaching, facilitation, data migration and managed performance administration are quoted in writing, never bundled.",
  },
];

export const INCLUDED_EVERYWHERE = [
  "The whole manager loop: assessment, insight, priorities, check-ins, goals, 1:1s, reviews",
  "Atreus contextual guidance inside the manager flow (no usage allowance is published yet)",
  "Daily check-ins by Microsoft Teams and token-gated web links",
  "Standard manager, team and organization dashboards",
  "Standard report templates and PDF export",
  "Tenant isolation and role-scoped access",
];

export const DIFFERENCES = [
  {
    capability: "Managers and participants",
    essentials: "Up to 10 / 100, then blocks",
    growth: "Typically 11–30 / 300",
    organization: "Negotiated",
  },
  {
    capability: "Manager experience and reviews",
    essentials: "Included whole",
    growth: "Included whole",
    organization: "Included whole",
  },
  {
    capability: "Cross-team pattern and trend analysis",
    essentials: "Own team only",
    growth: "Across teams",
    organization: "Across units, scoped",
  },
  {
    capability: "History window",
    essentials: "Current cycle",
    growth: "Multi-period",
    organization: "Multi-period",
  },
  {
    capability: "Automation",
    essentials: "Standard reminders",
    growth: "Configurable",
    organization: "Configurable",
  },
  {
    capability: "Connectors and onboarding",
    essentials: "CSV onboarding",
    growth: "HubSpot, Outlook, Google Calendar, Teams bot",
    organization: "Scoped in writing",
  },
  {
    capability: "Implementation",
    essentials: "$750, fixed scope",
    growth: "Scoped with the package",
    organization: "Scoped per deployment",
  },
];

export const NOT_PUBLISHED = [
  "No AI (Atreus) usage allowance is published. Usage and cost are measured per tenant first; no unlimited-AI language appears on this site.",
  "No launch-timing assurance is offered here. Timing is agreed in the order form once your scope is known.",
  "Multi-unit reporting is quoted only after it is validated with a two-unit deployment — it is not a standing promise.",
  "The connectors named on this page are exactly the ones authorized today: HubSpot, Outlook, Google Calendar and the Microsoft Teams bot.",
  "Coaching, facilitation, data migration and managed administration are never bundled into a package price.",
];

export const PRICING_FAQ = [
  {
    q: "How is a manager counted?",
    a: "A manager is anyone in the tenant with someone reporting to them, plus the team-leader roles and above that structure a team. Admins who never manage people are not counted, and neither are view-only accounts.",
  },
  {
    q: "How are frontline staff without logins counted?",
    a: "They are participants. Anyone on your frontline roster — including people who only submit check-ins through the Teams bot or a private web link — uses a participant seat, not a manager seat.",
  },
  {
    q: "What happens if we grow past the allowance?",
    a: "You add a capacity block to the order form. Blocks exist so a team of 11–15 managers does not have to jump a whole package for capacity alone.",
  },
  {
    q: "Will the product block us when we reach the limit?",
    a: "Capacity is enforced only where a person is added — an invitation, a manual creation or a roster import. Warn mode is used first, and the manager loop itself is never limited by capacity: check-ins, goals, 1:1s, reviews, reports and exports keep working at any usage level.",
  },
  {
    q: "Why isn't Growth priced on this page?",
    a: "Growth's differentiators — cross-team analytics, the historical window, automation, connector breadth and multi-unit rollup — are set per tenant. Until those boundaries are fixed, quoting is more honest than a list price.",
  },
  {
    q: "Can we buy parts of a package?",
    a: "The manager experience is not split up. Differentiation is scale, cross-team intelligence, automation, connectors and delivery — never the core manager loop.",
  },
];