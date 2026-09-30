import React, { useState, useEffect } from "react";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FileEdit, BarChart3, RefreshCw } from "lucide-react";
import AssessmentLibraryTab from "@/components/assessment-manager/AssessmentLibraryTab";
import AssessmentBuilderTab from "@/components/assessment-manager/AssessmentBuilderTab";
import AssessmentOverviewTab from "@/components/assessment-manager/AssessmentOverviewTab";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";

function AssessmentManager() {
  const [activeTab, setActiveTab] = useState("library");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["library", "builder", "overview"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const initialEditId = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || null;
  })();

  return (
    <MVPPageLayout
      title="Assessment Manager"
      subtitle="Manage assessments, build custom evaluations, and track completion across your organization."
      action={
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="library" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Library
          </TabsTrigger>
          <TabsTrigger value="builder" className="gap-1.5">
            <FileEdit className="w-3.5 h-3.5" /> Builder
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <AssessmentLibraryTab key={`lib-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="builder">
          <AssessmentBuilderTab key={`bld-${refreshKey}`} initialEditId={initialEditId} />
        </TabsContent>
        <TabsContent value="overview">
          <AssessmentOverviewTab key={`ovw-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </MVPPageLayout>
  );
}

export default withAuthProtection(AssessmentManager, [
  "Admin Level 1",
  "Admin Level 2",
  "Super Administrator",
  "Partner Business Administrator",
  "Platform Admin",
]);