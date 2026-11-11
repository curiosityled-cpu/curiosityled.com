import React from "react";
import { Callout, DataTable, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const phases = [
  {
    window: "Days 1–30",
    title: "Open the free door and measure it",
    focus:
      "Nothing here is about marketing spend. The first month exists to prove that a free tenant activates, costs little, and that your numbers survive contact with real buyers.",
    experiments: [
      "Ship Free Forever with the published boundary table and the 10-manager cap. No card, no call.",
      "Fix the check-in link path both ways: signed out → login → straight back to the check-in. Verified on mobile.",
      "Configure Microsoft Entra ID for Go Flat Bridge and invite Ebony and Orion with real data in place — the transcript's own next step.",
      "Run five design-partner conversations at $2,000–3,500 across the Caribbean BPO circle, with two converting to a paid pilot.",
      "Instrument four events: signup, first check-in completed, third manager activated, second team created.",
    ],
    metrics: [
      ["Activation: 3 managers complete a check-in in week 1", "≥ 40% of free signups", "Below 20%, stop. Onboarding is the problem, not the price."],
      ["Cost to serve per free tenant", "≤ $1.50/manager/month", "Above it, tighten the AI cap before spending on acquisition."],
      ["Design-partner meetings booked", "5", "Fewer than 3 means the offer is not legible yet."],
    ],
    gate: "Gate 1 — activation at or above 40% and at least two paid pilots signed. If activation misses, the next 30 days go into onboarding and nothing else.",
    owner: "Emilio (product and pricing) · Yhan (design partners and BPO access)",
  },
  {
    window: "Days 31–60",
    title: "Convert, and build the channel",
    focus:
      "Free is proven, so now turn it into revenue and into a channel that carries Curiosity Led into accounts you could never reach alone.",
    experiments: [
      "Turn on the seven in-product upgrade triggers. Every one lands on a price, never on a form.",
      "A/B the Team band at $3,000 against $3,500 across twenty real quotes. Measure close rate, not preference.",
      "Launch the partner programme with Go Flat Bridge, Jani's circle and two independent HR consultants: $2,500 partner fee, $1,500 per active tenant, partner keeps consulting revenue.",
      "Publish two landing pages — \"Pay for managers, not for people\" and a straight comparison against per-seat pricing — plus two case studies from the first pilots.",
      "Ship monthly pause/resume on the entry plan, with data retained and read-only.",
    ],
    metrics: [
      ["Free → paid conversion by day 60", "≥ 4%", "Under 2%, narrow the free boundary before touching price."],
      ["Team band close rate at $3,000 vs $3,500", "Measure, do not assume", "If both close equally, take $3,500 permanently."],
      ["Active partner tenants", "2", "Zero means the partner economics need revisiting, not more recruiting."],
      ["CAC payback on self-serve", "< 3 months", "Above 6 months, the free tier is leaking value."],
    ],
    gate: "Gate 2 — at least 4% free-to-paid, two partner tenants live, and a defensible answer on $3,000 versus $3,500.",
    owner: "Emilio (pricing test and pages) · Yhan (partner recruitment) · Ebony (pilot success)",
  },
  {
    window: "Days 61–90",
    title: "Enterprise, capacity and price integrity",
    focus:
      "Prove the top of the market and make sure you can deliver it. The transcript's large-BPO shape ($25–30k plus maintenance) and the Jamaica/India delivery plan both land here.",
    experiments: [
      "Run one 1,500+ head BPO pilot with the Homebase attendance feed live — the differentiator must be shown, not described.",
      "Hire or contract the first delivery capacity at no more than 25% of new ARR, with a documented onboarding playbook.",
      "Publish permanent list prices on the website for Free, Team and Growth; keep Scale and Enterprise quote-only.",
      "Pressure-test the free tier: if it now costs more than 15% of the revenue it generates, remove one boundary item.",
      "Write the renewal playbook: per-manager framing, attendance evidence, and a QBR template for Growth and above.",
    ],
    metrics: [
      ["New ARR booked", "≥ $60,000", "This is the run-rate proof for the whole model."],
      ["Gross margin blended", "≥ 75%", "Below 70%, the small bands are subsidising the free tier."],
      ["Enterprise pilot signed", "1 at $25,000+", "The anchor price needs a real logo behind it."],
      ["Free tenants retained at day 60", "≥ 70%", "Churn this early means the free tier is not worth having."],
    ],
    gate: "Gate 3 — $60k in new ARR, gross margin at or above 75%, and one enterprise pilot signed with attendance live.",
    owner: "Emilio (enterprise and pricing) · new delivery lead · Yhan (BPO relationships)",
  },
];

const kpis = [
  ["Visitor → free signup", "4–8%", "Landing page clarity; two pages, one message each."],
  ["Free signup → activated (3 managers check-in in week 1)", "≥ 40%", "Onboarding quality. This is the number that decides everything else."],
  ["Free → paid by day 60", "≥ 4%", "Boundary tightness and in-product triggers."],
  ["Team band ACV", "$3,000–$3,500", "Price test in days 31–60."],
  ["CAC payback, self-serve", "< 3 months", "Marketing efficiency; free tier does the qualifying."],
  ["CAC payback, partner-sourced", "< 1 month", "Partner does the selling; you pay per tenant."],
  ["Gross margin", "≥ 75%", "AI caps, batched digests, no human onboarding on free."],
  ["Net revenue retention at 12 months", "≥ 105%", "Band upgrades from team growth."],
];

export default function Plan306090() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="Execution">The 90-day plan</SectionHeading>
        <Lead>
          Three phases, each with a single question to answer and a gate that stops you spending money on a
          model that is not working. Every experiment is runnable by a two or three person team and every gate
          is a decision, not a review.
        </Lead>
      </div>

      {phases.map((p, idx) => (
        <div key={p.window} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <Tag tone="accent">{p.window}</Tag>
            <h3 className="text-lg font-bold tracking-tight text-foreground">{p.title}</h3>
          </div>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{p.focus}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Experiments
              </p>
              <Bullets items={p.experiments} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Metrics and targets
              </p>
              <div className="space-y-2">
                {p.metrics.map(([m, target, note], i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[13px] text-foreground">{m}</span>
                      <span className="text-[13px] font-bold tabular-nums text-foreground">{target}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[#0202ff]/25 bg-[#0202ff]/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-foreground">
              <span className="font-bold">Decision gate {idx + 1}: </span>
              {p.gate}
            </p>
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {p.owner}
            </span>
          </div>
        </div>
      ))}

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Scorecard — the eight numbers to run the business on</p>
        <DataTable
          dense
          columns={[
            { key: "k", label: "Metric", className: "w-[38%]" },
            { key: "t", label: "Target", className: "w-[18%]" },
            { key: "n", label: "What it tells you" },
          ]}
          rows={kpis.map(([k, t, n]) => ({
            k: <span className="text-[13px]">{k}</span>,
            t: <span className="text-[13px] font-semibold tabular-nums">{t}</span>,
            n: <span className="text-[13px] text-muted-foreground">{n}</span>,
          }))}
        />
      </div>

      <Callout tone="warning" title="The one thing that would waste this quarter">
        <p>
          Buying acquisition before activation is proven. If a free tenant does not reach three managers
          completing a check-in inside week one, no amount of traffic or discounting fixes it — you will simply
          buy more of the same leak. Gate 1 exists to stop exactly that.
        </p>
      </Callout>
    </div>
  );
}