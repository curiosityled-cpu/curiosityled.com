import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ClipboardCheck, Plus, Users, Scale, History, ChevronRight, Calendar, CheckCircle2,
} from "lucide-react";
import ReviewTaskDialog from "./ReviewTaskDialog";
import MyReviewSummary from "./MyReviewSummary";
import CycleProgressBoard from "./CycleProgressBoard";
import CycleSettingsDialog from "./CycleSettingsDialog";
import ReviewAuditTrail from "./ReviewAuditTrail";
import CycleStageRail from "./CycleStageRail";
import { buildCycleStages, buildPreviewStages, stageDestination } from "@/lib/reviewStages";
import CalibrationView from "@/components/performance-mgmt/CalibrationView";
import { toast } from "sonner";

const ROLE_LABEL = { self: "Self review", manager: "Manager review", peer: "Peer feedback" };

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
        active ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export default function ReviewWorkspace({ embedded = false }) {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [tab, setTab] = useState("mine");
  const [activeTask, setActiveTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [stageFocus, setStageFocus] = useState(null);
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
        const cycles = res.data?.cycles || [];
        const withWork = cycles.find((c) => (c.my_tasks || []).some((t) => !t.submitted));
        return (withWork || cycles[0])?.id || "";
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
  const cycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null;

  const hasTeam = !!cycle && !isAdmin && cycle.can_manage && (cycle.progress_rows || []).length > 0;
  const myTasks = cycle?.my_tasks || [];
  const openTasks = myTasks.filter((t) => !t.submitted);
  // Creating and editing cycles is restricted to HR Admins and above (also enforced server-side).
  const canConfigure = data?.viewer?.can_configure_cycles ?? isAdmin;
  const stages = useMemo(
    () => buildCycleStages(cycle, { canConfigure }),
    [cycle, canConfigure]
  );

  const handleStageSelect = (stage) => {
    if (stage.id === "setup") {
      if (!canConfigure) {
        toast.error("Only HR Admins and above can change review cycle settings");
        return;
      }
      setStageFocus(null);
      setShowSettings(true);
      return;
    }
    const dest = stageDestination(stage.id);
    if (!isAdmin && dest.tab === "calibration") {
      setTab("team");
      setStageFocus("calibration");
      return;
    }
    setTab(!isAdmin && dest.tab === "progress" ? "team" : dest.tab);
    setStageFocus(dest.focus);
  };

  const tabs = useMemo(() => {
    const list = [{ id: "mine", label: "My review", icon: ClipboardCheck }];
    if (hasTeam) list.push({ id: "team", label: "My team", icon: Users });
    if (isAdmin) {
      list.push({ id: "progress", label: "Cycle progress", icon: Users });
      list.push({ id: "calibration", label: "Calibration", icon: Scale });
      list.push({ id: "history", label: "History", icon: History });
    }
    return list;
  }, [hasTeam, isAdmin]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab(tabs[0].id);
  }, [tabs.map((t) => t.id).join("|")]);

  useEffect(() => {
    if (myTasks.length > 0 || cycle?.my_summary) return;
    if (isAdmin) setTab((prev) => (prev === "mine" ? "progress" : prev));
    else if (hasTeam) setTab((prev) => (prev === "mine" ? "team" : prev));
  }, [cycle?.id, myTasks.length, isAdmin, hasTeam]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border border-red-100 bg-red-50/50 rounded-2xl">
        <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
      </Card>
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

      {cycles.length === 0 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">How a review cycle runs</p>
            <CycleStageRail stages={buildPreviewStages()} />
          </div>
          <div className="text-center py-14 border border-dashed border-gray-200 rounded-2xl">
            <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">No review cycles yet</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              {isAdmin
                ? "Create a cycle to set the period, reviewers, and how outcomes are released."
                : "Your next review will appear here when it opens."}
            </p>
            {canConfigure && (
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create review cycle
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={cycle?.id || ""} onValueChange={(v) => { setSelectedCycleId(v); setStageFocus(null); }}>
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
            {cycle && (
              <Badge variant="outline" className="text-[10px]">
                {cycle.status}
              </Badge>
            )}
            {openTasks.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                {openTasks.length} task{openTasks.length > 1 ? "s" : ""} to complete
              </Badge>
            )}
            {canConfigure && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 ml-auto"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="w-3.5 h-3.5" /> New cycle
              </Button>
            )}
          </div>

          {cycle && (isAdmin || hasTeam) && (
            <CycleStageRail
              stages={stages}
              activeStage={stageFocus}
              onSelect={handleStageSelect}
            />
          )}

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            {tabs.map((t) => (
              <TabButton
                key={t.id}
                active={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setStageFocus(null);
                }}
                icon={t.icon}
              >
                {t.label}
              </TabButton>
            ))}
          </div>

          {tab === "mine" && (
            <div className="space-y-3">
              {myTasks.length === 0 && !cycle?.my_summary && (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                  <ClipboardCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nothing assigned to you in this cycle</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tasks appear here when you are assigned a review.
                  </p>
                </div>
              )}

              {myTasks.map((task) => (
                <Card key={task.task_id} className="border border-gray-100 shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          {ROLE_LABEL[task.role]}
                        </p>
                        <span className="text-xs text-gray-400">· {task.employee_name}</span>
                        {task.submitted ? (
                          <Badge variant="outline" className="text-[10px] border-green-200 bg-green-50 text-green-700 gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Submitted
                          </Badge>
                        ) : task.draft_responses ? (
                          <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
                            Draft saved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Not started</Badge>
                        )}
                        {task.anonymous && (
                          <Badge variant="outline" className="text-[10px]">Anonymous to employee</Badge>
                        )}
                      </div>
                      {task.due_date && (
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due{" "}
                          {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={task.submitted ? "outline" : "default"}
                      className={`h-8 text-xs gap-1 ${task.submitted ? "" : "bg-[#0202ff] hover:bg-[#0101dd] text-white"}`}
                      onClick={() => setActiveTask(task)}
                    >
                      {task.submitted ? "View" : task.draft_responses ? "Continue" : "Start"}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {cycle?.my_summary?.released && (
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Your final summary
                  </h3>
                  <MyReviewSummary
                    cycle={cycle}
                    summary={cycle.my_summary}
                    onUpdated={() => load(cycle.id)}
                  />
                </div>
              )}

              {cycle?.my_summary && !cycle.my_summary.released && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">
                    Your review is in progress. You will be able to read the outcome here once your
                    manager has completed the conversation and it is released.
                  </p>
                </div>
              )}
            </div>
          )}

          {(tab === "progress" || tab === "team") && cycle && (
            <CycleProgressBoard
              cycle={cycle}
              isAdmin={tab === "progress"}
              audit={data?.audit}
              user={user}
              focusStage={stageFocus}
              onClearFocus={() => setStageFocus(null)}
              canConfigure={canConfigure}
              onRefresh={() => load(cycle.id)}
            />
          )}

          {tab === "calibration" && cycle && user && (
            <CalibrationView cycle={cycle} user={user} />
          )}

          {tab === "history" && <ReviewAuditTrail events={data?.audit || []} />}
        </>
      )}

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