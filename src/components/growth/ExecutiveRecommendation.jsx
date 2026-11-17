import React from "react";
import { SectionHeading, Lead, Callout, Stat, Tag, Bullets } from "./briefUi";
import { DECISIONS } from "./pricingBriefData";

export default function ExecutiveRecommendation() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#0202ff]/25 bg-[#0202ff]/5 p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0202ff] dark:text-blue-300">
          Regenerated recommendation • 16 November 2026
        </p>
        <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
          Sell coverage. Publish one minimum. Enforce what the page promises.
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          The offer is now one platform in three bundles with a single published number — $5,000 a year, varying by user
          count, organization size and corporate structure. No package carries a price, and nothing is sold as a
          configurator. That moves the open work off the page and onto the product: Signals, reviews/360 and the talent
          bench each need a switch the server respects before the bundles mean anything.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Published minimum" value="$5,000" sub="Annually; packages quoted above it" />
        <Stat label="Package prices shown" value="0" sub="All three bundles route to a conversation" />
        <Stat label="Module gates built" value="0 of 3" sub="Signals, reviews/360 and Talent Manager are not gated yet" />
        <Stat label="P0 claims open" value="0" sub="Claim corrected and statistic sourced" />
      </div>

      <div>
        <SectionHeading kicker="Five decisions">What I would do differently from the last brief</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          {DECISIONS.map((d) => (
            <div key={d.title} className="rounded-xl border border-border bg-card p-5">
              <Tag tone="accent">{d.tag}</Tag>
              <h3 className="mt-2.5 text-[15px] font-bold text-foreground">{d.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Callout tone="accent" title="The bundle ladder, in one line">
        <p>
          Essentials covers the buyer you can serve well today — the manager loop without Signals, reviews or a talent
          bench. <strong>Growth</strong> adds the full Performance and Development Managers, and{" "}
          <strong>Organization</strong> adds the Talent Manager. Nobody upgrades for permission to hire one more manager;
          they upgrade for coverage.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="Why the offer changed shape">What the documents agree on</SectionHeading>
        <Bullets
          items={[
            "The buyer is an owner, HR or operations leader with 3–10 managers across multiple teams and a named internal process owner.",
            "The manager experience — Atreus, Lead, Team, Practice, Leadership Intelligence, check-ins and goals/KPIs/OKRs — stays in every package. Reviews, 360, Signals and the talent bench are what customers move up for.",
            "The 90-Day Manager Launch is onboarding and adoption, not a promise of leadership transformation in 90 days.",
            "Annual subscription billed upfront, implementation scoped per deployment, no permanent free production plan, no surprise overage billing.",
            "Frontline participation is counted inside the quoted population; additional capacity is handled in the quote, never as an on-page block.",
          ]}
        />
      </div>

      <Callout tone="danger" title="Caveats that belong in front of the buyer, not the appendix">
        <Bullets
          items={[
            "The minimum, the bundle boundaries and every commitment on this page are proposed test terms. None has been validated for willingness to pay.",
            "Go Flat Bridge proves the workflow runs, not that retention, productivity or manager effectiveness improved. It should be described as a documented implementation, not an outcome case study.",
            "The 15-business-day launch assurance needs operational and contractual review before it appears anywhere customers can read it.",
            "The page is live. What is not live is the enforcement behind its bundles: Signals, reviews/360 and Talent Manager must be gated server-side, and 360 exercised end to end, before the Growth card is announced.",
          ]}
        />
      </Callout>
    </div>
  );
}