// ─────────────────────────────────────────────────────────────────────────────
// industryConfig.js — Single source of truth for industry-specific landing copy,
// screenshots, and hero mockup data across /bpo, /healthcare, /coaching routes.
//
// Each industry has:
//   - hero:           headline, subheadline, bullets, CTAs, accent color, badge
//   - mockup:         tailored app-preview UI (title, stats, flagged items, footer)
//   - problem:        section heading, intro, and proof-point cards
//   - buyerNeeds:     section label, heading, and need cards
//   - explainer:      section heading, intro, and image
//   - objectionStrip: objection text
//   - interactivePreview: section heading, subtext, and image
//   - fitSection:     section heading, intro, bullets, and image
//   - ninetyDays:     section heading, outcomes, quote, and image
//   - beyond:         section heading, intro, notList, isList
//   - finalCta:       closing CTA headline, subtext, button label
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
        { icon: "AlertTriangle", color: "#ef4444", title: "The Subjectivity Trap", desc: "Performance management relies on fragmented scorecards and manager memory — creating a trust gap and inconsistent coaching that prevents you from seeing trends until they've already hit your SLA." },
        { icon: "TrendingDown", color: "#f59e0b", title: "The Firefighting Cycle", desc: "Frontline managers are constantly reacting — monitoring AHT, QA, escalations in real-time. Without bridging leadership behaviour to operational KPIs, support stays reactive and your best agents leave." },
        { icon: "Users", color: "#0202ff", title: "Coaching at Scale Fails", desc: "With 10–20+ team leaders, HR and Ops leaders can't see who is coaching well, who is avoiding difficult conversations, and where the next attrition spike is brewing." },
        { icon: "BarChart3", color: "#6366f1", title: "Metrics Without Context", desc: "You see a QA dip — but not why. Curiosity Led surfaces the leadership pattern underneath the metric so your intervention can target the root cause, not the symptom." },
      ],
    },
    problemSection: {
      heading: "Most BPO leadership development starts too late and stays too fragmented.",
      intro: "BPO operations are already investing in coaching, QA programs, and assessments. The challenge is that support often sits outside the flow of work, leadership signals are scattered across systems, and attrition conversations start without a clear view of which team leaders are at risk.",
      image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop",
      proofPoints: [
        { title: "Coaching happens after the SLA has already dipped.", body: "Support gets triggered once a metric has breached — not before the leadership pattern that caused it." },
        { title: "Ops gets disconnected signals instead of one defensible story.", body: "QA scores, coaching logs, and attrition data sit in different places, making root-cause analysis hard." },
        { title: "Attrition discussions begin without enough visibility.", body: "Retention conversations start without a clear view of which team leaders are showing risk patterns." },
      ],
      quotesLabel: "What we hear from BPO teams",
      quotes: [
        { persona: "Team Leader", quote: "I don't need another scorecard. I need help seeing the pattern before it costs me my best agent." },
        { persona: "Ops / HR", quote: "I have QA data and coaching logs, but no single leadership story that ties behaviour to SLA." },
        { persona: "Executive Sponsor", quote: "We're investing in coaching, but attrition conversations still start after the exit interview." },
      ],
    },
    buyerNeeds: {
      label: "What Ops and HR leaders need",
      heading: ["Built for the work BPO Ops and HR leaders", "are actually responsible for."],
      cards: [
        { icon: "Users", title: "Coach team leaders in the moment", body: "Give team leaders clear next steps inside the flow of work — before a coaching gap becomes an attrition spike or SLA dip." },
        { icon: "TrendingUp", title: "See risk patterns earlier", body: "Surface the seven BPO leadership patterns — reactive leadership, coaching deficit, attrition risk — before they compound into operational damage." },
        { icon: "Puzzle", title: "Map to your existing KPIs", body: "Align leadership signals directly to AHT, FCR, QA, and escalation rates — so every coaching action is grounded in business impact." },
        { icon: "BarChart2", title: "Show impact more clearly", body: "Connect leadership behaviour to operational outcomes with a defensible story of what's improving and what still needs attention." },
      ],
    },
    explainer: {
      label: "How it works",
      heading: "How Curiosity Led turns BPO leadership signals into timely coaching.",
      intro:
        "One system helps you spot leadership risk patterns, trigger coaching flows, reinforce behaviour in Teams, and give Ops leaders a clearer view of team health.",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop",
    },
    objectionStrip:
      "Already have QA scorecards, coaching programs, or a competency model? Curiosity Led helps bring them into one clearer system for pattern detection, coaching action, and operational impact.",
    interactivePreview: {
      label: "For Every Level",
      heading: "One platform. Clear boundaries.",
      subtext:
        "Team leaders get a private development view. Ops and HR leaders get an aggregated risk-pattern view designed to surface coaching needs and attrition signals earlier.",
    },
    fitSection: {
      label: "Built to fit your world",
      heading: "Designed to work with what you already have.",
      intro:
        "Curiosity Led does not ask Ops or HR teams to start over. It helps bring existing QA scorecards, coaching programs, and competency models into one clearer system for pattern detection, coaching delivery, and operational impact.",
      bullets: [
        "Use our competency library or your own QA framework.",
        "Complement existing coaching programs and scorecards.",
        "Add clearer risk visibility without another disconnected dashboard.",
      ],
      image: "https://images.unsplash.com/photo-1552581234-26160f608309?w=800&h=600&fit=crop",
    },
    ninetyDays: {
      label: "What this makes possible",
      heading: "A clearer system for BPO leadership, coaching, and retention.",
      outcomes: [
        { title: "Earlier coaching", body: "Spot when team leaders need support sooner — before a pattern becomes an SLA dip or attrition event." },
        { title: "Stronger pattern visibility", body: "See which leadership risk patterns are active, which are recovering, and where coaching is making a measurable difference." },
        { title: "Better talent conversations", body: "Bring objective leadership signals into conversations about progression, performance, and development priorities." },
        { title: "A more measurable coaching story", body: "Connect coaching activity to operational outcomes with a clearer, more defensible view of progress over time." },
      ],
      quote:
        "The goal is not more coaching activity. The goal is earlier pattern detection, better timing, and a leadership story Ops can defend when executives ask what is working.",
      image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
    },
    beyond: {
      label: "Who we are",
      heading: "Not another dashboard. A clearer system.",
      intro:
        "Curiosity Led is not another QA tool, coaching marketplace, or performance portal. It brings together the leadership signals scattered across your BPO operations and makes them more visible, more timely, and easier to act on — giving Ops and HR a stronger foundation for coaching decisions, retention conversations, and leadership investment.",
      notList: [
        "Another QA or performance monitoring tool",
        "Another standalone coaching program",
        "Another dashboard you have to check",
      ],
      isList: [
        "A connected system for leadership pattern detection and coaching action",
        "In-workflow guidance tied to real BPO operational challenges",
        "One clear view of leadership risk and coaching impact",
        "Compatible with your existing KPIs, scorecards, and competency models",
      ],
    },
    faq: {
      eyebrow: "Buyer questions",
      headline: "Answers to the questions BPO and logistics HR teams actually ask.",
      subtext: "Answers to the questions HR teams actually ask.",
      items: [
        { q: "Will this disrupt our current operation or client delivery?", a: "Curiosity Led is designed to layer into your existing environment, not replace your TMS or client systems on day one. A pilot can start with a very small feature set — simple check-ins, KPI views, and pattern visibility — so teams can test value without disrupting delivery." },
        { q: "Can this work with the KPIs and scorecards we already use?", a: "Yes. Curiosity Led is built to connect leadership signals to the metrics BPO and logistics teams already manage, such as SLA adherence, QA, FCR, AHT, schedule adherence, escalations, throughput, and attrition. The goal is not to invent a new scorecard, but to show what leadership patterns may be shaping the numbers you already care about." },
        { q: "Is this just another engagement tool or survey platform?", a: "No. The BPO use case is built around operational performance and coaching quality, not generic engagement tracking. Curiosity Led helps leaders connect daily priorities, KPI movement, coaching behavior, and people risk in one system so they can act earlier instead of waiting for performance reviews or escalations." },
        { q: "How is this different from surveillance or productivity monitoring?", a: "Curiosity Led is designed to support better leadership decisions, not to monitor every employee action. The product direction and privacy model emphasize aggregated patterns, role-based visibility, and support-first coaching rather than invasive tracking language or watchdog tooling." },
        { q: "Will team leaders actually use it?", a: "The experience is intentionally lightweight and tied to the work team leaders already need to do. The BPO workflow is built around quick daily priorities, simple KPI-linked prompts, and practical coaching actions, so the system fits the pace of an operations environment instead of feeling like another training portal." },
        { q: "Can it help reduce subjectivity in reviews and performance conversations?", a: "Yes. One of the clearest BPO pain points in your materials is that reviews depend too much on memory, opinion, or inconsistent manager judgment. Curiosity Led helps bring KPI signals, check-ins, coaching activity, and follow-through into one running picture so conversations can be grounded in clearer evidence over time." },
        { q: "What if we only want to start with one team or one client line?", a: "That is the recommended motion. The pilot guidance already points to a 12-week rollout with a small cohort, usually around 10 to 20 users, focused on one team or one slice of the operation with clear KPIs and SLAs." },
        { q: "What happens if something breaks during the pilot?", a: "The intended pilot design limits operational exposure. The failure modes described in your pilot notes are things like missed reminders, dashboards not rendering, or data not recording correctly — not downtime in the client's production systems or TMS." },
        { q: "Do we have to turn on everything at once?", a: "No. The recommended BPO rollout starts with Lead and simple Patterns first, then layers in more advanced elements later if the basics are working. That phased approach is meant to reduce risk and make adoption easier in a high-pressure environment." },
        { q: "Can this support coaching and succession, not just performance tracking?", a: "Yes. The BPO materials repeatedly position Curiosity Led as more than a dashboard. It helps identify patterns like Performance Avoidance, Reactive Leadership, Accountability Gap, and Attrition Risk Behavior so leaders can coach earlier, while also building a cleaner basis for development and succession decisions over time." },
      ],
    },
    finalCta: {
      headline: "Ready to see leadership risk before it hits your SLA?",
      subtext:
        "See how Curiosity Led surfaces the seven BPO leadership patterns — mapped directly to your operational metrics.",
      buttonLabel: "Book a demo",
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
      headline: ["Earlier leadership signals.", "Clearer intervention paths."],
      subheadline:
        "Curiosity Led helps HR and operations leaders spot where manager support is needed, understand what patterns are emerging, and intervene before instability, turnover, or performance loss compounds.",
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
        { icon: "Activity", color: "#ef4444", title: "Overload goes unseen", desc: "Charge nurses and unit coordinators rarely flag their own overload until it becomes a retention or care-quality issue. Curiosity Led surfaces these signals early — privately." },
        { icon: "Shield", color: "#10b981", title: "Support, not surveillance", desc: "Healthcare leaders need to feel safe sharing their real state. Our system is built on private, individual data — never monitored by management without consent." },
        { icon: "Users", color: "#0202ff", title: "Succession gaps compound silently", desc: "HR and Talent teams often discover succession weaknesses only when a key leader exits. Curiosity Led gives you a live readiness and bench-strength view." },
      ],
    },
    problemSection: {
      eyebrow: "Why support still arrives too late",
      heading: "Most healthcare manager support starts after the strain is already visible.",
      intro: "Healthcare organizations already invest in leadership development, coaching, and assessments. The problem is not effort. The problem is that support often sits outside the flow of work, manager signals are scattered across systems, and HR is left trying to piece together readiness, risk, and progress after instability is already showing up in turnover, burnout, or team performance.",
      image: "/web_overworked_CREDIT-PeopleImages_iStock-654187068.png",
      proofPoints: [
        { title: "Development happens after strain is already visible.", body: "Support gets triggered once a behavior has impacted the team — not before." },
        { title: "HR gets disconnected signals instead of one defensible story.", body: "Assessments, coaching, and goals sit in different places, making impact hard to explain." },
        { title: "Succession discussions begin without enough visibility.", body: "Readiness conversations start without a clear view of bench strength or progression." },
      ],
      quotesLabel: "What we hear from healthcare teams",
      quotes: [
        { persona: "Manager", quote: "I do not need another program to finish. I need help with what is happening this week." },
        { persona: "HR / Talent", quote: "I have programs and coaching, but no single, defensible leadership story." },
        { persona: "Executive Sponsor", quote: "We are investing in leadership, but succession conversations still start without a clear picture of who is ready." },
      ],
    },
    buyerNeeds: {
      label: "What HR and Talent leaders need",
      heading: ["Built for the work HR and Talent leaders", "are actually responsible for."],
      cards: [
        { icon: "Users", title: "Support managers in the moment", body: "Give newly promoted and stretched managers clear next steps inside the flow of work, not after the damage is done." },
        { icon: "TrendingUp", title: "See readiness and succession more clearly", body: "Surface progression, watch areas, and bench gaps earlier so readiness and succession planning are grounded in better visibility." },
        { icon: "Puzzle", title: "Work with your existing model", body: "Use Curiosity Led's competency library or align the experience to the leadership framework your organization already uses." },
        { icon: "BarChart2", title: "Show impact more clearly", body: "Connect assessments, goals, and development activity to a stronger story of leadership progress and organizational readiness." },
      ],
    },
    explainer: {
      label: "How It Works",
      heading: "One system from assessment to executive view.",
      intro:
        "One system helps teams assess earlier, guide action, reinforce behavior, and show leadership visibility in one place.",
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop",
      panels: [
        { visualKey: "assess", title: "Assess early", body: "Establish a baseline for newly promoted or newly hired leaders and surface where support may be needed before issues escalate." },
        { visualKey: "action", title: "Focus the next action", body: "Turn insight into one clear goal and one practical next step tied to what the manager is actually handling in their team right now." },
        { visualKey: "reinforce", title: "Reinforce in the workflow", body: "Deliver nudges, learning, and coaching loops in the tools managers already use, so support stays connected to real situations instead of becoming another disconnected program." },
        { visualKey: "leadership", title: "Give leadership one view", body: "Bring assessments, actions, progress, and key lifecycle metrics from across HR into a single Leadership Intelligence Hub so HR and executive sponsors can see who is at risk, who is progressing, and where to focus intervention or investment next." },
      ],
    },
    objectionStrip:
      "Already have leadership programs, assessments, or a competency model? Curiosity Led helps bring them into one clearer system for manager support, readiness, and visibility.",
    interactivePreview: {
      label: "For Every Level",
      heading: "One platform. Clear boundaries.",
      subtext:
        "Frontline leaders get a private development view. HR and Talent leaders get an aggregated organizational view designed to support readiness, succession, and earlier intervention.",
    },
    fitSection: {
      label: "Built to fit your world",
      heading: "Designed to work with what you already have.",
      intro:
        "Curiosity Led does not ask HR teams to start over. It helps bring existing leadership programs, assessments, coaching, and competency models into one clearer system for manager support, readiness visibility, and succession planning.",
      bullets: [
        "Use our competency library or your own framework.",
        "Complement existing leadership development programs and coaching.",
        "Add clearer visibility without creating another disconnected process.",
      ],
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop",
    },
    ninetyDays: {
      label: "What this makes possible",
      heading: "A clearer system for manager development, readiness, and succession.",
      outcomes: [
        { title: "Earlier support", body: "Spot when managers need support sooner and make interventions more timely and practical." },
        { title: "Stronger bench visibility", body: "See where bench strength is growing, where readiness is lagging, and where succession gaps need attention." },
        { title: "Better talent conversations", body: "Bring more structure and evidence into conversations about progression, readiness, and development priorities." },
        { title: "A more measurable development story", body: "Connect leadership activity to a clearer, more defensible view of progress over time." },
      ],
      quote:
        "The goal is not more leadership activity. The goal is earlier visibility, better timing, and a leadership-development story HR can defend when executives ask what is working.",
      image: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=600&fit=crop",
    },
    beyond: {
      label: "Who we are",
      heading: "Not another tool. A clearer system.",
      intro:
        "Curiosity Led is not another LMS, leadership program, or coaching marketplace. It brings together the development activity you are already running and makes it more visible, more timely, and easier to act on — giving healthcare organizations a stronger foundation for succession planning, readiness conversations, and leadership investment decisions.",
      notList: [
        "Another LMS or e-learning platform",
        "Another standalone leadership program",
        "Another coaching marketplace",
      ],
      isList: [
        "A connected system for manager support, readiness, and succession",
        "In-workflow guidance tied to real healthcare management challenges",
        "One clear view of development progress and organizational readiness",
        "Compatible with your existing competency model and leadership programs",
      ],
    },
    finalCta: {
      headline: "Give HR a clearer leadership story before risk becomes loss.",
      subtext:
        "Curiosity Led helps healthcare organizations identify leadership risk earlier, support managers in the flow of work, and create one clearer view of development progress, readiness, and intervention impact.",
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
        { icon: "RefreshCw", color: "#ef4444", title: "The Between-Session Gap", desc: "Clients leave a great coaching session motivated — then return two weeks later having reverted to old patterns. Without daily support, your methodology loses traction between touchpoints." },
        { icon: "Layers", color: "#6366f1", title: "Methodology at Scale", desc: "Your frameworks are repeatable, but delivery is constrained by coach hours. Curiosity Led embeds your IP into a daily operating layer — extending your reach without extending your headcount." },
        { icon: "TrendingUp", color: "#0202ff", title: "Demonstrating ROI", desc: "Clients and sponsors need to see measurable progress. Curiosity Led tracks commitment follow-through, competency development, and decision quality — giving you objective evidence of impact." },
        { icon: "Repeat", color: "#10b981", title: "Continuity Across Engagements", desc: "When a client engagement ends, the development stops. Curiosity Led creates a persistent growth layer your clients can carry forward — making your firm's value sticky beyond the contract." },
      ],
    },
    problemSection: {
      heading: "Most coaching impact fades between sessions.",
      intro: "Coaching firms are already delivering powerful methodology in sessions. The challenge is that the impact doesn't last — without daily support, clients revert to old patterns, and firms can't prove measurable follow-through between touchpoints.",
      image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop",
      proofPoints: [
        { title: "Methodology loses traction between sessions.", body: "Clients leave motivated, then revert — 336 hours between sessions with no structured support." },
        { title: "Firms get self-reported progress instead of objective evidence.", body: "Commitment follow-through is tracked manually, making ROI conversations with sponsors subjective." },
        { title: "Delivery is constrained by coach hours.", body: "Your framework is repeatable, but scaling it means scaling headcount — limiting your firm's reach." },
      ],
      quotesLabel: "What we hear from coaching firms",
      quotes: [
        { persona: "Coach", quote: "My clients make commitments in session, but I have no way to know if they follow through before we meet again." },
        { persona: "Firm Partner", quote: "We have a powerful methodology, but we can't scale it without hiring more coaches." },
        { persona: "HR Sponsor", quote: "I'm paying for coaching, but I can't see objective evidence that behaviour is actually changing." },
      ],
    },
    buyerNeeds: {
      label: "What coaching firms need",
      heading: ["Built for the work coaching and consulting firms", "are actually responsible for."],
      cards: [
        { icon: "Users", title: "Extend your methodology between sessions", body: "Give clients daily prompts, commitment tracking, and reflections aligned to your framework — so your IP stays active in the 336 hours between sessions." },
        { icon: "TrendingUp", title: "Demonstrate measurable ROI", body: "Track commitment follow-through, competency growth, and decision quality — giving sponsors objective evidence of your firm's impact." },
        { icon: "Puzzle", title: "Configure your own framework", body: "Map your competency model, behavioural anchors, and coaching language into the platform — branded as your firm, not Curiosity Led." },
        { icon: "BarChart2", title: "Scale without adding headcount", body: "Run your methodology across 10 clients or 1,000 simultaneously — freeing your coaches to focus on high-value session work." },
      ],
    },
    explainer: {
      label: "How it works",
      heading: "How Curiosity Led turns your methodology into a daily operating system.",
      intro:
        "One platform embeds your framework into a daily rhythm — tracking commitments, surfacing patterns, and generating session prework so your coaching stays continuous and measurable.",
      image: "https://images.unsplash.com/photo-1552664730-d303ca58de78?w=800&h=600&fit=crop",
    },
    objectionStrip:
      "Already have a competency model, coaching framework, or leadership assessment? Curiosity Led embeds it into a daily operating layer — white-labelled as your firm.",
    interactivePreview: {
      label: "For Every Level",
      heading: "Your methodology. Clear boundaries.",
      subtext:
        "Clients get a private daily development view aligned to your framework. You get an aggregated client-progress view designed to track follow-through and demonstrate ROI to sponsors.",
    },
    fitSection: {
      label: "Built to fit your world",
      heading: "Your brand. Your framework. Your IP.",
      intro:
        "Curiosity Led is configured around your firm's competency model, not ours. Your clients see your branding, your language, and your coaching philosophy — powered by our operating infrastructure.",
      bullets: [
        "Full white-label: your logo, colours, domain, and prompts.",
        "Map any competency structure or behavioural anchors.",
        "Generate objective progress reports for HR sponsors.",
      ],
      image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop",
    },
    ninetyDays: {
      label: "What this makes possible",
      heading: "A daily operating system for your coaching methodology.",
      outcomes: [
        { title: "Continuous client development", body: "Your methodology stays active every day between sessions — not just during the hour your clients spend with a coach." },
        { title: "Objective impact evidence", body: "Track commitment follow-through, competency growth, and decision quality with data sponsors can trust." },
        { title: "Scalable delivery", body: "Run your framework across your entire client portfolio simultaneously without scaling coach headcount." },
        { title: "Sticky client relationships", body: "Create a persistent growth layer that keeps your firm's value alive beyond the engagement contract." },
      ],
      quote:
        "The goal is not more coaching hours. The goal is continuous methodology application, measurable follow-through, and an impact story your firm can defend when sponsors ask what changed.",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
    },
    beyond: {
      label: "Who we are",
      heading: "Not another coaching tool. Your operating layer.",
      intro:
        "Curiosity Led is not another coaching marketplace, assessment platform, or LMS. It is the white-label operating infrastructure behind your firm's IP — embedding your methodology into a daily rhythm your clients actually use, so your coaching stays continuous, measurable, and scalable.",
      notList: [
        "Another coaching marketplace or directory",
        "Another standalone assessment platform",
        "Another generic LMS your clients won't use",
      ],
      isList: [
        "A white-label operating layer for your firm's methodology",
        "Daily prompts, commitment tracking, and reflections in your language",
        "Objective impact reporting for HR sponsors and clients",
        "Scalable across your entire client portfolio from day one",
      ],
    },
    faq: {
      eyebrow: "Buyer questions",
      headline: "Answers to the questions coaching and consulting firms actually ask.",
      subtext: "Answers to the questions HR teams actually ask.",
      items: [
        { q: "Does Curiosity Led replace the coach or our methodology?", a: "No. Curiosity Led is designed to extend your coaching methodology between live sessions with structured reflection, guided follow-through, and progress visibility that stays connected to your approach." },
        { q: "How does this help between coaching sessions?", a: "It gives clients a lightweight daily or weekly rhythm for reflection, action, and follow-through, so momentum does not disappear between workshops or coaching calls." },
        { q: "Can we brand this as part of our own offer?", a: "Yes. The coaching positioning work for Curiosity Led already emphasizes branded experience, configurable prompts, and adaptable competency frameworks so firms can make the system feel like an extension of their own IP." },
        { q: "How do sponsors or client buyers see value?", a: "Curiosity Led helps make progress, friction patterns, and follow-through visible enough for sponsors to understand what is changing between sessions, rather than relying only on anecdote or end-of-program summaries." },
        { q: "Will clients actually use it, or will it feel like another portal?", a: "The intended experience is deliberately lightweight, with small prompts and guided reflection built around real leadership moments rather than a heavy LMS-style experience." },
        { q: "What kinds of coaching work does this fit best?", a: "It is strongest for leadership coaching, manager development, cohort programs, and consulting engagements where the goal is sustained behavior change, clearer follow-through, and more visible movement over time." },
        { q: "Can this support cohorts as well as one-on-one coaching?", a: "Yes. Your existing positioning for coaching firms supports both individual engagements and broader cohort-based delivery, especially where firms want continuity, consistency, and a more scalable way to reinforce their methods." },
        { q: "How does Curiosity Led help us prove our program works?", a: "It gives coaching firms a clearer record of actions, reflections, stuck points, and movement over time, which creates a more credible story of client progress than session notes or satisfaction scores alone." },
        { q: "Will this flatten the human side of coaching?", a: "It should do the opposite when positioned correctly. The platform is meant to keep the human coaching relationship active between sessions by prompting reflection and helping clients bring more specific, real-world material back into the next conversation." },
        { q: "What does a pilot look like for a coaching firm?", a: "The current commercial model frames coaching as a 12-week visibility pilot focused on making between-session progress, friction patterns, and follow-through more visible for both the firm and the sponsor." },
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