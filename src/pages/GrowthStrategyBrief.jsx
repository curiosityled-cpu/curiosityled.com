import React, { useState } from "react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExecutiveRecommendation from "@/components/growth/ExecutiveRecommendation";
import PricingArchitecture from "@/components/growth/PricingArchitecture";
import ReadinessAudit from "@/components/growth/ReadinessAudit";
import CommercialPlan from "@/components/growth/CommercialPlan";
import ImplementationPlan from "@/components/growth/ImplementationPlan";
import MeetingFindings from "@/components/growth/MeetingFindings";
import EngagedlyTeardown from "@/components/growth/EngagedlyTeardown";
import EngagedlyResearch from "@/components/growth/EngagedlyResearch";
import AssumptionsSources from "@/components/growth/AssumptionsSources";

const TABS = [
  { value: "recommendation", label: "Recommendation" },
  { value: "pricing", label: "Pricing architecture" },
  { value: "audit", label: "Readiness & claims audit" },
  { value: "plan", label: "Commercial plan" },
  { value: "implementation", label: "Implementation plan" },
  { value: "findings", label: "Meeting evidence" },
  { value: "competitor", label: "Engagedly" },
  { value: "research", label: "Pricing & sales research" },
  { value: "sources", label: "Assumptions & sources" },
];

export default function GrowthStrategyBrief() {
  const [tab, setTab] = useState("recommendation");

  return (
    <MVPPageLayout
      title="Growth Strategy Brief"
      subtitle="Regenerated 16 November 2026 — revised allowances, three-tier pricing, a read-only product audit, a sequenced commercial plan and the build order that makes them enforceable"
    >
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="sticky top-0 z-10 -mx-1 mb-5 bg-background/95 px-1 pb-2 pt-1 backdrop-blur">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/50 p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="recommendation" className="mt-0 focus-visible:outline-none">
          <ExecutiveRecommendation />
        </TabsContent>
        <TabsContent value="pricing" className="mt-0 focus-visible:outline-none">
          <PricingArchitecture />
        </TabsContent>
        <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
          <ReadinessAudit />
        </TabsContent>
        <TabsContent value="plan" className="mt-0 focus-visible:outline-none">
          <CommercialPlan />
        </TabsContent>
        <TabsContent value="implementation" className="mt-0 focus-visible:outline-none">
          <ImplementationPlan />
        </TabsContent>
        <TabsContent value="findings" className="mt-0 focus-visible:outline-none">
          <MeetingFindings />
        </TabsContent>
        <TabsContent value="competitor" className="mt-0 focus-visible:outline-none">
          <EngagedlyTeardown />
        </TabsContent>
        <TabsContent value="research" className="mt-0 focus-visible:outline-none">
          <EngagedlyResearch />
        </TabsContent>
        <TabsContent value="sources" className="mt-0 focus-visible:outline-none">
          <AssumptionsSources />
        </TabsContent>
      </Tabs>
    </MVPPageLayout>
  );
}