import React from "react";
import { Callout, DataTable, Stat, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const suites = [
  { suite: "Performance Suite", price: "$5–8", includes: "Reviews, 360 feedback, goals & OKRs, real-time feedback, 1:1s, competencies, skill library" },
  { suite: "Learning Suite", price: "$3–5", includes: "LMS, learning paths, AI recommendations, compliance tracking, assessment & certification, live sessions, mobile learning" },
  { suite: "Engage & Listen", price: "$2", includes: "Engagement surveys, Butterfly EI, team pulse, intranet" },
  { suite: "Recognize & Reward", price: "$2", includes: "Gamification, badges, reward storefront, praise wall" },
  { suite: "Talent Mobility", price: "$2", includes: "Growth, IDPs, career paths, skill gap analysis, talent discovery, succession" },
  { suite: "Mentoring", price: "$8", includes: "Mentor matching, program management, progress tracking, mentoring university" },
  { suite: "Manage Compensation", price: "$10", includes: "Comp planning, budget allocation, pay for performance, benchmarking, pay grades" },
  { suite: "Deskless Communication", price: "$5", includes: "Communication hub, SMS & push, personalised e-learning, compliance, surveys, recognition" },
];

const strengths = [
  "Real breadth: eight priced suites that cover performance, learning, listening, recognition, mobility, mentoring, compensation and deskless comms.",
  "Brand credibility — six Brandon Hall awards per the call, a named AI persona (Marissa AI), an academy, and case studies that read like enterprise references.",
  "Modular pricing shown openly by suite. A buyer can self-diagnose what they need before a sales call.",
  "Gamification and recognition are treated as a growth driver rather than a bolt-on, which is exactly the behaviour they sell.",
  "Integrations surface (HRIS, SSO, workspace channels, goal tools, content partners, rewards) that signals enterprise readiness.",
  "A single AI assistant threaded across every suite — the buyer experiences one product, not eight.",
];

const gaps = [
  {
    gap: "No self-serve or free entry",
    evidence: "The pricing page routes every path to \"Book a Demo\". No signup, no free plan, no card-less trial is published.",
    use: "Your fastest structural advantage. A working free tier is a channel they cannot answer without cannibalising per-seat revenue.",
  },
  {
    gap: "Per-user pricing punishes headcount",
    evidence: "Every suite is per user per month, billed annually. Frontline add-on alone is $5/head/month.",
    use: "At 2,000 frontline staff their deskless add-on is ~$120,000/year. You charge $0 for the same people.",
  },
  {
    gap: "No operational data layer",
    evidence: "Yhan: it tracks performance \"but it's all subjective… it doesn't track attendance.\" Nothing on their site claims an attendance or shift data feed.",
    use: "Attendance + Homebase data turns self-report into evidence. That is the wedge, and it is defensible.",
  },
  {
    gap: "UI learning curve",
    evidence: "Capterra reviewers: \"I wish the new UI was a little more intuitive\"; \"I'm not the best administrator… I sometimes feel lost.\"",
    use: "Win on time-to-first-value. If a manager completes a check-in in under three minutes, you beat a richer product on the dimension that matters to a 40-person firm.",
  },
  {
    gap: "Feature sprawl is visible to customers",
    evidence: "A reviewer asked them to \"stop getting ADHD about 'New' things\" and focus on the core product.",
    use: "Do not chase suite parity. Ship fewer things that hold up under daily use.",
  },
  {
    gap: "Annual commit friction",
    evidence: "Per-user, billed annually. For a 40-person firm in the Caribbean that is the full ~$7,000 up front.",
    use: "Offer monthly with pause/resume. Breezy proved the mechanic works on exactly this buyer.",
  },
];

export default function EngagedlyTeardown() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="Competitor teardown">Engagedly, as it actually sells</SectionHeading>
        <Lead>
          Engagedly positions itself as AI talent management: perform, engage and grow in one platform, with
          Marissa AI and gamification across six categories including frontline enablement. Their homepage
          claims "trusted by over 5,000 global HR professionals". Everything below comes from their public
          pricing page, their homepage, Capterra's verified reviews page and the implementation call —
          accessed 11 November 2026. Where a claim is theirs, it is labelled.
        </Lead>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Capterra rating" value="4.6 / 5" sub="90 verified reviews; value for money 4.6 from 78 reviews." />
        <Stat label="G2 rating" value="4.3 / 5" sub="Cited in Engagedly's own comparison content, not independently re-checked here." />
        <Stat label="Entry motion" value="Demo only" sub="No free plan, no published trial, no self-serve checkout on the pricing page." />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">
          Published pricing — per user, per month, billed annually
        </p>
        <DataTable
          dense
          columns={[
            { key: "suite", label: "Suite", className: "w-[22%]" },
            { key: "price", label: "$/user/mo", className: "whitespace-nowrap w-[90px]" },
            { key: "includes", label: "What is inside" },
          ]}
          rows={suites}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          All suites include Marissa AI Coach, templates, Engagedly Academy, AI HR assistant, social wall,
          talent analysis, workflow automation and a mobile app. Suites are stacked, so the effective
          per-head price is the sum of what a buyer selects.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Where they are genuinely strong</p>
          <Bullets className="mt-2" items={strengths} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What you should copy</p>
          <Bullets
            className="mt-2"
            items={[
              "Visible modular pricing by need — let buyers self-diagnose before they talk to you.",
              "One named AI persona. They have Marissa; you have Atreus. Name it everywhere, including the free tier.",
              "An academy and templates that make the product feel inhabited on day one.",
              "Recognition treated as a driver of the behaviours the product depends on.",
              "Awards and reference customers used as proof, not decoration.",
            ]}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">The six gaps you can attack</p>
        <DataTable
          columns={[
            { key: "gap", label: "Gap", className: "w-[22%]" },
            { key: "evidence", label: "Evidence", className: "w-[39%]" },
            { key: "use", label: "How Curiosity Led exploits it", className: "w-[39%]" },
          ]}
          rows={gaps.map((g) => ({
            gap: <span className="font-semibold text-foreground">{g.gap}</span>,
            evidence: <span className="text-[13px]">{g.evidence}</span>,
            use: <span className="text-[13px]">{g.use}</span>,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">The cost comparison customers will do themselves</p>
        <DataTable
          columns={[
            { key: "scenario", label: "Scenario" },
            { key: "eng", label: "Engagedly", className: "w-[26%]" },
            { key: "cl", label: "Curiosity Led (illustrative)", className: "w-[26%]" },
          ]}
          rows={[
            {
              scenario: "40 managers — performance, learning, listening and recognition",
              eng: "$5,760–$8,160/yr ($12–17/user/mo). Matches the ~$7,000 Yhan reported.",
              cl: "$3,000/yr Team band — roughly half.",
            },
            {
              scenario: "40 managers + 200 frontline staff",
              eng: "$17,760–$20,160/yr once the $5 deskless add-on is applied to frontline.",
              cl: "$3,000/yr. Frontline never counts.",
            },
            {
              scenario: "2,000 frontline staff, deskless communication only",
              eng: "~$120,000/yr at $5/head/month.",
              cl: "$0 — they receive a link, not a login.",
            },
            {
              scenario: "3,000–5,000 people, full platform",
              eng: "$432,000–$1,020,000/yr at $12–17/user/mo.",
              cl: "$35,000/yr platform plus implementation.",
            },
          ]}
        />
      </div>

      <Callout tone="warning" title="What we still do not know about them">
        <p>
          Their minimum contract size, whether an implementation fee is charged, whether any card-less trial
          exists behind the demo form, total customer count and current revenue are all undisclosed. Anything
          about how they sell at the 40-person end is inference from Yhan's own account and from public review
          behaviour — treat it as a hypothesis to test in the first 30 days, not as established fact.
        </p>
      </Callout>

      <Callout tone="accent" title="Review themes worth reading twice">
        <p>
          Verified Capterra reviews are positive overall — "great tool for the price", "the price was
          extremely competitive", "exceptional platform and customer service", "next step to success". The
          recurring criticism is not value: it is intuitiveness and depth of self-service. That tells you the
          bar to clear is not features, it is confidence. A first-time administrator should never feel lost,
          because that is precisely the complaint their customers write down.
        </p>
      </Callout>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3.5">
        <Tag tone="good">Copy</Tag>
        <span className="text-sm text-muted-foreground">modular packaging, named AI, academy, awards</span>
        <span className="mx-1 text-muted-foreground">·</span>
        <Tag tone="danger">Avoid</Tag>
        <span className="text-sm text-muted-foreground">per-head pricing, feature sprawl, demo-only entry</span>
      </div>
    </div>
  );
}