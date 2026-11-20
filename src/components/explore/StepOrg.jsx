import React, { useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, FileText, Download, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HUB_PAGE } from "@/lib/exploreHubContent";
import { DEMO_VERSION } from "@/lib/exploreDemoContent";
import HubFilterBar from "@/components/explore/hub/HubFilterBar";
import HubPulseCards from "@/components/explore/hub/HubPulseCards";
import HubLifecycle from "@/components/explore/hub/HubLifecycle";
import HubLensTabs from "@/components/explore/hub/HubLensTabs";
import HubExecutiveBriefing from "@/components/explore/hub/HubExecutiveBriefing";
import HubOrgHealth from "@/components/explore/hub/HubOrgHealth";
import HubWellbeing from "@/components/explore/hub/HubWellbeing";
import HubTalentLens from "@/components/explore/hub/HubTalentLens";
import HubWorkforceLens from "@/components/explore/hub/HubWorkforceLens";
import HubRisksOpportunities from "@/components/explore/hub/HubRisksOpportunities";

export default function StepOrg({ onRestart }) {
  const [lens, setLens] = useState("enterprise");
  const [stage, setStage] = useState(null);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* Page header, exactly as the Hub renders it */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{HUB_PAGE.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{HUB_PAGE.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {[RefreshCw, FileText, Download].map((Icon, i) => (
            <span
              key={i}
              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500"
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <HubFilterBar />
        <HubPulseCards />
        <HubLifecycle activeStage={stage} onStageChange={setStage} />
        <HubLensTabs activeLens={lens} onLensChange={setLens} />

        {lens === "enterprise" && (
          <>
            <HubExecutiveBriefing />
            <HubOrgHealth />
            <HubWellbeing />
            <HubRisksOpportunities />
          </>
        )}

        {lens === "talent" && (
          <>
            <HubTalentLens />
            <HubRisksOpportunities />
          </>
        )}

        {lens === "workforce" && (
          <>
            <HubWorkforceLens />
            <HubWellbeing />
          </>
        )}
      </div>

      {/* Demo close — one slim row under the hub */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="text-[11px] text-gray-500 sm:mr-auto">
          That's the whole loop: see yourself, get support, keep the rhythm, show the movement.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" className="text-white" style={{ backgroundColor: "#0202ff" }}>
            <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer">
              Book a demo
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Start again
          </Button>
          <Link to="/" className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 px-1">
            Back to the site
          </Link>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 pb-2">
        Illustrative sample data throughout · demo content {DEMO_VERSION}
      </p>
    </div>
  );
}