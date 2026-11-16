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
          Sell one package. Quote the other two. Enforce nothing you cannot count.
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">
          Your revised allowances make Essentials sharper: $3,000 a year for 10 managers and 100 participants is a
          credible entry offer for a 3–10 manager business. It also creates two problems the previous recommendation
          did not have — an 11-manager buyer now pays 140% more for one extra manager, and the product still has no way
          to know how many managers a tenant actually has. Fix both before publishing a price.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Advertised price" value="$3,000" sub="Essentials annually, plus $750 implementation" />
        <Stat label="Per manager / month" value="$25" sub="At 10 managers; $20 on Growth at 30" />
        <Stat label="Tiers enforceable today" value="0" sub="No plan, allowance or metering field exists" />
        <Stat label="P0 claims to fix" value="2" sub="“Judgment changed” and the $319B–$398B statistic" />
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

      <Callout tone="accent" title="The capacity ladder, in one line">
        <p>
          Essentials covers the buyer you can serve well today. A <strong>$1,200 / +5 manager block</strong> holds the
          11–20 manager deal at $4,200 without cannibalising Growth, and a <strong>$600 / +100 participant block</strong>{" "}
          answers the few-managers-many-staff case. Growth then sells on cross-team intelligence and automation rather
          than on permission to hire one more manager.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="Why the offer changed shape">What the documents agree on</SectionHeading>
        <Bullets
          items={[
            "The buyer is an owner, HR or operations leader with 3–10 managers across multiple teams and a named internal process owner.",
            "The core manager experience — assessment, insight, priorities, development, check-ins, goals, 1:1s, reviews, 360s and Atreus — stays in every package. Scale, intelligence, automation, integrations and delivery are what customers pay more for.",
            "The 90-Day Manager Launch is onboarding and adoption, not a promise of leadership transformation in 90 days.",
            "Annual subscription billed upfront, implementation separate, no permanent free production plan, no surprise overage billing.",
            "Frontline participation is included inside the package limits; additional participation capacity is quoted, not forced into unused manager seats.",
          ]}
        />
      </div>

      <Callout tone="danger" title="Caveats that belong in front of the buyer, not the appendix">
        <Bullets
          items={[
            "Every price, allowance, block and commitment on this page is a proposed test term. None has been validated for willingness to pay.",
            "Go Flat Bridge proves the workflow runs, not that retention, productivity or manager effectiveness improved. It should be described as a documented implementation, not an outcome case study.",
            "The 15-business-day launch assurance needs operational and contractual review before it appears anywhere customers can read it.",
            "Nothing here authorises publishing a pricing page. Gate 5 stays closed until the two P0 claims are corrected and the diagnostic duration is measured.",
          ]}
        />
      </Callout>
    </div>
  );
}