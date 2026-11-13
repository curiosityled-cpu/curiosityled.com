import React from "react";
import { Callout, DataTable, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const matrix = [
  {
    cap: "Managers / seats",
    free: "Up to 10",
    paid: "11 to 500+",
    why: "A real manager has 6–10 reports, so ten seats covers a genuine first team and a first director.",
    trigger: "11th manager invited",
  },
  {
    cap: "Teams / departments",
    free: "1",
    paid: "Unlimited",
    why: "The second team is the moment a customer has something worth rolling up.",
    trigger: "Creating a second team",
  },
  {
    cap: "Daily check-ins",
    free: "Morning & evening, standard measures + custom questions",
    paid: "Same",
    why: "Do not handicap the habit. The habit is the product.",
    trigger: "—",
  },
  {
    cap: "Frontline staff links",
    free: "Unlimited",
    paid: "Unlimited",
    why: "They never log in and never consume a seat. This is the unfair advantage — give it away loudly.",
    trigger: "—",
  },
  {
    cap: "Atreus insights",
    free: "1 per manager per day",
    paid: "Unlimited / on demand",
    why: "The only cost that scales with engagement, so it is the cleanest thing to cap.",
    trigger: "Requesting a second insight in a day",
  },
  {
    cap: "History",
    free: "90 days",
    paid: "Full history",
    why: "Short enough to bound storage, long enough to prove a trend inside one quarter.",
    trigger: "Opening a report older than 90 days, or exporting",
  },
  {
    cap: "Learning & content",
    free: "Consume assigned content only",
    paid: "Author, upload and assign your own content",
    why: "Yhan's own client training is a paid reason. Authoring is where the value compounds.",
    trigger: "Uploading a course or assigning learning",
  },
  {
    cap: "SSO & security",
    free: "Email + Google",
    paid: "Microsoft Entra ID, SSO, audit log",
    why: "SSO is a procurement requirement, never a free feature.",
    trigger: "Attempting SSO configuration",
  },
  {
    cap: "Succession, analytics, reports",
    free: "Basic team view",
    paid: "Full analytics, exports, succession",
    why: "Reporting and succession are the two capabilities buyers budget for separately.",
    trigger: "Opening analytics, exporting, or enabling succession",
  },
  {
    cap: "Support",
    free: "Help centre + recorded walkthroughs",
    paid: "Named contact, priority support, QBR (Growth and above)",
    why: "Human minutes are the fastest way to make free unprofitable.",
    trigger: "—",
  },
];

const instruments = [
  {
    name: "Free Forever",
    shape: "Scope-capped",
    detail:
      "One team, ten managers, standard check-ins, one insight per day, 90-day history. No end date, no card, no sales call. The customer's data lives here for as long as they want.",
    why: "The mechanic Yhan described from Breezy and Homebase: a working product that keeps the data, so the eventual purchase is an upgrade rather than a migration. Their current published terms have moved — Homebase's free plan is bounded to one location and ten employees, and Breezy publishes no free plan at all, only a no-card trial — so cite this as his experience, not as their present offer.",
  },
  {
    name: "Full Access, 30 days",
    shape: "Time-capped",
    detail:
      "Everything switched on for a calendar month — learning authoring, analytics, SSO, succession — no card required. At day 30 the account reverts to Free Forever with all data intact and paid features read-only.",
    why: "Covers Emilio's 'access to everything for a limited time' idea without the risk of an empty free tier. The revert path is what makes it safe.",
  },
];

const allowed = [
  "Free forever for one team of up to ten managers.",
  "Your frontline completes daily check-ins free, forever — they never need a licence.",
  "Start today, no card, no demo call.",
  "Everything you build on the free plan is yours to keep, and it all survives an upgrade.",
  "Thirty days of the whole platform, then stay on the free plan with your data intact if you are not ready.",
];

const banned = [
  "\"Free trial\" on its own — it implies an expiry the free plan does not have.",
  "\"Unlimited free\" or \"free forever\" with no qualifier — both become untrue the moment you cap anything.",
  "\"No credit card required\" as the headline — table stakes, not a benefit.",
  "\"Free for your whole company\" — untrue above ten managers and it invites disputes.",
  "Any countdown or artificial scarcity on the free offer.",
];

export default function FreeEntryStrategy() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="Free as a channel, not a discount">Bringing FREE into the marketing</SectionHeading>
        <Lead>
          Engagedly's own pricing page has no free door: every path on it ends in "Book a Demo", and a trial
          appears only inside a partner marketplace. That is the opening. But free only works if the boundary is
          deliberate, published and cheap to serve — so the strategy below is as much about what is excluded as
          what is given away.
        </Lead>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {instruments.map((i) => (
          <div key={i.name} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-foreground">{i.name}</h3>
              <Tag tone="accent">{i.shape}</Tag>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{i.detail}</p>
            <p className="mt-2 border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
              {i.why}
            </p>
          </div>
        ))}
      </div>

      <Callout tone="danger" title="Prerequisite: this is not a plan for open signup">
        <p>
          Everything on this tab describes an offer, not a switch. Before a stranger can create an account
          unaided, tenant separation has to be demonstrated and check-ins have to be reliable in production.
          Until then the free plan runs as an invite-only cohort with assisted onboarding — the conditions and
          measurements are in the Validation cohort tab.
        </p>
        <p>
          A free plan built on an unverified foundation does not fail quietly. It fails in front of the buyers
          this brief is trying to win.
        </p>
      </Callout>

      <Callout tone="warning" title="Keep these two apart">
        <p>
          The call merged them — "a high value free version… or access to everything for a limited time" — and
          they must never be merged in public. One is called a free plan and has no end date. The other is
          called thirty days of full access and does. Mixing them produces the worst of both: a customer who
          expects everything forever and a sales team with nothing left to sell.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="The boundary table">Exactly where free stops</SectionHeading>
        <Lead>
          Publish this as a table on the pricing page. A boundary a buyer can read is a boundary nobody argues
          about later, and every row is also an in-product upgrade trigger.
        </Lead>
      </div>

      <DataTable
        dense
        columns={[
          { key: "cap", label: "Capability", className: "w-[16%]" },
          { key: "free", label: "Free Forever", className: "w-[24%]" },
          { key: "paid", label: "Paid bands", className: "w-[18%]" },
          { key: "why", label: "Why the line sits here", className: "w-[28%]" },
          { key: "trigger", label: "Trigger", className: "w-[14%]" },
        ]}
        rows={matrix.map((m) => ({
          cap: <span className="text-[13px] font-semibold text-foreground">{m.cap}</span>,
          free: <span className="text-[13px]">{m.free}</span>,
          paid: <span className="text-[13px] text-muted-foreground">{m.paid}</span>,
          why: <span className="text-[13px] text-muted-foreground">{m.why}</span>,
          trigger: <span className="text-[13px] font-medium">{m.trigger}</span>,
        }))}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Say it like this</p>
          <Bullets className="mt-2" items={allowed} />
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Never say this</p>
          <Bullets className="mt-2" items={banned} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Conversion triggers, built into the product</p>
          <Bullets
            className="mt-2"
            items={[
              "11th manager invited — show the Team band with the per-manager comparison, not a wall.",
              "Second team created — offer a 14-day Team trial rather than blocking the action.",
              "Learning authoring or assignment attempted — show what the band unlocks and let them finish the task.",
              "Analytics opened or export requested — one click to Team, with the report previewed behind it.",
              "SSO configuration started — route to a conversation, because that buyer is already committed.",
              "Second insight requested in a day — the cheapest possible moment to ask, and the clearest value proof.",
              "Day 25 of the full-access month — a human note from Emilio, not an automated drip.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Cost controls that make free safe</p>
          <Bullets
            className="mt-2"
            items={[
              "One AI insight per manager per day, generated in a single batched run.",
              "90-day history window, so storage and query load stay bounded.",
              "No human onboarding, ever, on the free tier — recorded walkthroughs only.",
              "Email digest batching instead of per-check-in notifications.",
              "A hard monthly AI ceiling per tenant, with graceful degradation rather than a broken experience.",
              "Review cost per free tenant at day 30 and day 90; if it exceeds ~$1.50 per manager per month, tighten the boundary.",
            ]}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">What the free signup must ask for</p>
        <DataTable
          dense
          columns={[
            { key: "field", label: "Field", className: "w-[26%]" },
            { key: "why", label: "Why it is worth a field on a free form" },
          ]}
          rows={[
            { field: "Work email", why: "Qualifies the buyer and is the only reliable identifier across upgrades." },
            { field: "Company and sector", why: "Feeds the sector benchmarking and research agent described on the call." },
            { field: "Headcount band (under 50 / 50–250 / 250–1,000 / 1,000+)", why: "Sets the band conversation before a human ever speaks, and gives you a segment view of demand." },
            { field: "Number of managers and frontline staff", why: "The two numbers your whole price architecture depends on." },
            { field: "Country / region", why: "Caribbean, US and UK price sensitivity differ materially, as the call made clear." },
            { field: "What they want to fix this quarter", why: "One sentence that lets the day-25 human note be specific instead of generic." },
          ]}
        />
      </div>

      <Callout tone="accent" title="The marketing line to lead with">
        <p>
          <strong>"Pay for managers, not for people."</strong> One sentence, structurally true, and impossible
          for a per-seat competitor to copy without rewriting their pricing. Frontline check-ins are free and
          unlimited; you are charged for the people who actually log in and run the team. Everything else in
          the free offer is a variation on that idea.
        </p>
      </Callout>
    </div>
  );
}