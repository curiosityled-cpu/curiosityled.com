import React from "react";
import { Callout, DataTable, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const models = [
  {
    model: "A. Per-seat, per module",
    how: "Charge every employee a monthly rate, stacked by module. Engagedly's model.",
    good: "Predictable expansion revenue; easy to explain per head.",
    bad: "Punishes the frontline, invites headcount audits, and makes small firms pay for people who never log in.",
    verdict: <Tag tone="danger">Reject</Tag>,
  },
  {
    model: "B. Flat by organisation band",
    how: "One annual price per size band, managers only.",
    good: "Matches your architecture, easy to quote, rewards growth without renegotiation, protects margin on large frontline populations.",
    bad: "Growth inside a band is free to the customer — you need band boundaries tight enough to matter.",
    verdict: <Tag tone="good">Recommended</Tag>,
  },
  {
    model: "C. Pick-a-pack modules",
    how: "Buy check-ins, learning, succession separately, each with its own price.",
    good: "Low entry price; customer only buys what they understand.",
    bad: "Splits the story, multiplies packaging work, and lets a customer buy the cheap pack and never see the value.",
    verdict: <Tag tone="warning">Later</Tag>,
  },
  {
    model: "D. Usage-based (per check-in or per AI insight)",
    how: "Bill on consumption: check-ins submitted, insights generated, Teams messages sent.",
    good: "Perfect cost alignment; tiny accounts pay almost nothing.",
    bad: "Unpredictable for the buyer, impossible to budget, and it punishes the exact daily habit that makes the product work.",
    verdict: <Tag tone="danger">Reject</Tag>,
  },
  {
    model: "E. Consultant / partner licence",
    how: "A partner pays a platform fee and carries Curiosity Led into the tenants they already advise.",
    good: "One relationship, many tenants; partner absorbs the consulting small accounts need.",
    bad: "Discount stack erosion, brand control, and a partner who owns the relationship can leave with it.",
    verdict: <Tag tone="good">Recommended</Tag>,
  },
  {
    model: "F. Services-led enterprise",
    how: "Fixed implementation project plus a modest recurring platform fee. Yhan's $25–30k + $300/mo shape.",
    good: "Cash up front, high touch is funded, and the buyer expects it.",
    bad: "Lumpy revenue; delivery capacity becomes the constraint, not demand.",
    verdict: <Tag tone="good">Recommended</Tag>,
  },
];

const bands = [
  {
    plan: "Free Forever — One Team",
    who: "A single manager or a small team testing the daily habit",
    seats: "1–10 managers",
    price: "$0",
    includes:
      "Morning & evening check-ins, standard measures, custom questions, one team, 90-day history, 1 AI insight per manager per day, email delivery, unlimited frontline staff links",
    trigger: "11th manager, a second team, or an export",
  },
  {
    plan: "Team",
    who: "40-person firms and single-site operations",
    seats: "11–50 managers",
    price: "$3,000/yr or $299/mo",
    includes:
      "Everything free, plus unlimited teams, full history, learning assignment, custom audiences, Teams delivery, exports and reports, monthly pause/resume",
    trigger: "SSO, succession, or multi-team analytics",
  },
  {
    plan: "Growth",
    who: "Multi-site and mid-market",
    seats: "51–150 managers",
    price: "$7,500/yr",
    includes:
      "Team plus Microsoft/Google SSO, succession module, multi-team analytics, audit log, named support contact, 2 configuration hours per quarter",
    trigger: "Partner/portfolio administration or white-label",
  },
  {
    plan: "Scale",
    who: "Large single enterprise",
    seats: "151–500 managers",
    price: "$18,000/yr",
    includes:
      "Growth plus white-label configuration, API access, custom measures library, quarterly business review, priority support",
    trigger: "Portfolio of tenants or custom integration",
  },
  {
    plan: "Enterprise / BPO",
    who: "1,500–7,000 head operations",
    seats: "500+ managers",
    price: "$35,000/yr + $20,000–30,000 implementation + $500–1,000/mo managed",
    includes:
      "Everything, plus Homebase/attendance feed, HRIS sync, Teams app embedding, onboarding programme, dedicated CSM",
    trigger: "—",
  },
  {
    plan: "Partner / Consultant",
    who: "Consultancies, PE portfolios, BPO advisors",
    seats: "Unlimited tenants",
    price: "$2,500/yr + $1,500 per active tenant",
    includes:
      "Partner Business Administrator access, tenant provisioning, shared branding, wholesale pricing on tenants they own",
    trigger: "—",
  },
];

const assumptions = [
  ["AI cost per active manager per month", "$0.25–$0.60", "2 insights/day, batched, one model tier down for free users"],
  ["Email + storage per tenant per month", "$2–$8", "Depends on frontline check-in volume"],
  ["Support minutes per tenant per month (paid)", "30–60 min", "Self-serve docs must absorb the rest"],
  ["Support minutes per tenant per month (free)", "≤10 min", "No onboarding calls on free; docs and video only"],
  ["Target gross margin", "75–80%", "Below 70% the small bands stop working"],
  ["Consulting / configuration rate", "$150–$250/hr or $2,500–$5,000 fixed", "Never bundled free into a paid band"],
  ["Delivery cost per small tenant (partner-led)", "15–20% of contract value", "Partner keeps the rest for their consulting"],
];

export default function PackagingModels() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="Commercial design">Packaging and pricing options</SectionHeading>
        <Lead>
          Six models were assessed against one question: which one lets a 40-person firm say yes this month
          without destroying the economics of a 3,000-person account? The winner is flat-by-band with a real
          free tier at the bottom and services attached at the top.
        </Lead>
      </div>

      <DataTable
        dense
        columns={[
          { key: "model", label: "Model", className: "w-[17%]" },
          { key: "how", label: "How it works", className: "w-[24%]" },
          { key: "good", label: "Strengths", className: "w-[21%]" },
          { key: "bad", label: "Weaknesses", className: "w-[27%]" },
          { key: "verdict", label: "Verdict", className: "whitespace-nowrap w-[92px]" },
        ]}
        rows={models.map((m) => ({
          model: <span className="text-[13px] font-semibold text-foreground">{m.model}</span>,
          how: <span className="text-[13px]">{m.how}</span>,
          good: <span className="text-[13px] text-muted-foreground">{m.good}</span>,
          bad: <span className="text-[13px] text-muted-foreground">{m.bad}</span>,
          verdict: m.verdict,
        }))}
      />

      <div>
        <SectionHeading kicker="Illustrative only">The recommended price architecture</SectionHeading>
        <Lead>
          These are proposed numbers, not existing Curiosity Led prices. They follow what the call already
          settled — flat by size, small accounts cheaper with consulting on top, enterprise anchored at $35k —
          with a free band underneath and a partner band alongside. Managers are the only billed unit, always.
        </Lead>
      </div>

      <DataTable
        columns={[
          { key: "plan", label: "Plan", className: "w-[17%]" },
          { key: "seats", label: "Billed seats", className: "w-[13%]" },
          { key: "price", label: "Price", className: "w-[17%]" },
          { key: "includes", label: "Included", className: "w-[38%]" },
          { key: "trigger", label: "Upgrade trigger", className: "w-[15%]" },
        ]}
        rows={bands.map((b) => ({
          plan: (
            <div>
              <span className="block text-[13px] font-bold text-foreground">{b.plan}</span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{b.who}</span>
            </div>
          ),
          seats: <span className="text-[13px]">{b.seats}</span>,
          price: <span className="text-[13px] font-semibold tabular-nums">{b.price}</span>,
          includes: <span className="text-[13px]">{b.includes}</span>,
          trigger: <span className="text-[13px] text-muted-foreground">{b.trigger}</span>,
        }))}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Callout tone="accent" title="How to quote it without discounting">
          <p>
            Lead with the per-manager figure, not the total: "$75 per manager per year at 40 managers, against
            roughly $175 per manager for the Engagedly stack your peer is running." That comparison is true,
            checkable and does not require you to cut the enterprise band.
          </p>
          <p>
            When a buyer pushes on price, move scope — seats, implementation hours, or payment terms — never the
            band. A discounted band permanently misprices every future renewal.
          </p>
        </Callout>
        <Callout tone="warning" title="Why not simply undercut Engagedly everywhere">
          <p>
            Undercutting on every deal trains buyers to treat Curiosity Led as the cheap option, and cheap is a
            direct contradiction of the credibility you need at 3,000 heads. Undercut only where the structural
            reason is real: managers instead of headcount, and free frontline seats. That is a story, not a
            discount.
          </p>
        </Callout>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Unit economics — the assumptions these prices depend on</p>
        <DataTable
          dense
          columns={[
            { key: "k", label: "Driver", className: "w-[38%]" },
            { key: "v", label: "Assumption", className: "w-[24%]" },
            { key: "n", label: "Note" },
          ]}
          rows={assumptions.map(([k, v, n]) => ({
            k: <span className="text-[13px]">{k}</span>,
            v: <span className="text-[13px] font-semibold tabular-nums">{v}</span>,
            n: <span className="text-[13px] text-muted-foreground">{n}</span>,
          }))}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Guardrails that keep the bands profitable</p>
          <Bullets
            className="mt-2"
            items={[
              "Cap AI insights per manager per day on every tier. Insight volume is the only cost that scales with engagement.",
              "Batch daily digests instead of real-time generation per check-in.",
              "No human onboarding on the free tier — recorded walkthroughs and a help centre only.",
              "Never sell a paid band below $2,000/year; below that the support minutes exceed the margin.",
              "Price implementation separately, always, even when the buyer asks for one number.",
              "Onboard no more than ten small tenants per delivery person; hire ahead of the eleventh.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What the numbers say about the 40-person deal</p>
          <Bullets
            className="mt-2"
            items={[
              "Cost to serve a 20-manager Team tenant, at the assumptions above: roughly $15–25/month.",
              "At $3,000/year that is a gross margin above 90% before support — the constraint is demand, not delivery.",
              "The same tenant at $5,000/year does not solve anything if the buyer's ceiling is $3,000 (Yhan: 'two to three grand').",
              "So $3,000 with a tight free tier beats $5,000 with a generous one, because volume is what builds the reference base.",
              "Three Team tenants equal roughly one 100-manager Growth tenant in revenue but cost far less to acquire and serve.",
            ]}
          />
        </div>
      </div>
    </div>
  );
}