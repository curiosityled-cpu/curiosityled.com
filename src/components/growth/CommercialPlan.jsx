import React from "react";
import { SectionHeading, Lead, Callout, DataTable, Tag, Bullets } from "./briefUi";
import { GATES, TASKS, DECISION_RULES } from "./pricingBriefData";

const GATE_TONE = { Done: "good", Partial: "warning", "Not started": "warning", Blocked: "danger" };

export default function CommercialPlan() {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeading kicker="How we proceed">The detailed plan</SectionHeading>
        <Lead>
          Four sprints, in this order. The sequence is deliberate: sell before you publish, count before you enforce,
          enforce before you promise. Every sprint has a single exit condition, so nothing waits on a decision that has
          not been made.
        </Lead>
      </div>

      <Callout tone="accent" title="The one rule for the next 90 days">
        <p>
          Every package is sold from an order form and provisioned by hand. The site publishes one minimum and three
          bundles, never a price per package, and never a capability the server cannot switch off.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="Where each gate stands">Validation gates</SectionHeading>
        <DataTable
          columns={[
            { key: "gate", label: "Gate" },
            { key: "status", label: "Status" },
            { key: "note", label: "What the audit found" },
          ]}
          rows={GATES.map((g) => ({ ...g, status: <Tag tone={GATE_TONE[g.status] || "default"}>{g.status}</Tag> }))}
          dense
        />
      </div>

      <div className="space-y-6">
        {TASKS.map((sprint) => (
          <div key={sprint.sprint}>
            <SectionHeading>{sprint.sprint}</SectionHeading>
            <DataTable
              columns={[
                { key: "id", label: "#", className: "w-12" },
                { key: "task", label: "Task" },
                { key: "done", label: "Done when" },
                { key: "owner", label: "Owner", className: "w-32" },
              ]}
              rows={sprint.items}
              dense
            />
          </div>
        ))}
      </div>

      <Callout tone="accent" title="The first commercial test — one offer, ten conversations">
        <Bullets
          items={[
            "Segment: BPO and service businesses with 3–10 managers, multiple teams or client accounts, and a named internal owner.",
            "Same offer, same $5,000 minimum and the same scoped implementation, no discounts and no exceptions. A tenth deal won by discounting destroys the test.",
            "Growth is quoted when the prospect needs reviews, 360 or the full Development Manager; Organization when they need the talent bench.",
            "Qualify out loud: no process owner, needs bespoke integration first, or wants monitoring rather than development — those are not losses.",
            "Success is what happens after week two — manager returns, insights opened, conversations recorded, reports reviewed — not check-in completion.",
          ]}
        />
      </Callout>

      <div>
        <SectionHeading kicker="Day 90">Decision rules, agreed before the data arrives</SectionHeading>
        <div className="mb-4">
          <Lead>
            Writing these down now prevents renegotiating the conclusion later. Each signal maps to exactly one change.
          </Lead>
        </div>
        <DataTable
          columns={[
            { key: "signal", label: "If we see" },
            { key: "read", label: "Then we" },
          ]}
          rows={DECISION_RULES}
        />
      </div>

      <Callout tone="warning" title="Three things only you can decide">
        <Bullets
          items={[
            "Approve the two P0 claim corrections — they are the only change I would make to the public site this week.",
            "Approve the three bundles and the $5,000 minimum. It is the only number the site publishes, so it has to be the one the order form defends.",
            "Nominate the ten prospects and the segment, since the test only means something if it is one reachable group.",
          ]}
        />
      </Callout>
    </div>
  );
}