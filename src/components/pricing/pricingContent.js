// Public pricing and packaging content.
// No package carries a price: pricing varies by user count, organization size
// and corporate structure, with a published minimum. Packages are bundles of
// the platform's modules, described by what they unlock.

export const BOOK_DEMO_URL = "https://cal.com/curiosityled/bookdemo";
export const DIAGNOSTIC_URL = "/diagnostic";

export const PRICING_NOTE =
  "Pricing may vary based on User Count, Organization Size, or Corporate Structure (Minimum pricing $5,000/year)";

export const TIERS = [
  {
    key: "essentials",
    name: "Essentials",
    bestFor: "Smaller companies",
    emphasis:
      "Onboard and manage performance for your managers with the Atreus AI Manager Companion, performance nudges and check-ins, goals/KPIs/OKRs, advanced reporting and analytics, and an LMS.",
    suitedTo:
      "For smaller companies where proving ROI means keeping clients happy and attracting their next clients.",
    features: [
      "Atreus, Lead, Team, Practice and Leadership Intelligence",
      "Performance Manager: check-ins and goals/KPIs/OKRs",
      "Development Manager: everything except Signals",
      "Advanced reporting and analytics with LMS",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    bestFor: "Growing organizations",
    emphasis:
      "Develop your managers with assessments — including our proprietary competency-based Leadership Index Assessment — performance reviews, 360 feedback, and a skills library through learning partners (additional cost).",
    suitedTo:
      "For growing organizations where effective leadership means accelerating growth.",
    features: [
      "Everything in Essentials",
      "Full Development Manager, including Signals",
      "Full Performance Manager: reviews, calibration and 360 feedback",
      "Leadership Index Assessment",
    ],
  },
  {
    key: "organization",
    name: "Organization",
    bestFor: "Mid-market to large organizations",
    emphasis:
      "Grow your leadership bench with our competency library, succession plans and career paths.",
    suitedTo:
      "For mid-market to large organizations where scaling and integrating leadership and manager development across the enterprise means attracting and retaining top talent.",
    features: [
      "Full platform access",
      "Talent Manager: competency library, succession plans, career paths",
      "Everything in Growth",
      "Enterprise-wide reporting",
    ],
  },
];

export const MODULES = [
  {
    key: "atreus",
    name: "Atreus",
    label: "AI manager companion",
    essentials: "full",
    growth: "full",
    organization: "full",
  },
  { key: "lead", name: "Lead", label: "Daily rhythm and priorities", essentials: "full", growth: "full", organization: "full" },
  { key: "team", name: "Team", label: "Team pulse and 1:1s", essentials: "full", growth: "full", organization: "full" },
  { key: "practice", name: "Practice", label: "Guided practice reps", essentials: "full", growth: "full", organization: "full" },
  {
    key: "intelligence",
    name: "Leadership Intelligence",
    label: "Insights and analytics",
    essentials: "full",
    growth: "full",
    organization: "full",
  },
  {
    key: "performance",
    name: "Performance Manager",
    label: "Check-ins, goals, KPIs and OKRs",
    essentials: "Check-ins, goals, KPIs & OKRs only",
    growth: "Reviews, calibration & 360",
    organization: "Full",
  },
  {
    key: "development",
    name: "Development Manager",
    label: "Signals, journeys and learning",
    essentials: "Everything except Signals",
    growth: "Full",
    organization: "Full",
  },
  {
    key: "talent",
    name: "Talent Manager",
    label: "Competency library, succession and career paths",
    essentials: "none",
    growth: "none",
    organization: "Full",
  },
];

export const PRICING_FAQ = [
  {
    q: "How is our price set?",
    a: "By user count, organization size and corporate structure, with a minimum of $5,000 a year. We quote against your actual population rather than asking you to fit a list price.",
  },
  {
    q: "What counts as a user?",
    a: "Managers and participants. Managers are the people with someone reporting to them; everyone else is a participant, including frontline staff who only submit check-ins through Teams or a private link. Admins who never manage people are not counted.",
  },
  {
    q: "Is anything extra cost?",
    a: "One thing: content from third-party learning partners. The platform, the manager experience and all standard reporting are inside the package.",
  },
  {
    q: "Do we lose features at the Essentials level?",
    a: "The manager experience never changes — Atreus, Lead, Team, Practice and Leadership Intelligence are in every package. Packages only add capability: first full performance and development, then talent.",
  },
  {
    q: "Can we move up later?",
    a: "Yes. Most teams start with Essentials and move to Growth once reviews and development matter. Nothing you have built is lost when a package changes.",
  },
];