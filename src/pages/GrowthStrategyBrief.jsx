import React, { useState } from "react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExecutiveRecommendation from "@/components/growth/ExecutiveRecommendation";
import MeetingFindings from "@/components/growth/MeetingFindings";
import EngagedlyTeardown from "@/components/growth/EngagedlyTeardown";
import PackagingModels from "@/components/growth/PackagingModels";
import FreeEntryStrategy from "@/components/growth/FreeEntryStrategy";
import Plan306090 from "@/components/growth/Plan306090";
import AssumptionsSources from "@/components/growth/AssumptionsSources";

const TABS = [
  { value: "recommendation", label: "Recommendation" },
  { value: "findings", label: "Meeting evidence" },
  { value: "competitor", label: "Engagedly" },
  { value: "packaging", label: "Pricing & packaging" },
  { value: "free", label: "FREE strategy" },
  { value: "plan", label: "30/60/90 plan" },
  { value: "sources", label: "Assumptions & sources" },
];

export default function GrowthStrategyBrief() {
  const [tab, setTab] = useState("recommendation");

  return (
    <MVPPageLayout
      title="Growth Strategy Brief"
      subtitle="Engagedly teardown, small-company packaging, free-entry strategy and a 90-day plan — prepared 11 November 2026"
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
        <TabsContent value="findings" className="mt-0 focus-visible:outline-none">
          <MeetingFindings />
        </TabsContent>
        <TabsContent value="competitor" className="mt-0 focus-visible:outline-none">
          <EngagedlyTeardown />
        </TabsContent>
        <TabsContent value="packaging" className="mt-0 focus-visible:outline-none">
          <PackagingModels />
        </TabsContent>
        <TabsContent value="free" className="mt-0 focus-visible:outline-none">
          <FreeEntryStrategy />
        </TabsContent>
        <TabsContent value="plan" className="mt-0 focus-visible:outline-none">
          <Plan306090 />
        </TabsContent>
        <TabsContent value="sources" className="mt-0 focus-visible:outline-none">
          <AssumptionsSources />
        </TabsContent>
      </Tabs>
    </MVPPageLayout>
  );
}