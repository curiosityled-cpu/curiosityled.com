import React from "react";
import { Callout, DataTable, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const assumptions = [
  ["A1", "A 40-person firm will pay $2,000–3,500/year for this", "Yhan: \"maybe they've come in at two to three grand\"; Emilio: \"I can do like three to five\".", "Three quotes above $5,000 all landing, or three at $3,000 all failing."],
  ["A2", "Free tenants convert at 4% or better within 60 days", "Yhan reports converting after free use at Breezy and Homebase, but current published terms differ (Homebase: free plan for one location and ten employees; Breezy: no free plan, 14-day no-card trial). No Curiosity Led data exists.", "Conversion under 2% after 50 free signups, or no upgrade trigger hit by any cohort account."],
  ["A3", "Cost to serve a free manager stays under $1.50/month", "Based on batched daily insights and no human onboarding.", "Actual AI + email spend per free tenant at day 30."],
  ["A4", "Managers are the right billing unit", "Frontline staff never log in, per the architecture explained at 46:34.", "Buyers insisting on per-head pricing for budget reasons."],
  ["A5", "Engagedly is the reference competitor in these accounts", "Yhan reports a partner using it at ~$7k/40 people; Emilio calls it a direct competitor.", "Discovery calls naming Lattice, 15Five, Culture Amp or BambooHR instead."],
  ["A6", "Attendance data is a real purchase driver, not a nice-to-have", "Yhan called it \"low hanging fruit\" and returned to it three times.", "Pilots that ignore the attendance feed entirely."],
  ["A7", "Partner-led delivery keeps small accounts profitable", "Yhan's proposal: train capacity in Jamaica or India; partners advise where consulting is needed.", "Partner-sourced tenants needing more than 20% of contract value in support."],
  ["A8", "SSO is required for any account above ~100 managers", "The Go Flat Bridge conversation is entirely about Entra ID.", "A mid-market deal closing without SSO."],
];

const risks = [
  ["Free tier cost creep", "High", "High", "Cap AI insights per manager per day; batch digests; review cost at day 30 and 90."],
  ["Free attracts non-buyers", "Medium", "Medium", "Require work email, company and headcount band; measure activation, not signups."],
  ["Price anchoring too low", "Medium", "High", "Never discount the enterprise band; use implementation scope as the lever; publish list prices."],
  ["Engagedly answers with a free tier", "Low", "Medium", "Their entire revenue model is per seat, so a free tier cannibalises it. If they do, compete on evidence and frontline seats."],
  ["Delivery capacity shortage", "High", "High", "Hire ahead of the eleventh small tenant; documented onboarding playbook; partner absorbs consulting."],
  ["No database segregation blocks white-label", "Certain", "Medium", "Sell configuration, not customisation, until segregation lands; never promise white-label in a paid band before it exists."],
  ["Single-tenant reliability damage from a free user", "Low", "High", "Per-tenant AI ceilings and graceful degradation rather than shared failure."],
  ["Pause/resume used to avoid paying", "Medium", "Medium", "Retain data read-only while paused; pause available on monthly only, not on annual bands."],
];

const sources = [
  {
    name: "Engagedly — pricing page",
    url: "https://engagedly.com/pricing/",
    used: "All suite prices ($5–8, $3–5, $2, $2, $2, $8, $10, $5 per user per month billed annually), what each suite includes, the shared inclusions (Marissa AI, academy, social wall, workflow automation, mobile) and the demo-only entry motion.",
    type: "Primary — vendor",
  },
  {
    name: "Engagedly — homepage",
    url: "https://engagedly.com/",
    used: "Positioning (\"AI talent management: perform, engage, grow\"), the six capability areas including frontline enablement, the \"trusted by over 5,000 global HR professionals\" claim, vendor-published satisfaction percentages, and the absence of any free or self-serve signup path.",
    type: "Primary — vendor",
  },
  {
    name: "Capterra — Engagedly reviews",
    url: "https://www.capterra.com/p/143298/Engagedly/reviews/",
    used: "4.6 average from 90 reviews, value for money 4.6 from 78 reviews, and reviewer language quoted in this brief (\"great tool for the price\", \"price was extremely competitive\", \"I wish the new UI was a little more intuitive\", \"stop getting ADHD about 'New' things\", \"I sometimes feel stuck\").",
    type: "Third party — verified reviews",
  },
  {
    name: "Capterra — Engagedly product page",
    url: "https://www.capterra.com/p/143298/Engagedly/",
    used: "Product overview, feature categories (360 feedback, learning experience platform, growth/IDP, skill library) and the review distribution behind the headline rating.",
    type: "Third party — catalogue",
  },
  {
    name: "G2 rating of Engagedly (4.3/5)",
    url: "https://engagedly.com/blog/engagedly-vs-performyard/",
    used: "Cited for the G2 figure only, and flagged because the source is Engagedly's own comparison content. Not independently re-verified here.",
    type: "Vendor-cited — low confidence",
  },
  {
    name: "Homebase — pricing",
    url: "https://www.joinhomebase.com/pricing",
    used: "Current free Basic plan, bounded to one location and up to 10 employees, with paid plans charged per location. Used to distinguish the present offer from the free use Yhan described.",
    type: "Primary — vendor",
  },
  {
    name: "Breezy HR — pricing",
    url: "https://breezy.hr/pricing",
    used: "Current terms: no free plan, 14-day full-feature trial with no credit card. Used to correct the assumption that a free plan is what won Yhan.",
    type: "Primary — vendor",
  },
  {
    name: "Implementation call transcript",
    url: "Attached file — ImplementationCall11112026.docx",
    used: "Every meeting finding in this brief, including the ~$7,000 Engagedly figure at 40 people, the flat-rate and $35k enterprise positions, the Breezy and Homebase free-to-paid histories, the frontline-does-not-log-in architecture, and the open technical items.",
    type: "Primary — internal",
  },
];

export default function AssumptionsSources() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="Intellectual honesty">Assumptions, risks and sources</SectionHeading>
        <Lead>
          Every recommendation in this brief rests on eight assumptions. If any of them is wrong, the plan
          changes — so each one is written with the evidence behind it and the observation that would falsify
          it. Three of the eight are currently resting on a single conversation.
        </Lead>
      </div>

      <DataTable
        dense
        columns={[
          { key: "id", label: "#", className: "w-[44px]" },
          { key: "a", label: "Assumption", className: "w-[30%]" },
          { key: "e", label: "Evidence", className: "w-[38%]" },
          { key: "f", label: "Falsified if", className: "w-[26%]" },
        ]}
        rows={assumptions.map(([id, a, e, f]) => ({
          id: <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{id}</span>,
          a: <span className="text-[13px] font-semibold text-foreground">{a}</span>,
          e: <span className="text-[13px] text-muted-foreground">{e}</span>,
          f: <span className="text-[13px] text-muted-foreground">{f}</span>,
        }))}
      />

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Risk register</p>
        <DataTable
          dense
          columns={[
            { key: "r", label: "Risk", className: "w-[30%]" },
            { key: "l", label: "Likelihood", className: "w-[12%]" },
            { key: "i", label: "Impact", className: "w-[12%]" },
            { key: "m", label: "Mitigation", className: "w-[46%]" },
          ]}
          rows={risks.map(([r, l, i, m]) => ({
            r: <span className="text-[13px] font-semibold text-foreground">{r}</span>,
            l: <Tag tone={l === "High" || l === "Certain" ? "danger" : l === "Medium" ? "warning" : "good"}>{l}</Tag>,
            i: <Tag tone={i === "High" ? "danger" : i === "Medium" ? "warning" : "good"}>{i}</Tag>,
            m: <span className="text-[13px] text-muted-foreground">{m}</span>,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Sources</p>
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.name} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-bold text-foreground">{s.name}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.type}
                </span>
              </div>
              {s.url.startsWith("http") ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block break-all text-[11px] text-[#0202ff] hover:underline dark:text-blue-300"
                >
                  {s.url}
                </a>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.url}</p>
              )}
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.used}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Public sources accessed 11 November 2026. Competitor pricing and ratings change without notice; re-check
          before publishing any comparison.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Transcript reliability note</p>
          <Bullets
            className="mt-2"
            items={[
              "The recording is machine-transcribed and both speaker labels should be treated as approximate.",
              "Financial figures outside the clear ones ($7,000 for 40 people, $35,000 for 3,000–5,000 people, $25,000–30,000 projects, $300/month maintenance) appear garbled in the source and are not used.",
              "\"Attendant tracking\" in the transcript is attendance tracking, confirmed by the surrounding conversation about the Homebase API.",
              "The call contains a long social section between roughly 01:22 and 01:24 with no commercial content; it is excluded.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What this brief deliberately does not do</p>
          <Bullets
            className="mt-2"
            items={[
              "It does not publish Curiosity Led list prices — every figure is a proposal to be tested.",
              "It does not assume Engagedly's contract length or implementation fee, both undisclosed. Their $7,500 annual minimum is published and is treated as published, not inferred.",
              "It does not recommend competing on module breadth, which the review evidence argues against.",
              "It does not treat the free tier as a permanent marketing tactic — it is a measured channel with a cost ceiling.",
              "It does not propose changing the product roadmap; it only sequences which existing capabilities belong in which band.",
            ]}
          />
        </div>
      </div>

      <Callout tone="accent" title="If you only do three things">
        <p>
          Close the two gates that actually block a launch — tenant separation and check-in reliability — then
          run the invited cohort with the offer visible. Price the first paid band at $3,000 flat instead of
          anything per head, and ask for a commitment decision at day 45 rather than at day 90. Everything else
          in this brief is optimisation around those three moves.
        </p>
      </Callout>
    </div>
  );
}