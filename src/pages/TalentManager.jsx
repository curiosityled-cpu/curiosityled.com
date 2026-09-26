import React, { useState } from "react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import CompetencyManagerTab from "@/components/talent/CompetencyManagerTab";
import SuccessionLaunchCard from "@/components/succession/SuccessionLaunchCard";
import { useSuccessionEnabled } from "@/components/succession/useSuccessionEnabled";

export default function TalentManager() {
  const [activeTab, setActiveTab] = useState("competency-manager");
  const { enabled: successionEnabled } = useSuccessionEnabled();

  return (
    <MVPPageLayout
      title="Talent Manager"
      subtitle="Configure the leadership frameworks, competencies, and talent structures that power development across your organization."
      action={
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0202ff]/5 border border-[#0202ff]/15">
          <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
          <span className="text-xs font-medium text-[#0202ff]">Administration</span>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto">
          <TabsTrigger
            value="competency-manager"
            className="data-[state=active]:bg-[#0202ff] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Competency Manager
          </TabsTrigger>
          {successionEnabled && (
            <TabsTrigger
              value="succession"
              className="data-[state=active]:bg-[#0202ff] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Succession
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="competency-manager" className="mt-5 focus-visible:outline-none">
          <CompetencyManagerTab />
        </TabsContent>

        {successionEnabled && (
          <TabsContent value="succession" className="mt-5 focus-visible:outline-none">
            <SuccessionLaunchCard />
          </TabsContent>
        )}
      </Tabs>
    </MVPPageLayout>
  );
}