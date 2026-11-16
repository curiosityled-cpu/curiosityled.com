import React from "react";
import { SectionHeading, Lead, Callout, DataTable, Tag, Bullets } from "./briefUi";
import { GATES, PLAN } from "./pricingBriefData";

const GATE_TONE = { Done: "good", "Not started": "warning", Blocked: "danger" };

export default function CommercialPlan() {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeading kicker="Sequenced, not simultaneous">The commercial plan</SectionHeading>
        <Lead>
          Sell one package now, build the boundary for the other two, and publish nothing the product cannot enforce.
          The order matters more than the speed.
        </Lead>
      </div>

      <div>
        <SectionHeading kicker="Validation gates">Where each gate actually stands</SectionHeading>
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

      <div className="space-y-4">
        <SectionHeading kicker="Next 90 days">What happens, in order</SectionHeading>
        <div className="grid gap-4 lg:grid-cols-2">
          {PLAN.map((p) => (
            <div key={p.window} className="rounded-xl border border-border bg-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{p.window}</p>
              <h3 className="mt-1 text-[15px] font-bold text-foreground">{p.focus}</h3>
              <div className="mt-3">
                <Bullets items={p.items} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Callout tone="accent" title="The first commercial test stays one offer">
        <Bullets
          items={[
            "Ten qualified prospects from one reachable segment — BPO and service businesses with 3–10 managers and a named internal owner.",
            "Same Essentials offer, same $3,000 + $750, no exceptions and no discounts for the first ten. The point is to learn whether the offer sells, not to close a tenth deal.",
            "Growth is quoted only when a prospect genuinely has more than 10 managers or needs cross-team intelligence; it is not a second campaign.",
            "Measure the full routine — manager returns after week two, insights opened, conversations recorded, reports actually reviewed — not check-in completion.",
          ]}
        />
      </Callout>

      <div>
        <SectionHeading kicker="Before any pricing page ships">Instrumentation that must exist first</SectionHeading>
        <div className="mb-4">
          <Lead>
            There are no conversion events today. Without these, the pricing test produces an opinion rather than a
            baseline.
          </Lead>
        </div>
        <Bullets
          items={[
            "pricing_view, package_select, demo_start, demo_complete, demo_cta_click, contact_request — with the package and referring page attached.",
            "Diagnostic_start and diagnostic_complete with real elapsed time, so the “8-minute” claim is either proven or removed.",
            "For the app: manager_first_action, check_in_complete, insight_opened, conversation_logged, report_reviewed — per role and per tenant, so acceptance can be tested against the 90-Day Launch definition.",
            "Internal delivery time per implementation, tracked against the five-hour guardrail, because that guardrail is what keeps $750 profitable.",
          ]}
        />
      </div>

      <Callout tone="warning" title="What can be sold today, and what cannot">
        <Bullets
          items={[
            "Sellable now: the complete manager experience, standard team reporting, client-facing aggregated reporting with approval, CSV onboarding and the 90-Day Manager Launch process.",
            "Sellable by quote only: Growth's cross-team intelligence, historical windows, automation and connectors — real, but not yet bounded or metered.",
            "Not sellable yet: any named plan enforcement, published AI allowance, multi-unit intelligence guarantee, or the 15-business-day launch assurance before operational review.",
          ]}
        />
      </Callout>
    </div>
  );
}