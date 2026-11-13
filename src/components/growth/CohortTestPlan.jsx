import React from "react";
import { Callout, DataTable, Stat, SectionHeading, Lead, Bullets, Tag } from "./briefUi";

const gates = [
  {
    gate: "Tenant data separation, demonstrated",
    why: "A free or low-cost signup multiplies the number of organisations holding data in one place. If one customer can reach another's records, no price makes that acceptable.",
    met: "A repeatable cross-tenant read test that fails closed \u2014 not a written explanation of the rules.",
    state: "Open",
  },
  {
    gate: "Check-in save is reliable end to end",
    why: "The daily check-in is the habit the product depends on. A manager who loses one evening check-in stops trusting the whole trend, and support cannot repair that.",
    met: "A week of real check-ins across two tenants with no lost or duplicated records.",
    state: "Open",
  },
  {
    gate: "Onboarding fits a measured budget",
    why: "The price only works if setup is repeatable. If each account needs two calls and an hour of engineering, the ten-manager free plan is consulting sold at zero.",
    met: "Three accounts onboarded by someone who did not build the product, with hours logged.",
    state: "Open",
  },
  {
    gate: "Support load is measured, not assumed",
    why: "Free tenants compete for the same human minutes as paying ones. The constraint is not the AI bill.",
    met: "Support minutes per account per week, recorded from the first cohort member.",
    state: "Open",
  },
  {
    gate: "Product claims are separated from call claims",
    why: "Defects and roadmap items raised on the implementation call are not evidence until reproduced. A launch gate built on an unverified defect either blocks something that works or ships something that does not.",
    met: "Each reported issue logged as reproduced, not reproduced, or not tested.",
    state: "Open",
  },
];

const design = [
  ["Cohort size", "6\u201310 organisations", "Enough to see a repeated pattern in usability; nowhere near enough to estimate a conversion rate."],
  ["Segment", "Small firms, 10\u201350 managers, one or two locations", "The segment the flat-band price is built for. Keep enterprise and BPO deals out of the cohort so the data is not muddied."],
  ["Onboarding", "Assisted, with a person on the first check-in week", "Proves whether the help is needed or merely reassuring \u2014 and prices the human cost of each account."],
  ["Duration", "60\u201390 days", "Long enough for a review cycle or a pay period to pass, so the habit either forms or does not."],
  ["Pricing posture", "One published offer, one test variant at most", "Price is visible from the start. A ten-company sample cannot support a serious price experiment."],
  ["Access", "Invite-only, not public signup", "The gates above are for the operator, not the customer. Public self-serve waits."],
];

const measures = [
  ["Activation", "First completed check-in within 7 days of account creation", "Separates a real trial from a curiosity signup"],
  ["Habit", "Managers completing 3+ check-ins in week two", "A manager who checks in twice in month one will not sustain it"],
  ["Staff reach", "Share of frontline staff completing at least one check-in", "Tests whether the free-frontline promise is used or ignored"],
  ["Setup cost", "Hours to first working check-in, logged per account", "The number that decides whether a low annual price is viable"],
  ["Support load", "Minutes per account per week after week two", "The real cost driver on a cheap plan"],
  ["Cost to serve", "AI, email and storage spend per free tenant per month", "Turns the ~$1.50 ceiling from a guess into a measurement"],
  ["Willingness to pay", "Signed or verbally committed price at day 45, not day 90", "Asked while enthusiasm is real, not after the novelty fades"],
  ["Upgrade trigger", "Which cap they hit, if any \u2014 seats, teams, history or analytics", "Tells you which boundary is a wall and which is decoration"],
];

const decisions = [
  {
    verdict: "Proceed to public self-serve",
    tone: "good",
    rule: "All five gates closed, activation above half the cohort, setup under two hours per account, and support minutes flat or falling by week six.",
  },
  {
    verdict: "Proceed but keep it assisted",
    tone: "warning",
    rule: "Activation is healthy but setup time or support minutes are not yet dropping. Sell, but staff onboarding; do not open a signup form.",
  },
  {
    verdict: "Fix and re-run",
    tone: "danger",
    rule: "Any gate still open, lost check-ins, or managers reporting they could not finish a check-in without help.",
  },
  {
    verdict: "Change the offer",
    tone: "default",
    rule: "People activate but nobody hits an upgrade trigger, or everyone stalls at the same cap in week one. The boundary is in the wrong place, not the price.",
  },
];

