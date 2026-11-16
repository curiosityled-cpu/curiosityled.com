import React from "react";
import { SectionHeading, Lead, Callout, DataTable, Tag, Bullets } from "./briefUi";
import { GATES, TASKS, DECISION_RULES } from "./pricingBriefData";

const GATE_TONE = { Done: "good", "Not started": "warning", Blocked: "danger" };

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
          Essentials is sold from an order form and provisioned by hand until allowances can be counted. The pricing
          page goes live in week four, not this week, and it never shows a tier the product cannot enforce.
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
            "Same Essentials offer, same $3,000 + $750, no discounts and no exceptions. A tenth deal won by discounting destroys the test.",
            "Growth is quoted only when the prospect genuinely has more than 10 managers or asks for cross-team intelligence.",
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
            "Approve or change the capacity block prices ($1,200 / +5 managers, $600 / +100 participants). They are derived from your tier rates, not validated.",
            "Nominate the ten prospects and the segment, since the test only means something if it is one reachable group.",
          ]}
        />
      </Callout>
    </div>
  );
}