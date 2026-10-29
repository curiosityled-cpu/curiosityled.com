import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Settings2, ShieldAlert, ShieldCheck, Lock, Unlock, CheckCircle2,
  MessageSquare, Rocket, Users, Clock,
} from "lucide-react";
import { toast } from "sonner";
import RosterManager from "@/components/performance-mgmt/RosterManager";
import CycleSettingsDialog from "./CycleSettingsDialog";
import RecordConversationDialog from "./RecordConversationDialog";
import ReviewWorkflowTimeline from "./ReviewWorkflowTimeline";
import RestrictedContextCard from "./RestrictedContextCard";
import { STAGE_META, rowsAtStage } from "@/lib/reviewStages";

const STATUS_STYLES = {
  assigned: "bg-gray-50 text-gray-600 border-gray-200",
  self_submitted: "bg-blue-50 text-blue-700 border-blue-200",
  manager_submitted: "bg-amber-50 text-amber-700 border-amber-200",
  conversation_done: "bg-indigo-50 text-indigo-700 border-indigo-200",
  released: "bg-green-50 text-green-700 border-green-200",
  acknowledged: "bg-purple-50 text-purple-700 border-purple-200",
};

function Stat({ label, value, tone = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

export default function CycleProgressBoard({
  cycle,
  isAdmin,
  audit,
  user,
  onRefresh,
  focusStage = null,
  onClearFocus,
  canConfigure = true,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [conversationRow, setConversationRow] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const rows = cycle.progress_rows || [];
  const counts = cycle.counts || {};
  const stageMeta = STAGE_META.find((s) => s.id === focusStage);
  const stageRows =
    focusStage && focusStage !== "roster"
      ? rowsAtStage(rows, focusStage, cycle.config)
      : rows;

  const runCommand = async (action, payload, successMessage) => {
    setBusyId(payload.participant_id || action);
    try {
      await base44.functions.invoke("reviewCycleCommand", {
        action,
        review_cycle_id: cycle.id,
        ...payload,
      });
      toast.success(successMessage);
      onRefresh?.();
    } catch (err) {
      const blockers = err.response?.data?.blockers;
      toast.error(
        blockers?.length
          ? `Not yet: ${blockers.join(", ")}`
          : err.response?.data?.error || "Action failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = (row) =>
    runCommand("release", { participant_id: row.participant_id }, "Review released");

  const handleLegalHold = () =>
    runCommand(
      "set_legal_hold",
      { enabled: !cycle.config?.legal_hold },
      cycle.config?.legal_hold ? "Retention hold cleared" : "Retention hold set"
    );

  const handleClose = () =>
    runCommand("close_cycle", {}, "Cycle closed — it stays available as a record");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Participants" value={counts.participants ?? rows.length} />
        <Stat label="Self reviews" value={counts.self_done ?? 0} tone="text-blue-600" />
        <Stat label="Manager reviews" value={counts.manager_done ?? 0} tone="text-amber-600" />
        <Stat label="Conversations" value={counts.conversation_done ?? 0} tone="text-indigo-600" />
        <Stat label="Released" value={counts.released ?? 0} tone="text-green-600" />
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Peer feedback: {cycle.config?.peer_attribution === "named" ? "named" : "anonymous"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Released {cycle.config?.release_policy === "after_calibration" ? "after calibration" : "after manager review"}
            </Badge>
            {cycle.config?.require_conversation && (
              <Badge variant="outline" className="text-[10px]">Conversation required</Badge>
            )}
            {cycle.config?.has_snapshot && (
              <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50 gap-1">
                <Lock className="w-2.5 h-2.5" /> Rules locked at launch
              </Badge>
            )}
            {cycle.config?.legal_hold && (
              <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50 gap-1">
                <ShieldAlert className="w-2.5 h-2.5" /> Retention hold
              </Badge>
            )}
          </div>

          {cycle.config?.period_start && (
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Review period {cycle.config.period_start} to {cycle.config.period_end}
            </p>
          )}

          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              {canConfigure && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowSettings(true)}>
                  <Settings2 className="w-3.5 h-3.5" /> Cycle settings
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleLegalHold}>
                {cycle.config?.legal_hold ? <Unlock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {cycle.config?.legal_hold ? "Clear retention hold" : "Set retention hold"}
              </Button>
              {cycle.status !== "closed" && (
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleClose}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Close cycle
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <RestrictedContextCard cycle={cycle} audit={audit} onRefresh={onRefresh} />
      )}

      {isAdmin && (cycle.status === "draft" || focusStage === "roster") && (
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-gray-900">Participants</p>
            </div>
            <p className="text-[11px] text-gray-500">
              {cycle.status === "draft"
                ? "Assign who is reviewed and by whom, then launch. The roster locks at launch."
                : "The roster locked at launch. Changes here are reassignments and stay in the history."}
            </p>
            <RosterManager cycle={cycle} user={user} onRosterUpdated={onRefresh} />
            {cycle.status === "draft" && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await base44.functions.invoke("launchReviewCycle", { review_cycle_id: cycle.id });
                      toast.success(`Launched — ${res.data.participants_notified} participants notified`);
                      onRefresh?.();
                    } catch (err) {
                      toast.error(err.response?.data?.error || "Launch failed");
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs"
                >
                  <Rocket className="w-3.5 h-3.5" /> Launch cycle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {focusStage && focusStage !== "roster" && stageMeta && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#0202ff]/15 bg-[#0202ff]/5 px-3 py-2">
          <p className="text-[11px] text-gray-700">
            <span className="font-semibold">{stageMeta.label}</span>
            <span className="text-gray-500"> · {stageMeta.hint} — </span>
            {stageRows.length === 0
              ? "nobody is waiting here"
              : `${stageRows.length} of ${rows.length} still to finish`}
          </p>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onClearFocus}>
            Show everyone
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {stageRows.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {rows.length > 0 && focusStage ? "Nobody is waiting at this stage" : "No participants yet"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {rows.length > 0 && focusStage
                ? "Everyone has moved past it."
                : isAdmin
                ? "Add the roster above to get started."
                : "Your team's reviews will appear here once the cycle launches."}
            </p>
          </div>
        ) : (
          stageRows.map((row) => (
            <Card key={row.participant_id} className="border border-gray-100 shadow-sm rounded-xl">
              <CardContent className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{row.employee_name}</p>
                    <p className="text-[10px] text-gray-400">{row.employee_email}</p>
                    <div className="mt-1.5">
                      <ReviewWorkflowTimeline stage={row.stage} compact />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${STATUS_STYLES[row.release_status !== "pending" ? "released" : row.stage === "conversation" ? "conversation_done" : row.manager_submitted ? "manager_submitted" : row.self_submitted ? "self_submitted" : "assigned"]}`}
                    >
                      {row.release_status !== "pending" ? row.release_status : row.conversation_completed ? "conversation done" : row.manager_submitted ? "manager done" : row.self_submitted ? "self done" : "waiting"}
                    </Badge>
                    {row.final_rating != null && (
                      <Badge variant="outline" className="text-[10px] border-gray-200">
                        Final {row.final_rating}/5
                      </Badge>
                    )}
                    {row.release_status === "pending" && !row.conversation_completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => setConversationRow(row)}
                      >
                        <MessageSquare className="w-3 h-3" /> Record conversation
                      </Button>
                    )}
                    {row.release_status === "pending" && (
                      <Button
                        size="sm"
                        className="h-7 text-[11px] gap-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={busyId === row.participant_id}
                        onClick={() => handleRelease(row)}
                        title={row.blockers?.length ? row.blockers.join(", ") : "Release to employee"}
                      >
                        {busyId === row.participant_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Release
                      </Button>
                    )}
                  </div>
                </div>
                {row.blockers?.length > 0 && row.release_status === "pending" && (
                  <p className="text-[10px] text-amber-600 mt-2">Waiting on: {row.blockers.join(" · ")}</p>
                )}
                {row.adjustment_reason && (
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    Calibration: {row.manager_rating} → {row.calibrated_rating} — {row.adjustment_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showSettings && (
        <CycleSettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          cycle={cycle}
          clientId={user?.client_id || user?.data?.client_id}
          onSaved={onRefresh}
        />
      )}

      {conversationRow && (
        <RecordConversationDialog
          open={!!conversationRow}
          onClose={() => setConversationRow(null)}
          cycle={cycle}
          row={conversationRow}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}