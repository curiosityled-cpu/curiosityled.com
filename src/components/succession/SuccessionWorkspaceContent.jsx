import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import OverviewView from "@/components/succession/OverviewView";
import CyclesView from "@/components/succession/CyclesView";
import RolesView from "@/components/succession/RolesView";
import PositionsView from "@/components/succession/PositionsView";
import CriticalRolesView from "@/components/succession/CriticalRolesView";
import BlueprintsView from "@/components/succession/BlueprintsView";
import SnapshotsView from "@/components/succession/SnapshotsView";
import TalentPoolsView from "@/components/succession/TalentPoolsView";
import CandidatesView from "@/components/succession/CandidatesView";
import EvidenceReviewQueueView from "@/components/succession/EvidenceReviewQueueView";
import ReadinessProposalsView from "@/components/succession/ReadinessProposalsView";
import CalibrationView from "@/components/succession/CalibrationView";
import RatificationQueueView from "@/components/succession/RatificationQueueView";
import DevelopmentPlansView from "@/components/succession/DevelopmentPlansView";
import DevelopmentActionsView from "@/components/succession/DevelopmentActionsView";
import TransitionsView from "@/components/succession/TransitionsView";
import TransitionDetailView from "@/components/succession/TransitionDetailView";
import OperationalMonitorView from "@/components/succession/OperationalMonitorView";
import ReviewQueueView from "@/components/succession/ReviewQueueView";
import DemoDataButton from "@/components/succession/DemoDataButton";
import { useClient } from "@/components/contexts/ClientContext";

// Guided shell components
import { STAGES, STAGE_MAP } from "@/components/succession/guided/stageConfig";
import StageRail from "@/components/succession/guided/StageRail";
import WhatToDoNext from "@/components/succession/guided/WhatToDoNext";
import AllViewsDrawer from "@/components/succession/guided/AllViewsDrawer";
import StageHeader from "@/components/succession/guided/StageHeader";
import { useCycleRole } from "@/components/succession/guided/useCycleRole";

function renderView(viewKey) {
  switch (viewKey) {
    case "overview":
      return <OverviewView />;
    case "cycles":
      return <CyclesView />;
    case "roles":
      return <RolesView />;
    case "positions":
      return <PositionsView />;
    case "critical-roles":
      return <CriticalRolesView />;
    case "blueprints":
      return <BlueprintsView />;
    case "snapshots":
      return <SnapshotsView />;
    case "talent-pools":
      return <TalentPoolsView />;
    case "candidates":
      return <CandidatesView />;
    case "evidence-queue":
      return <EvidenceReviewQueueView />;
    case "readiness-proposals":
      return <ReadinessProposalsView />;
    case "calibration":
      return <CalibrationView />;
    case "ratification":
      return <RatificationQueueView />;
    case "development-plans":
      return <DevelopmentPlansView />;
    case "development-actions":
      return <DevelopmentActionsView />;
    case "transitions":
      return <TransitionsView />;
    case "transition-detail":
      return <TransitionDetailView />;
    case "operational-monitor":
      return <OperationalMonitorView />;
    case "review-queue":
      return <ReviewQueueView />;
    case "governance":
      return <GovernanceView />;
    default:
      return <OverviewView />;
  }
}

