import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings2, Lock, ClipboardCheck } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReviewTaskDialog from "./ReviewTaskDialog";
import CycleProgressBoard from "./CycleProgressBoard";
import CycleSettingsDialog from "./CycleSettingsDialog";
import ReviewAuditTrail from "./ReviewAuditTrail";
import CalibrationView from "@/components/performance-mgmt/CalibrationView";
import ReviewStageRail from "./guided/ReviewStageRail";
import ReviewAllViews from "./guided/ReviewAllViews";
import ReviewNextSteps from "./guided/ReviewNextSteps";
import ReviewStageHeader from "./guided/ReviewStageHeader";
import ReviewMyWorkView from "./guided/ReviewMyWorkView";
import ReviewSetupView from "./guided/ReviewSetupView";
import {
  REVIEW_STAGE_MAP,
  canActOnStage,
  viewForStage,
  stageForView,
  viewDef,
  viewsForRole,
} from "./guided/reviewStageConfig";
import { buildCycleStages, buildPreviewStages } from "@/lib/reviewStages";

/**
 * ReviewWorkspace — the guided review cycle workspace.
 *
 * Same shell as the Succession workspace: a stage rail, a "what to do next"
 * panel, a stage header, an all-views drawer, and a stage-scoped content
 * area. Cycle selection, role permissions, stage filtering and every dialog
 * (cycle settings, review tasks, roster, conversation, calibration) stay
 * exactly as they were.
 */
