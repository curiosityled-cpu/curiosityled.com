// ─────────────────────────────────────────────────────────────────────────────
// industryConfig.js — Single source of truth for industry-specific landing copy
// and hero mockup data across /bpo, /healthcare, /coaching routes.
//
// Each industry has:
//   - hero:         headline, subheadline, bullets, CTAs, accent color, badge
//   - mockup:       tailored app-preview UI (title, stats, flagged items, footer)
//   - problem:      section heading, intro, and proof-point cards
//   - finalCta:     closing CTA headline, subtext, button label
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRY_ACCENT = {
  bpo: "#ef4444",
  healthcare: "#10b981",
  coaching: "#6366f1",
};

export const industryContent = {
  // ── BPO & Operations ──────────────────────────────────────────────────────
  bpo: {
    slug: "bpo",
    badge: "BPO & Operations",
    badgeColor: "#ef4444",
    accent: "#ef4444",
    pageTitle: "BPO & Operations — Curiosity Led",
    hero: {
      headline: ["Spot leadership risk", "before it hits your SLA."],
      subheadline:
        "Curiosity Led maps leadership behaviour patterns directly to your BPO operational metrics — AHT, FCR, QA drift, escalation rates, and attrition — so you can coach faster and react earlier.",
      bullets: [
        "Replace subjective scorecards with objective leadership signals.",
        "See the seven BPO leadership risk patterns before they compound.",
        "Coach in the flow of work — inside Microsoft Teams.",
      ],
      primaryCta: { label: "Start a 12-week pilot", href: "https://cal.com/curiosityled/bookdemo" },
      secondaryCta: { label: "Book a demo", href: "https://cal.com/curiosityled/bookdemo" },
    },
    mockup: {
      browserLabel: "app.curiosityled.com · BPO Operations",
      title: "Operations Risk Intelligence",
      subtitle: "Live leadership pattern detection · 14 team leaders",
      stats: [
        { label: "SLA Adherence", value: "91%", color: "#16a34a" },
        { label: "Active Patterns", value: "4", color: "#ef4444" },
        { label: "FCR Rate", value: "78%", color: "#f59e0b" },
      ],
      flaggedTitle: "Active Risk Patterns",
      flaggedItems: [
        { name: "Reactive Leadership", detail: "L. Park · SLA ↓ 4pts", color: "#ef4444" },
        { name: "Coaching Deficit", detail: "M. Torres · QA drift 3wk", color: "#f59e0b" },
        { name: "Attrition Risk", detail: "D. Osei · Morale signal", color: "#f59e0b" },
      ],
      footerNote: {
        icon: "✦",
        text: "Coaching flow ready for L. Park — sent via Teams",
        bg: "#eef0ff",
        color: "#0202ff",
      },
      floatingBadge: {
        icon: "↑",
        color: "#16a34a",
        title: "SLA recovering",
        subtitle: "Pattern flagged 9 days before breach",
      },
    },
    problem: {
      heading: "The BPO leadership problem",
      intro:
        "BPO operations manage performance through dashboards, but miss the leadership signals that actually drive those numbers.",
      cards: [
        {
          icon: "AlertTriangle",
          color: "#ef4444",
          title: "The Subjectivity Trap",
          desc: "Performance management relies on fragmented scorecards and manager memory — creating a trust gap and inconsistent coaching that prevents you from seeing trends until they've already hit your SLA.",
        },
        {
          icon: "TrendingDown",
          color: "#f59e0b",
          title: "The Firefighting Cycle",
          desc: "Frontline managers are constantly reacting — monitoring AHT, QA, escalations in real-time. Without bridging leadership behaviour to operational KPIs, support stays reactive and your best agents leave.",
        },
        {
          icon: "Users",
          color: "#0202ff",
          title: "Coaching at Scale Fails",
          desc: "With 10–20+ team leaders, HR and Ops leaders can't see who is coaching well, who is avoiding difficult conversations, and where the next attrition spike is brewing.",
        },
        {
          icon: "BarChart3",
          color: "#6366f1",
          title: "Metrics Without Context",
          desc: "You see a QA dip — but not why. Curiosity Led surfaces the leadership pattern underneath the metric so your intervention can target the root cause, not the symptom.",
        },
      ],
    },
    finalCta: {
      headline: "Ready to see leadership risk before it hits your SLA?",
      subtext:
        "Start a 12-week pilot and see how Curiosity Led surfaces the seven BPO leadership patterns — mapped directly to your operational metrics.",
      buttonLabel: "Start a 12-week pilot",
      href: "https://cal.com/curiosityled/bookdemo",
    },
  },

  // ── Healthcare ─────────────────────────────────────────────────────────────
  healthcare: {
    slug: "healthcare",
    badge: "Healthcare",
    badgeColor: "#10b981",
    accent: "#10b981",
    pageTitle: "Healthcare — Curiosity Led",
    hero: {
      headline: ["Support the people", "who carry care."],
      subheadline:
        "Frontline healthcare leaders carry extraordinary weight. Curiosity Led gives them a grounded, private daily rhythm — surfacing overload signals and supporting development without adding burden or surveillance.",
      bullets: [
        "Spot overload and burnout risk early — before it affects patient care.",
        "Build psychological safety through low-burden, private check-ins.",
        "Strengthen manager readiness and succession visibility for HR and Talent teams.",
      ],
      primaryCta: { label: "Book a demo", href: "https://cal.com/curiosityled/bookdemo" },
      secondaryCta: { label: "See how it works", href: "https://cal.com/curiosityled/bookdemo" },
    },
    mockup: {
      browserLabel: "app.curiosityled.com · Healthcare",
      title: "Frontline Leader Support",
      subtitle: "Workforce stability & readiness snapshot · 22 managers",
      stats: [
        { label: "Overload Signals", value: "2", color: "#f59e0b" },
        { label: "Readiness Score", value: "81%", color: "#16a34a" },
        { label: "Succession Gaps", value: "3", color: "#0202ff" },
      ],
      alertBanner: {
        title: "⚠ Overload Watch — Charge Nurse Unit 4",
        desc: "High meeting load + low recovery signals for 8 days. Suggested: check-in conversation this week.",
        bg: "#fffbeb",
        borderColor: "#fde68a",
        titleColor: "#b45309",
        descColor: "#92400e",
      },
      flaggedTitle: "Leadership Readiness",
      flaggedItems: [
        { name: "A. Williams, RN Lead", detail: "On succession track", badge: "High", color: "#16a34a" },
        { name: "B. Patel, Charge Nurse", detail: "Overload pattern active", badge: "Developing", color: "#f59e0b" },
        { name: "C. Reyes, Unit Coord.", detail: "Ready for next role", badge: "High", color: "#16a34a" },
      ],
      floatingBadge: {
        icon: "🛡",
        color: "#10b981",
        title: "Private by design",
        subtitle: "Managers own their data — always",
      },
    },
    problem: {
      heading: "The frontline leadership challenge in healthcare",
      intro:
        "Your frontline managers are your most critical and most overlooked leadership layer — carrying clinical responsibility, team wellbeing, and operational continuity simultaneously.",
      cards: [
        {
          icon: "Activity",
          color: "#ef4444",
          title: "Overload goes unseen",
          desc: "Charge nurses and unit coordinators rarely flag their own overload until it becomes a retention or care-quality issue. Curiosity Led surfaces these signals early — privately.",
        },
        {
          icon: "Shield",
          color: "#10b981",
          title: "Support, not surveillance",
          desc: "Healthcare leaders need to feel safe sharing their real state. Our system is built on private, individual data — never monitored by management without consent.",
        },
        {
          icon: "Users",
          color: "#0202ff",
          title: "Succession gaps compound silently",
          desc: "HR and Talent teams often discover succession weaknesses only when a key leader exits. Curiosity Led gives you a live readiness and bench-strength view.",
        },
      ],
    },
    finalCta: {
      headline: "Support your frontline managers. Strengthen your bench.",
      subtext:
        "See how Curiosity Led helps healthcare organisations spot overload, build succession readiness, and support frontline leaders — without surveillance or burden.",
      buttonLabel: "Book a demo",
      href: "https://cal.com/curiosityled/bookdemo",
    },
  },

  // ── Coaching & Consulting ──────────────────────────────────────────────────
  coaching: {
    slug: "coaching",
    badge: "Coaching & Consulting Firms",
    badgeColor: "#6366f1",
    accent: "#6366f1",
    pageTitle: "Coaching & Consulting — Curiosity Led",
    hero: {
      headline: ["Turn your methodology into", "a daily operating system."],
      subheadline:
        "Curiosity Led acts as the white-label operating layer behind your firm's IP — delivering your competency models, coaching flows, and leadership frameworks as a daily rhythm your clients actually use between sessions.",
      bullets: [
        "Bridge the gap between episodic coaching sessions with daily continuity.",
        "Configure your own competency models, frameworks, and branded prompts.",
        "Scale your methodology across 10 clients or 1,000 — without scaling headcount.",
      ],
      primaryCta: { label: "Explore the partner model", href: "https://cal.com/curiosityled/bookdemo" },
      secondaryCta: { label: "Book a demo", href: "https://cal.com/curiosityled/bookdemo" },
    },
    mockup: {
      browserLabel: "YourFirm.curiosityled.com",
      title: "Your Firm — Partner Dashboard",
      titleBadge: { label: "YF", color: "#6366f1" },
      subtitle: "Client engagement overview · 6 active clients",
      stats: [
        { label: "Active Clients", value: "6", color: "#6366f1" },
        { label: "Avg. Engagement", value: "87%", color: "#16a34a" },
        { label: "Between-Session", value: "Daily", color: "#0202ff" },
      ],
      alertBanner: {
        title: "✦ Your framework · Active",
        desc: "CLARITY Leadership Model configured · 5 competencies · Branded as \"Your Firm Intelligence\"",
        bg: "#eef2ff",
        borderColor: "#c7d2fe",
        titleColor: "#4338ca",
        descColor: "#4f46e5",
      },
      flaggedTitle: "Client Progress Since Last Session",
      flaggedItems: [
        { name: "Acme Corp — M. Johnson", detail: "3 commitments kept", badge: "+12% clarity", color: "#16a34a" },
        { name: "BuildCo — T. Singh", detail: "1 commitment shifted", badge: "Decision stall noted", color: "#f59e0b" },
        { name: "FinServ — D. Osei", detail: "Daily rhythm active", badge: "+8% confidence", color: "#16a34a" },
      ],
      floatingBadge: {
        icon: "IP",
        color: "#6366f1",
        title: "Your brand. Your framework.",
        subtitle: "White-label from day one",
      },
    },
    problem: {
      heading: "The coaching continuity problem",
      intro:
        "Your methodology is powerful. But it only works when clients practise it. Most firms lose ground between sessions — Curiosity Led bridges that gap.",
      cards: [
        {
          icon: "RefreshCw",
          color: "#ef4444",
          title: "The Between-Session Gap",
          desc: "Clients leave a great coaching session motivated — then return two weeks later having reverted to old patterns. Without daily support, your methodology loses traction between touchpoints.",
        },
        {
          icon: "Layers",
          color: "#6366f1",
          title: "Methodology at Scale",
          desc: "Your frameworks are repeatable, but delivery is constrained by coach hours. Curiosity Led embeds your IP into a daily operating layer — extending your reach without extending your headcount.",
        },
        {
          icon: "TrendingUp",
          color: "#0202ff",
          title: "Demonstrating ROI",
          desc: "Clients and sponsors need to see measurable progress. Curiosity Led tracks commitment follow-through, competency development, and decision quality — giving you objective evidence of impact.",
        },
        {
          icon: "Repeat",
          color: "#10b981",
          title: "Continuity Across Engagements",
          desc: "When a client engagement ends, the development stops. Curiosity Led creates a persistent growth layer your clients can carry forward — making your firm's value sticky beyond the contract.",
        },
      ],
    },
    finalCta: {
      headline: "Ready to scale your methodology without scaling your headcount?",
      subtext:
        "Explore the Curiosity Led partner model — white-label, configurable, and designed to embed your firm's IP into a daily leadership operating system.",
      buttonLabel: "Explore the partner model",
      href: "https://cal.com/curiosityled/bookdemo",
    },
  },
};

export function getIndustryConfig(slug) {
  return industryContent[slug] || industryContent.bpo;
}