function GovernanceView() {
  return (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#0202ff]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cross-Tenant Access Governance</h3>
            <p className="text-sm text-gray-500 mt-1">
              Cross-tenant succession access is controlled by a server-side feature flag and a
              control-plane grant workflow. No ordinary entity CRUD is exposed. The grant
              workflow and dedicated read function must pass security testing before this path
              can be activated.
            </p>
          </div>
        </div>
        <div className="mt-5 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Disabled pending security testing</span>
          </div>
          <p className="text-xs text-amber-700 mt-1.5">
            The grant-request form will appear here once the feature flag is enabled and security
            testing passes. Production activation requires a separate approval.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * SuccessionWorkspaceContent — the guided succession workspace.
 *
 * Replaces the flat 19-pill sub-nav with a 9-stage stepper driven by
 * SuccessionCycle.process_stage. Includes a "What to do next" panel,
 * inline AI Assist per stage, role-aware stage filtering, and an
 * "All views" drawer for power-user direct navigation.
 *
 * Renders without a page shell so it can be embedded inside Talent Manager
 * or wrapped by the standalone SuccessionWorkspace page.
 */
export default function SuccessionWorkspaceContent() {
  const [activeStage, setActiveStage] = useState("frame");
  const [activeView, setActiveView] = useState("cycles");
  const [activeCycle, setActiveCycle] = useState(null);
  const [loadingCycle, setLoadingCycle] = useState(true);
  const { client } = useClient();
  const isDemoTenant = Boolean(client?.settings?.succession_demo);
  const { role, loading: roleLoading } = useCycleRole();

  // Fetch the active cycle on mount
  useEffect(() => {
    const fetchCycle = async () => {
      try {
        const { data } = await base44.functions.invoke("successionListCycles", {});
        const cycles = data?.cycles || [];
        const active =
          cycles.find((c) => c.status !== "closed" && c.status !== "archived") ||
          cycles[0] ||
          null;
        setActiveCycle(active);
        if (active?.process_stage) {
          setActiveStage(active.process_stage);
          const stage = STAGE_MAP[active.process_stage];
          if (stage?.views?.length) {
            setActiveView(stage.views[0]);
          }
        }
      } catch {
        /* no cycles or error — user starts at frame stage */
      } finally {
        setLoadingCycle(false);
      }
    };
    fetchCycle();
  }, []);

  const handleStageSelect = (stageKey, viewKey) => {
    setActiveStage(stageKey);
    if (viewKey) {
      setActiveView(viewKey);
    } else {
      const stage = STAGE_MAP[stageKey];
      if (stage?.views?.length) {
        setActiveView(stage.views[0]);
      }
    }
  };

  const handleViewSelect = (viewKey) => {
    setActiveView(viewKey);
    // If the view belongs to a stage, switch the active stage too
    const viewEntry = STAGES.flatMap((s) =>
      s.views.map((v) => ({ stage: s.key, view: v }))
    ).find((e) => e.view === viewKey);
    if (viewEntry) {
      setActiveStage(viewEntry.stage);
    }
  };

  const stage = STAGE_MAP[activeStage];
  const isReadOnly =
    role !== "admin" && stage && !stage.roles.includes(role);

  const assistContext = {
    cycleName: activeCycle?.name,
    cycleKey: activeCycle?.cycle_key,
  };

  return (
    <>
      {/* Status badges row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {isDemoTenant && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
            <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Synthetic Demo Tenant</span>
          </div>
        )}
        <DemoDataButton isDemoTenant={isDemoTenant} />
      </div>

      {loadingCycle || roleLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Left rail — desktop */}
          <aside className="hidden lg:block w-56 flex-shrink-0 space-y-3">
            <StageRail
              stages={STAGES}
              currentStage={activeCycle?.process_stage || activeStage}
              activeStage={activeStage}
              onSelect={(key) => handleStageSelect(key)}
              role={role}
            />
            <AllViewsDrawer activeView={activeView} onSelect={handleViewSelect} />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Mobile stage scroller */}
            <div className="lg:hidden">
              <StageRail
                stages={STAGES}
                currentStage={activeCycle?.process_stage || activeStage}
                activeStage={activeStage}
                onSelect={(key) => handleStageSelect(key)}
                role={role}
                horizontal
              />
            </div>

            {/* Mobile all-views drawer */}
            <div className="lg:hidden">
              <AllViewsDrawer activeView={activeView} onSelect={handleViewSelect} />
            </div>

            {/* What to do next */}
            <WhatToDoNext
              activeCycle={activeCycle}
              role={role}
              onNavigate={(stageKey, viewKey) => handleStageSelect(stageKey, viewKey)}
            />

            {/* Stage header with AI assist */}
            <StageHeader stage={stage} readOnly={isReadOnly} context={assistContext} />

            {/* Stage sub-view tabs */}
            {stage && stage.views.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {stage.views.map((viewKey) => {
                  const displayLabel = viewKey
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ");
                  const isActive = activeView === viewKey;
                  return (
                    <button
                      key={viewKey}
                      onClick={() => setActiveView(viewKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isActive
                          ? "bg-[#0202ff] text-white border-[#0202ff]"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active view content */}
            <section aria-label="Succession workspace content">
              {renderView(activeView)}
            </section>
          </div>
        </div>
      )}
    </>
  );
}