export default function ReviewWorkspace({ embedded = false }) {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [activeStage, setActiveStage] = useState("setup");
  const [activeView, setActiveView] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const load = async (cycleId) => {
    setError(null);
    try {
      const res = await base44.functions.invoke(
        "getReviewWorkspace",
        cycleId ? { review_cycle_id: cycleId } : {}
      );
      setData(res.data);
      setSelectedCycleId((prev) => {
        if (prev) return prev;
        const list = res.data?.cycles || [];
        const withWork = list.find((c) => (c.my_tasks || []).some((t) => !t.submitted));
        return (withWork || list[0])?.id || "";
      });
    } catch (err) {
      setError(err.response?.data?.error || "Could not load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedCycleId) load(selectedCycleId);
  }, [selectedCycleId]);

  const cycles = data?.cycles || [];
  const isAdmin = !!data?.viewer?.is_admin;
  const canConfigure = data?.viewer?.can_configure_cycles ?? isAdmin;
  const cycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null;

  const rows = cycle?.progress_rows || [];
  const hasTeam = !isAdmin && !!cycle?.can_manage && rows.length > 0;
  const role = isAdmin ? "admin" : cycle?.can_manage ? "manager" : "employee";

  const myTasks = cycle?.my_tasks || [];
  const openTasks = myTasks.filter((t) => !t.submitted);

  const stages = useMemo(
    () => (cycle ? buildCycleStages(cycle, { canConfigure }) : buildPreviewStages()),
    [cycle, canConfigure]
  );

  const views = useMemo(() => viewsForRole(role, { hasTeam }), [role, hasTeam]);

  // Land people where their work actually is: admins on the cycle's current
  // stage, managers on manager reviews, employees on their own tasks.
  useEffect(() => {
    if (!cycle) {
      setActiveStage("setup");
      setActiveView(role === "admin" ? "settings" : null);
      return;
    }
    const actionable = stages.filter((s) => canActOnStage(s.id, role));
    const primaryId = role === "manager" ? "manager" : role === "employee" ? "self" : null;
    const target =
      (primaryId && actionable.find((s) => s.id === primaryId)) ||
      actionable.find((s) => s.state === "current") ||
      actionable.find((s) => !s.done) ||
      actionable[0] ||
      null;

    if (!target) {
      setActiveView(null);
      return;
    }
    setActiveStage(target.id);
    setActiveView(viewForStage(target.id, role));
    // Re-run only when the cycle or the person's role changes — a data refresh
    // must not yank someone out of the view they are working in.
  }, [cycle?.id, role]);

  const handleStageSelect = (stageKey) => {
    setActiveStage(stageKey);
    setActiveView(viewForStage(stageKey, role));
  };

  const handleViewSelect = (viewKey) => {
    setActiveView(viewKey);
    const stageKey = stageForView(viewKey);
    if (stageKey) setActiveStage(stageKey);
  };

  const stageConf = REVIEW_STAGE_MAP[activeStage] || null;
  const viewConf = activeView ? viewDef(activeView) : null;
  // Without a cycle the only real step is setting one up, so the header says so
  // even if someone browses the rest of the process from the rail.
  const headerConf = !cycle
    ? REVIEW_STAGE_MAP.setup
    : viewConf && !viewConf.stage
    ? { label: viewConf.label, icon: viewConf.icon, description: viewConf.description }
    : stageConf;
  const stageState = stages.find((s) => s.id === activeStage) || null;
  const locked = !activeView;

  const clearFocus = () => setActiveView(isAdmin ? "cycle-progress" : "my-team");

  const boardProps = {
    cycle,
    user,
    audit: data?.audit,
    onRefresh: () => cycle && load(cycle.id),
    canConfigure,
    onClearFocus: clearFocus,
  };

  const renderView = () => {
    if (!cycle) {
      return (
        <ReviewSetupView
          cycle={null}
          canConfigure={canConfigure}
          onCreate={() => setShowCreate(true)}
        />
      );
    }

    switch (activeView) {
      case "my-review":
        return (
          <ReviewMyWorkView
            cycle={cycle}
            myTasks={myTasks}
            onOpenTask={setActiveTask}
            onUpdated={() => load(cycle.id)}
          />
        );
      case "my-team":
        return <CycleProgressBoard {...boardProps} isAdmin={false} />;
      case "cycle-progress":
        return <CycleProgressBoard {...boardProps} isAdmin />;
      case "roster":
        return <CycleProgressBoard {...boardProps} isAdmin focusStage="roster" />;
      case "self-progress":
        return <CycleProgressBoard {...boardProps} isAdmin={isAdmin} focusStage="self" />;
      case "manager-progress":
        return <CycleProgressBoard {...boardProps} isAdmin={isAdmin} focusStage="manager" />;
      case "conversation-progress":
        return (
          <CycleProgressBoard {...boardProps} isAdmin={isAdmin} focusStage="conversation" />
        );
      case "release-progress":
        return <CycleProgressBoard {...boardProps} isAdmin focusStage="release" />;
      case "calibration":
        return user ? <CalibrationView cycle={cycle} user={user} /> : null;
      case "history":
        return <ReviewAuditTrail events={data?.audit || []} />;
      case "settings":
        return (
          <ReviewSetupView
            cycle={cycle}
            canConfigure={canConfigure}
            onEdit={() => setShowSettings(true)}
            onCreate={() => setShowCreate(true)}
          />
        );
      default:
        return null;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">
            Your review, your team, and the whole cycle in one place.
          </p>
        </div>
      )}

      {/* Cycle selection + cycle-level actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {cycle ? (
          <>
            <Select
              value={cycle.id}
              onValueChange={(v) => {
                setSelectedCycleId(v);
                setActiveView(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-72 h-9 text-xs">
                <SelectValue placeholder="Select a cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                    {c.status === "draft" ? " (draft)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-[10px]">
              {cycle.status}
            </Badge>
            {openTasks.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-200 bg-amber-50 text-amber-700"
              >
                {openTasks.length} task{openTasks.length > 1 ? "s" : ""} to complete
              </Badge>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
            <ClipboardCheck className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">No review cycle yet</span>
          </div>
        )}

        {canConfigure && (
          <div className="flex items-center gap-2 ml-auto">
            {cycle && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => setShowSettings(true)}
              >
                <Settings2 className="w-3.5 h-3.5" /> Cycle settings
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-3.5 h-3.5" /> New cycle
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-5">
        {/* Left rail — desktop */}
        <aside className="hidden lg:block w-56 flex-shrink-0 space-y-3">
          <ReviewStageRail
            stages={stages}
            activeStage={activeStage}
            onSelect={handleStageSelect}
            role={role}
          />
          <ReviewAllViews views={views} activeView={activeView} onSelect={handleViewSelect} />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="lg:hidden">
            <ReviewStageRail
              stages={stages}
              activeStage={activeStage}
              onSelect={handleStageSelect}
              role={role}
              horizontal
            />
          </div>

          <div className="lg:hidden">
            <ReviewAllViews views={views} activeView={activeView} onSelect={handleViewSelect} />
          </div>

          <ReviewNextSteps cycle={cycle} role={role} onNavigate={handleViewSelect} />

          <ReviewStageHeader
            stage={headerConf}
            stageState={viewConf?.stage ? stageState : null}
            readOnly={!viewConf || (!!viewConf.stage && !canActOnStage(activeStage, role))}
          />

          {locked ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center">
              <Lock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {stageConf?.roles?.includes("manager")
                  ? "Managers and HR Admins run this step"
                  : "Only HR Admins run this step"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You can still follow the cycle from{" "}
                {role === "employee" ? "My review." : "My team and My review."}
              </p>
            </div>
          ) : (
            <section aria-label="Review workspace content">{renderView()}</section>
          )}
        </div>
      </div>

      <CycleSettingsDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        cycle={null}
        clientId={user?.client_id || user?.data?.client_id}
        onSaved={() => load()}
      />

      {cycle && showSettings && (
        <CycleSettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          cycle={cycle}
          clientId={user?.client_id || user?.data?.client_id}
          onSaved={() => load(cycle.id)}
        />
      )}

      {activeTask && cycle && (
        <ReviewTaskDialog
          open={!!activeTask}
          onClose={() => setActiveTask(null)}
          cycle={cycle}
          task={activeTask}
          formConfig={data?.review_form_config}
          onSaved={() => load(cycle.id)}
        />
      )}
    </div>
  );
}