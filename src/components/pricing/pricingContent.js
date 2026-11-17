// Public pricing and packaging content (17 November 2026).
// Packages sell modules, not list prices. The quote follows user count,
// organization size and corporate structure, with a $5,000 a year minimum.
// No package carries a price and no AI allowance is promised.

export const BOOK_DEMO_URL = "https://cal.com/curiosityled/bookdemo";
export const DIAGNOSTIC_URL = "/diagnostic";

export const PRICING_BASIS =
  "Pricing may vary based on User Count, Organization Size, or Corporate Structure (Minimum pricing $5,000/year).";

export const MODULES = [
  {
    key: "lead",
    name: "Lead",
    blurb: "The daily rhythm: priorities, morning and evening check-ins, and the manager's own notes.",
  },
  { key: "team", name: "Team", blurb: "Team roster, one-to-ones, delegation planning and the decision journal." },
  { key: "practice", name: "Practice", blurb: "Assessments, workouts and practice sessions that build the habit." },
  {
    key: "intelligence",
    name: "Leadership Intelligence",
    blurb: "Judgment profile, detected patterns and the leadership intelligence hub.",
  },
  {
    key: "development",
    name: "Development Manager",
    blurb: "Learning, journeys, courses, cohorts and signals — with completion records.",
  },
  {
    key: "performance",
    name: "Performance Manager",
    blurb: "Goals and KPIs, reviews, calibration and the check-in engine settings.",
  },
  {
    key: "talent",
    name: "Talent Manager",
    blurb: "Succession, talent pools, critical roles and career paths.",
  },
];

export const BUNDLES = [
  {
    key: "essentials",
    name: "Essentials",
    tagline: "The core manager loop.",
    badge: "Start here",
    continuity: null,
    includes: ["lead", "team", "practice", "intelligence"],
    cta: "Talk to us about Essentials",
    promoted: true,
  },
  {
    key: "growth",
    name: "Growth",
    tagline: "The full development and performance cycle.",
    continuity: "Everything in Essentials, plus",
    includes: ["development", "performance"],
    cta: "Find your package",
  },
  {
    key: "organization",
    name: "Organization",
    tagline: "The whole platform, including talent.",
    continuity: "Everything in Growth, plus",
    includes: ["talent"],
    cta: "Talk to our team",
  },
  {
    key: "studio",
    name: "Studio",
    tagline: "Compose your own bundle.",
    continuity: "Any combination of modules",
    includes: [],
    cta: "Build a bundle",
    custom: true,
  },
];

export const CAPACITY_BLOCKS = [
  {
    name: "+5 manager block",
    terms: "Order-form line item",
    detail: "Adds five manager seats without moving you to a different bundle.",
  },
  {
    name: "+100 participant block",
    terms: "Order-form line item",
    detail: "Adds one hundred staff participant seats, including frontline people who never sign in.",
  },
  {
    name: "Additional reusable report layout",
    terms: "One-time, scoped",
    detail: "A new standard report layout, built once and reusable across the tenant.",
  },
  {
    name: "Advisory & managed administration",
    terms: "Written scope",
    detail: "Coaching, facilitation, data migration and managed performance administration are quoted in writing, never bundled.",
  },
];

export const INCLUDED_EVERYWHERE = [
  "The Lead module is the foundation of every bundle, and of every composed bundle we recommend",
  "Atreus contextual guidance inside the manager flow (no usage allowance is published yet)",
  "Daily check-ins by Microsoft Teams and token-gated web links",
  "Standard report templates and PDF export",
  "Tenant isolation and role-scoped access",
  "Your data stays yours: no cross-tenant benchmarking without written consent",
];

export const MATRIX_ROWS = [
  ...MODULES.map((m) => ({ label: m.name, module: m.key })),
  { label: "Manager and participant capacity", values: ["On the quote", "On the quote", "Negotiated", "On the quote"] },
  { label: "Implementation", values: ["Included in quote", "Included in quote", "Scoped per deployment", "Scoped"] },
];

export const NOT_PUBLISHED = [
  "No list price sits beside a bundle. The quote follows user count, organization size and corporate structure, and never goes below $5,000 a year.",
  "No AI (Atreus) usage allowance is published. Usage and cost are measured per tenant first; no unlimited-AI language appears on this site.",
  "No launch-timing assurance is offered here. Timing is agreed in the order form once your scope is known.",
  "Multi-unit reporting is quoted only after it is validated with a two-unit deployment — it is not a standing promise.",
  "The connectors named on this page are exactly the ones authorized today: HubSpot, Outlook, Google Calendar and the Microsoft Teams bot.",
  "Coaching, facilitation, data migration and managed administration are never bundled into a bundle price.",
];

export const PRICING_FAQ = [
  {
    q: "Why isn't there a price next to each package?",
    a: "Because the same three modules cost different amounts at 40 people and at 4,000. Your quote follows user count, organization size and corporate structure, with a $5,000 a year minimum. You get the exact first-year figure in writing after a scoping conversation, with the modules listed line by line.",
  },
  {
    q: "How is a manager counted?",
    a: "A manager is anyone in the tenant with someone reporting to them, plus the team-leader roles and above that structure a team. Admins who never manage people are not counted, and neither are view-only accounts.",
  },
  {
    q: "How are frontline staff without logins counted?",
    a: "They are participants. Anyone on your frontline roster — including people who only submit check-ins through the Teams bot or a private web link — uses a participant seat, not a manager seat.",
  },
  {
    q: "What if we need a mix of modules no package covers?",
    a: "That is what Studio is for. Pick the modules you want and we build the bundle around them — for example Leadership Intelligence and Talent Manager without the development and performance cycle.",
  },
  {
    q: "What happens if we grow past our capacity?",
    a: "You add a capacity block to the order form rather than jumping to a different bundle. Blocks exist so a team of 11–15 managers does not have to buy the whole next package for capacity alone.",
  },
  {
    q: "Will the product block us when we reach the limit?",
    a: "Capacity is enforced only where a person is added — an invitation, a manual creation or a roster import. Warn mode is used first, and the manager loop itself is never limited by capacity: check-ins, goals, 1:1s, reviews, reports and exports keep working at any usage level.",
  },
  {
    q: "Can we buy parts of a module?",
    a: "Modules are not split below their own boundary — Talent Manager is succession, talent pools, critical roles and career paths. What changes between packages is which modules you run, not a stripped-down version of the same module.",
  },
];