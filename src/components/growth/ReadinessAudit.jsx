import React from "react";
import { SectionHeading, Lead, Callout, Stat, DataTable, Tag, Bullets } from "./briefUi";
import { CLAIMS, ENTITLEMENTS } from "./pricingBriefData";

const STATE_TONE = {
  Unsubstantiated: "danger",
  "Needs qualification": "warning",
  Unsupported: "danger",
  Unverified: "warning",
  "Demo only": "warning",
  Proposed: "accent",
  "Must stay unpublished": "danger",
};

export default function ReadinessAudit() {
  const counts = ENTITLEMENTS.reduce(
    (acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }),
    {}
  );

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading kicker="Read-only audit — 16 November 2026">Product readiness and claim evidence</SectionHeading>
        <Lead>
          This is what the code actually supports, not what the packaging documents propose. One Base44 project owns
          both the public site and the authenticated application, so every route below was inspected in place. No
          production data, permissions, billing or copy was changed to produce it.
        </Lead>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entities" value="163" sub="Row-level security on the tenant-scoped set" />
        <Stat label="Backend functions" value="559" sub="Including 10 PDF report exporters" />
        <Stat label="Workflows" value="44" sub="Scheduled and entity-triggered automation" />
        <Stat label="Explicit routes" value="87" sub="Plus the legacy pages-config loop" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ready capabilities" value={counts.Ready || 0} sub="Traceable end to end in code" />
        <Stat label="Partial" value={counts.Partial || 0} sub="Exists, but no defined boundary to sell on" />
        <Stat label="Absent" value={counts.Absent || 0} sub="Plan, allowance, metering and pricing page" />
        <Stat label="Connectors live" value="3" sub="HubSpot, Outlook, Google Calendar; Teams via bot" />
      </div>

      <Callout tone="danger" title="The single blocker: there is no plan infrastructure">
        <Bullets
          items={[
            "Zero of 163 entities carry a package, tier, allowance or entitlement field. The Client record holds a billing status, licence count and annual contract value, all entered by hand.",
            "No payments code runs in the app and no plan gate exists in any manager flow — a published tier would be a promise with no technical boundary behind it.",
            "Manager and participant allowances cannot currently be counted: managers are role-based users, participants are roster or check-in identities, and nothing reconciles the two.",
            "There is no Atreus token or credit metering, so AI cost per active manager is unknown and no usage allowance can be published honestly.",
          ]}
        />
      </Callout>

      <div>
        <SectionHeading kicker="What is genuinely strong">Capabilities that can carry the offer today</SectionHeading>
        <div className="mb-4">
          <Lead>
            The manager loop is complete and the reporting surface is unusually deep for a product at this stage. The
            offer should lean on these, because they are the parts that survive scrutiny.
          </Lead>
        </div>
        <Bullets
          items={[
            "Manager loop: leadership assessment, insight, priorities, development, check-ins, goals, 1:1s, reviews and calibration are all wired to real entities and functions.",
            "Visibility: organizational analytics, historical trends, team rollups and ten PDF exporters already exist behind role-scoped access.",
            "Isolation: row-level security across the tenant-scoped entities, with 37 entities referencing the Analyst role and 23 scoping managers by subordinate email.",
            "Participation without a seat: the token-gated web check-in and Teams card routing let frontline staff contribute without a manager account — the commercial basis for separating managers from participants.",
            "Provisioning: CSV batch import, validation and apply paths already exist, which is what makes a $750 standard implementation deliverable in five hours.",
          ]}
        />
      </div>

      <div>
        <SectionHeading kicker="Claim ledger">Every commercial promise checked against the code</SectionHeading>
        <div className="mb-4">
          <Lead>
            Two claims are P0: they would be read as proof of impact the product does not measure. Neither appears in
            the proposed offer documents — they are legacy site copy.
          </Lead>
        </div>
        <DataTable
          columns={[
            { key: "claim", label: "Claim" },
            { key: "where", label: "Location" },
            { key: "state", label: "State" },
            { key: "risk", label: "Risk" },
            { key: "fix", label: "Accurate replacement" },
          ]}
          rows={CLAIMS.map((c) => ({ ...c, state: <Tag tone={STATE_TONE[c.state] || "default"}>{c.state}</Tag> }))}
          dense
        />
      </div>

      <Callout tone="warning" title="Access boundaries still to validate before any tier claims scale">
        <Bullets
          items={[
            "Analyst is read-only in principle across 37 entities, but no single enforcement point was traced — worth one scripted test per export path.",
            "Team Leader scoping relies on subordinate email lists, which will not hold if a manager is reassigned mid-cycle.",
            "Multi-unit hierarchy exists structurally (OrgPosition, OrgRole) but multi-unit rollup reporting was not demonstrated, so Organization's headline promise stays unverified.",
            "The 360 flow has a component but no traced multi-rater cycle, so it should not be a named differentiator until it is exercised end to end.",
          ]}
        />
      </Callout>
    </div>
  );
}