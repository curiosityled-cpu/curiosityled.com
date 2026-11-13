import React from "react";
import { Callout, Stat, DataTable, Bullets, SectionHeading, Lead } from "./briefUi";

const decisions = [
  {
    n: "01",
    title: "Publish a free plan with hard, visible boundaries",
    body: "One team, up to 10 manager seats, standard morning/evening check-ins, one AI insight per manager per day, 90-day history. Free forever, not a trial. Publish the boundary table on the pricing page so nobody has to talk to you to understand it.",
    why: "Engagedly's own site publishes no free plan and no signup \u2014 its pricing page ends at a demo request, though a partner marketplace carries a trial signal. Homebase currently runs a free plan bounded to one location and ten employees, and Breezy currently publishes no free plan at all, only a no-card 14-day trial, so Yhan's free-use history dates from packaging that may since have changed. Re-confirm with him before citing it.",
  },
  {
    n: "02",
    title: "Price flat by organisation band, never per seat",
    body: "Illustrative annual bands: $3,000 (11–50 managers), $7,500 (51–150), $18,000 (151–500), $35,000+ (500+), plus paid implementation. Frontline staff never count toward a band because they never log in.",
    why: "Engagedly publishes a $7,500 annual minimum, so Yhan's reported ~$7,000 at 40 people is roughly the floor rather than a per-seat result, at about $175 per person per year. $3,000 is less than half that floor, which is a cleaner story than any discount off a list rate.",
  },
  {
    n: "03",
    title: "Lead with what Engagedly cannot claim: operational truth",
    body: "Attendance and Homebase data, daily check-ins against real work, and a manager-first screen. Sell one outcome — 'I can see how my team is actually doing this week' — not a module count.",
    why: "Yhan's own verdict at 01:05:59: Engagedly reviews are subjective year-end questions and it does not track attendance. Their pricing page confirms no operational data layer.",
  },
  {
    n: "04",
    title: "Add the Breezy move: pause and resume",
    body: "On the monthly entry plan, a customer can pause when they are not running a cycle. Their data is retained and read-only; resume costs the same monthly amount. The annual band stays the default.",
    why: "Breezy reverted Yhan to the free starter pack when he stopped paying — and kept him. Pausing protects the relationship instead of forcing a cancel and a re-sale.",
  },
  {
    n: "05",
    title: "Build the channel before the ad budget",
    body: "Go Flat Bridge, Jani's BPO circle and independent HR consultants each carry the free tier into tenants they already advise. Use the Partner Business Administrator role that already exists. Pay wholesale per tenant or a referral percentage, not a reseller discount stack.",
    why: "Small organisations need more consulting, not less (01:00:03). A partner can deliver that consulting at their cost, which is what keeps your per-tenant delivery affordable.",
  },
];

const dos = [
  "Quote a per-manager annual figure next to every proposal — $75/manager/year at 40 managers beats any feature matrix.",
  "Keep the free tier genuinely useful for a real manager with 6–10 reports, then charge for a second team.",
  "Publish list prices annually and stop quoting custom every time; you lose credibility and speed.",
  "Put implementation and configuration on a separate line item so platform price stays clean.",
  "Sell the frontline seat as free and unlimited — it is a structural advantage, not a discount.",
];

const donts = [
  "Do not discount the enterprise band to win logos; use implementation scope as the negotiable lever instead.",
  "Do not name a price per employee; it invites headcount audits and punishes the exact buyers you want.",
  "Do not call the free plan a trial anywhere, in any asset, ever.",
  "Do not compete on module breadth — Engagedly ships eight suites and six Brandon Hall awards.",
  "Do not add free onboarding calls for the free tier; it is the fastest way to make free unprofitable.",
];

export default function ExecutiveRecommendation() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0202ff] dark:text-blue-300">
          The recommendation in one line
        </p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-foreground">
          Sell the manager, not the seat — and let the frontline in free.
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          Curiosity Led already has an unusual structural advantage that the call uncovered: frontline
          staff complete a check-in from a link and never log in, so they never occupy a paid seat.
          Engagedly charges $2–5 per head per month for that population. Price on managers, give the
          frontline away, and the 40-person Caribbean firm that pays Engagedly ~$7,000 becomes a
          $3,000 customer instead of a lost deal at $35,000.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Engagedly, 40 people" value="~$7,000/yr" sub="Customer-reported. Their published minimum is $7,500, so this is in line with the floor, not a list rate." />
        <Stat label="Curiosity Led, 40 managers" value="$3,000/yr" sub="Illustrative Team band — roughly half the Engagedly bill at the same headcount." />
        <Stat label="2,000 frontline staff" value="$0" sub="They get a link, not a login. Engagedly's deskless add-on would be ~$120,000/yr at $5/head." />
        <Stat label="Free tier ceiling" value="10 managers" sub="One team, standard check-ins, one AI insight per manager per day." />
      </div>

      <div>
        <SectionHeading kicker="Five decisions">What to actually do</SectionHeading>
        <div className="grid gap-3 lg:grid-cols-2">
          {decisions.map((d) => (
            <div key={d.n} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-baseline gap-2.5">
                <span className="text-xs font-extrabold tabular-nums text-[#0202ff] dark:text-blue-300">
                  {d.n}
                </span>
                <h3 className="text-base font-bold tracking-tight text-foreground">{d.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{d.body}</p>
              <p className="mt-2 border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-bold uppercase tracking-wide">Evidence: </span>
                {d.why}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Do this</p>
          <Bullets className="mt-2" items={dos} />
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Not this</p>
          <Bullets className="mt-2" items={donts} />
        </div>
      </div>

      <Callout tone="warning" title="Read this before you change a public price">
        <p>
          Every dollar figure in this brief except the Engagedly numbers is <strong>illustrative</strong>.
          Engagedly figures come from their public pricing page and from what Yhan reported on the call.
          Nothing here is a Curiosity Led list price until you decide it is, and the first two decisions in
          the 90-day plan exist to test these numbers before they go on the website.
        </p>
        <p>
          The free plan should not open to the public first. Run the gated cohort described in the Validation
          cohort tab \u2014 tenant separation demonstrated, check-ins reliable, onboarding hours measured \u2014
          and let the ten-manager boundary be tested on real accounts before anyone can sign up unaided.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="The honest risk">What could make this wrong</SectionHeading>
        <Lead>
          Free tiers fail in two ways: they attract people who will never pay, and they cost real money to
          serve. The 30-day plan therefore measures activation and cost per free tenant before any spend on
          acquisition. If a free tenant costs more than ~$1.50 per manager per month to run, the boundaries
          in this brief are already too generous.
        </Lead>
      </div>
    </div>
  );
}