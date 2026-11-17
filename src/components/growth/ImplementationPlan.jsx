import React from "react";
import { SectionHeading, Lead, Callout, Stat, DataTable, Tag, Bullets } from "./briefUi";
import {
  EFFORT_BASIS,
  SEQUENCE,
  MILESTONES,
  WORKSTREAMS,
  GATES_BEFORE_PRICING,
  RISKS,
  DEFERRED,
  DECISIONS,
} from "./implementationPlanData";

const STATE_TONE = { Shipped: "good", "In progress": "warning", "Not started": "default" };

function Workstream({ ws }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <h3 className="text-base font-bold tracking-tight text-foreground">
          {ws.id} · {ws.name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {ws.state && <Tag tone={STATE_TONE[ws.state] || "default"}>{ws.state}</Tag>}
          <Tag tone="default">{ws.order}</Tag>
          <Tag tone="accent">{ws.effort}</Tag>
          <Tag tone={ws.depends === "Nothing" || ws.depends === "None" ? "good" : "warning"}>
            Depends on {ws.depends}
          </Tag>
        </div>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{ws.why}</p>
      <DataTable
        columns={[
          { key: "id", label: "#", className: "w-12" },
          { key: "task", label: "What gets built" },
          { key: "done", label: "Done when" },
          { key: "touch", label: "Where", className: "w-44" },
        ]}
        rows={ws.tasks}
        dense
      />
    </div>
  );
}

export default function ImplementationPlan() {
  const totalDays = WORKSTREAMS.reduce((sum, ws) => sum + parseInt(ws.effort, 10), 0);

  return (
    <div className="space-y-9">
      <div>
        <SectionHeading kicker="Sequenced build plan — 16 November 2026">
          From recommendation to enforceable product
        </SectionHeading>
        <Lead>
          Every recommendation in this brief and in the attached offer documents, turned into ordered work with a
          single acceptance test each. The order is not negotiable: a claim fixed after a deal is signed cannot be
          un-signed, and a price published before an allowance can be counted becomes a promise the product cannot keep.
        </Lead>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Workstreams" value={EFFORT_BASIS.workstreams} sub="Three run in parallel" />
        <Stat label="Builder-days" value={totalDays} sub="One developer, full time" />
        <Stat label="Sequence gates" value={EFFORT_BASIS.milestones} sub="Each one unlocks the next" />
        <Stat label="Growth quotable" value="After G" sub="Essentials page never waits on it" />
      </div>

      <Callout tone="accent" title="How to read the effort figures">
        <p>{EFFORT_BASIS.parallel}</p>
        <p>
          Days are build effort, not elapsed time: the founder's selling, the ten prospect conversations and the
          day-90 decision sit outside them. Nothing in A–F is research — each task names the screen or function it
          changes, so a delay shows up as a slipped milestone rather than a vague overrun.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="The rule for the next 90 days">Trust, then count, then enforce, then publish, then test</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SEQUENCE.map((s, i) => (
            <div key={s.step} className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Step {i + 1}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">{s.step}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading kicker="What has to be true, and what it unlocks">Sequence gates</SectionHeading>
        <div className="mb-4">
          <Lead>
            No dates. Each gate opens the next workstream, and nothing moves on until its own gate is met — the
            sequence protects the credibility of the offer, not the calendar.
          </Lead>
        </div>
        <DataTable
          columns={[
            { key: "id", label: "", className: "w-12" },
            { key: "gate", label: "Opens after", className: "w-32" },
            { key: "name", label: "Milestone", className: "w-52" },
            { key: "unlock", label: "Unlocked when" },
            { key: "proves", label: "What it proves", className: "w-56" },
          ]}
          rows={MILESTONES}
          dense
        />
      </div>

      <div>
        <SectionHeading kicker="Workstreams in dependency order">The detailed work</SectionHeading>
        <div className="mb-5">
          <Lead>
            A and B start together. C follows B, D follows C, F follows D. E and H run alongside, because AI cost and
            delivery hours are measurements rather than dependencies. G is what makes Growth quotable — it never holds
            up the Essentials page.
          </Lead>
        </div>
        <div className="space-y-8">
          {WORKSTREAMS.map((ws) => (
            <Workstream key={ws.id} ws={ws} />
          ))}
        </div>
      </div>

      <Callout tone="danger" title="The checklist that gates the pricing page">
        <Bullets items={GATES_BEFORE_PRICING} />
        <p className="pt-1">
          All seven, not six. The page can wait a week; a price that outruns the product cannot be walked back once a
          prospect has compared it with the order form.
        </p>
      </Callout>

      <div>
        <SectionHeading kicker="What could go wrong">Risks and the mitigation already in the plan</SectionHeading>
        <DataTable
          columns={[
            { key: "risk", label: "Risk" },
            { key: "mitigates", label: "How the sequence absorbs it" },
          ]}
          rows={RISKS}
        />
      </div>

      <div>
        <SectionHeading kicker="Deliberately not in this quarter">Deferred, with the reason</SectionHeading>
        <div className="mb-4">
          <Lead>
            Deferring these is a decision, not an omission. Each one is either unmeasured, unproven, or better served
            by doing it by hand for the first few customers.
          </Lead>
        </div>
        <Bullets items={DEFERRED} />
      </div>

      <Callout tone="warning" title="Four decisions that gate the start">
        <div className="space-y-3">
          {DECISIONS.map((d) => (
            <div key={d.decision}>
              <p className="text-sm font-semibold text-foreground">{d.decision}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{d.why}</p>
            </div>
          ))}
        </div>
      </Callout>
    </div>
  );
}