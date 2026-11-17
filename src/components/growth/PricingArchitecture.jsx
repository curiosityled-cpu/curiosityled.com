import React from "react";
import { Card } from "@/components/ui/card";
import { SectionHeading, Lead, Callout, DataTable, Tag, Bullets } from "./briefUi";
import { TIERS, UNIT_ECONOMICS, ADDONS, ENTITLEMENTS } from "./pricingBriefData";

const STATUS_TONE = {
  Ready: "good",
  Partial: "warning",
  Absent: "danger",
  Proposed: "accent",
  Unverified: "warning",
};

export default function PricingArchitecture() {
  const rows = ENTITLEMENTS.map((e) => ({
    capability: e.capability,
    essentials: e.essentials,
    growth: e.growth,
    org: e.org,
    status: <Tag tone={STATUS_TONE[e.status] || "default"}>{e.status}</Tag>,
  }));

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading kicker="Regenerated 16 November 2026">Pricing architecture</SectionHeading>
        <Lead>
          Three bundles on one platform and exactly one published number: a $5,000-a-year minimum. Packages no longer
          carry a price — coverage is the upgrade axis — so this tab tracks what each bundle promises rather than what
          it costs.
        </Lead>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t) => (
          <Card
            key={t.name}
            className={`p-5 ${t.promoted ? "border-[#0202ff]/35 ring-1 ring-[#0202ff]/15" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{t.name}</h3>
              {t.promoted && <Tag tone="accent">Entry bundle</Tag>}
            </div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">{t.price}</p>
            <p className="text-xs text-muted-foreground">{t.unit}</p>
            <p className="mt-3 text-[13px] font-semibold text-foreground">{t.value}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.outcome}</p>
            <div className="mt-4 space-y-1 border-t border-border pt-3 text-[13px] text-muted-foreground">
              <p>{t.managers}</p>
              <p>{t.participants}</p>
              <p>{t.teams}</p>
              <p>
                Implementation <span className="font-semibold text-foreground">{t.implementation}</span>
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <SectionHeading kicker="Where the floor sits">Floor economics, not a rate card</SectionHeading>
        <div className="mb-4">
          <Lead>
            With no package price, the only arithmetic worth tracking is what the minimum implies at its floor — and
            what it protects you from, which is anchoring every deal to a list number.
          </Lead>
        </div>
        <DataTable
          columns={[
            { key: "metric", label: "Measure" },
            { key: "essentials", label: "Essentials" },
            { key: "growth", label: "Growth" },
            { key: "note", label: "Basis" },
          ]}
          rows={UNIT_ECONOMICS}
        />
      </div>

      <Callout tone="accent" title="Why the page carries no package price">
        <Bullets
          items={[
            "A list price per package becomes the ceiling for every negotiation and invites line-by-line comparison with cheaper tools. One minimum plus a conversation keeps the offer whole.",
            "Capacity blocks and a package calculator are gone from the offer: they made the page a puzzle and turned a decision into a configurator.",
            "The bundle boundaries — Signals, reviews and 360, Talent Manager — now carry the differentiation, so the server has to switch each one off below its package before the page is announced.",
          ]}
        />
      </Callout>

      <DataTable
        columns={[
          { key: "name", label: "Commercial lever" },
          { key: "price", label: "Terms" },
          { key: "why", label: "Why it exists" },
        ]}
        rows={ADDONS}
      />

      <div>
        <SectionHeading kicker="Entitlements, not adjectives">Capability matrix with verification status</SectionHeading>
        <div className="mb-4">
          <Lead>
            Each row is traced to code in this repository. “Partial” means something real exists but its boundary is
            not defined well enough to sell on; “Absent” means the tier cannot be enforced at all yet.
          </Lead>
        </div>
        <DataTable
          columns={[
            { key: "capability", label: "Capability" },
            { key: "essentials", label: "Essentials" },
            { key: "growth", label: "Growth" },
            { key: "org", label: "Organization" },
            { key: "status", label: "Verified" },
          ]}
          rows={rows}
          dense
        />
      </div>
    </div>
  );
}