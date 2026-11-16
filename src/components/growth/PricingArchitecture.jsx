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
          Three tiers, one complete manager experience. Allowances are capacity boundaries from the November
          2026 offer documents. Every number here is a proposed test term, not a published commitment.
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
              {t.promoted && <Tag tone="accent">Advertised</Tag>}
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
        <SectionHeading kicker="What the tiers actually cost">Unit economics of the lower allowances</SectionHeading>
        <div className="mb-4">
          <Lead>
            Cutting the allowances raises the price per manager. Revenue per manager falls 20% from Essentials to
            Growth, which is the ladder working — but it also means an 11-manager buyer pays 140% more for one extra
            manager unless something bridges the gap.
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

      <Callout tone="accent" title="Capacity blocks close the gap the lower numbers created">
        <Bullets
          items={[
            "An 11-manager buyer should not have to jump straight to $7,200. One +5 manager block at $1,200 keeps the deal at $4,200 and leaves Growth's analytics and automation as the real upgrade reason.",
            "The few-managers-many-participants buyer — already flagged in your offer documents — is served by +100 participant blocks at $600 rather than unused manager access.",
            "Blocks are proposed test prices derived from the tier rates, not approved terms. They should be written into the order form, not the website.",
          ]}
        />
      </Callout>

      <DataTable
        columns={[
          { key: "name", label: "Add-on" },
          { key: "price", label: "Proposed price" },
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