export default function CohortTestPlan() {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeading kicker="How the strategy gets tested">Prove it on ten accounts before you open the door</SectionHeading>
        <Lead>
          The recommendation is not "launch a free tier and see". It is a gated, assisted cohort: a small set
          of real organisations, invited in, onboarded by a human, with the offer and price visible from day
          one. Public self-serve opens only when the operational conditions below are met. Everything else on
          this page is a condition or a measurement, not a slogan.
        </Lead>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cohort" value="6\u201310 firms" sub="Real accounts, invite-only, one segment." />
        <Stat label="Run" value="60\u201390 days" sub="Long enough for the habit to form or fail." />
        <Stat label="Public signup" value="Gated" sub="Waits on tenant separation and check-in reliability." />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Gates: what must be true before a stranger gets an account</p>
        <DataTable
          columns={[
            { key: "gate", label: "Gate", className: "w-[24%]" },
            { key: "why", label: "Why it blocks a public launch", className: "w-[40%]" },
            { key: "met", label: "What counts as met", className: "w-[28%]" },
            { key: "state", label: "", className: "w-[70px]" },
          ]}
          rows={gates.map((g) => ({
            gate: <span className="text-[13px] font-semibold text-foreground">{g.gate}</span>,
            why: <span className="text-[13px] text-muted-foreground">{g.why}</span>,
            met: <span className="text-[13px] text-muted-foreground">{g.met}</span>,
            state: <Tag tone="warning">{g.state}</Tag>,
          }))}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          These are internal prerequisites, not promises to the customer. Two of them come from issues raised
          on the implementation call, which are logged here as open until someone reproduces them in the live
          product \u2014 a call note is a lead, not a verified defect.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">How the cohort is run</p>
        <DataTable
          dense
          columns={[
            { key: "k", label: "Dimension", className: "w-[16%]" },
            { key: "v", label: "Design", className: "w-[34%]" },
            { key: "w", label: "Why" },
          ]}
          rows={design.map(([k, v, w]) => ({
            k: <span className="text-[13px] font-semibold text-foreground">{k}</span>,
            v: <span className="text-[13px]">{v}</span>,
            w: <span className="text-[13px] text-muted-foreground">{w}</span>,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">What to measure, and what each number decides</p>
        <DataTable
          dense
          columns={[
            { key: "m", label: "Measure", className: "w-[16%]" },
            { key: "d", label: "Definition", className: "w-[40%]" },
            { key: "u", label: "What it decides" },
          ]}
          rows={measures.map(([m, d, u]) => ({
            m: <span className="text-[13px] font-semibold text-foreground">{m}</span>,
            d: <span className="text-[13px]">{d}</span>,
            u: <span className="text-[13px] text-muted-foreground">{u}</span>,
          }))}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-foreground">Decision rules, written before the cohort starts</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {decisions.map((d) => (
            <div key={d.verdict} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Tag tone={d.tone}>{d.verdict}</Tag>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{d.rule}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Written in advance precisely because it is tempting to re-interpret the results afterwards. If a gate
          is still open at day 60, "Proceed but keep it assisted" is not a loophole \u2014 it is the honest
          description of an operator-assisted business rather than a self-serve one.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What ten companies can tell you</p>
          <Bullets
            className="mt-2"
            items={[
              "Whether a manager can complete a check-in unaided, and where they stop.",
              "Whether the habit survives week two, which is the only week that matters.",
              "What onboarding actually costs in hours, per account, in your own hands.",
              "Whether the price creates a real objection or none at all \u2014 a directional signal.",
              "Which cap people hit first, which is the only reliable input to where the free line sits.",
            ]}
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">What it cannot tell you</p>
          <Bullets
            className="mt-2"
            items={[
              "A conversion rate. Ten firms cannot distinguish 5% from 20% with any confidence.",
              "Which of several prices is optimal. Two arms of five accounts is not an experiment.",
              "Whether a free tier pays for itself at scale \u2014 that arrives with hundreds of tenants.",
              "Whether small firms in other markets behave the same. One region, one answer.",
              "Anything about enterprise or BPO buying, which is a separate motion with separate buyers.",
            ]}
          />
        </div>
      </div>

      <Callout tone="warning" title="On the benchmarks, and the temptation to plan from them">
        <p>
          Published conversion data clusters broadly: freemium models around 3\u20135% good and 8\u201312% great,
          card-less trials around 4\u20136% and 10\u201315%, with a median free-to-paid figure near 8% across
          products. Those are cross-industry averages with wide spread, not a forecast for a ten-manager
          product sold to small firms in one region.
        </p>
        <p>
          Use them for one purpose only: to stop anyone promising a 25% conversion, and to justify measuring
          activation rather than signups. Do not put a conversion target in a board deck as though it were
          known, and do not size the business on it.
        </p>
      </Callout>

      <Callout tone="accent" title="The sequencing that matters">
        <p>
          Reliability, then a measured cohort, then a visible offer, then open signup. The temptation is to
          reverse the last two \u2014 publish a free tier to create momentum and fix the rest during the
          inflow. That order converts a product problem into a support and trust problem, in front of the exact
          buyers this brief is trying to win.
        </p>
      </Callout>
    </div>
  );
}