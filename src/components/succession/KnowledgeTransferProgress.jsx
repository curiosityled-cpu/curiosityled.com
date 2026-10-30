import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuccessionApi } from "@/components/succession/useSuccessionApi";
import { Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const STATUS_STYLES = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  waived: "bg-amber-100 text-amber-800",
};

const STATUS_LABELS = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  waived: "Waived",
};

/**
 * KnowledgeTransferProgress — execution controls for a saved knowledge transfer
 * plan. Each area moves through its own status on the server, with a reason
 * captured for any waiver, so the hand-over has a record rather than a tick box.
 *
 * The plan can only be closed once every area is completed or waived; that rule
 * lives on the server and is enforced when the transition is completed.
 */
export default function KnowledgeTransferProgress({ plan, canEdit, onChange }) {
  const { invoke, loading, error } = useSuccessionApi();
  const [waiverFor, setWaiverFor] = useState(null);
  const [waiverReason, setWaiverReason] = useState("");

  if (!plan) {
    return (
      <p className="text-sm text-gray-500">
        Save a knowledge transfer plan first — its areas can then be tracked as they are handed over.
      </p>
    );
  }

  const areas = plan.knowledge_areas || [];
  const closed = areas.filter((a) => a.status === "completed" || a.status === "waived").length;
  const pct = areas.length ? Math.round((closed / areas.length) * 100) : 0;
  const openCount = areas.length - closed;

  const setStatus = async (index, area, status) => {
    if (status === "waived" && waiverFor !== index && !waiverReason.trim()) {
      setWaiverFor(index);
      return;
    }
    try {
      const result = await invoke("successionUpdateKnowledgeTransferArea", {
        operation_id: `kt-area-${plan.id}-${index}-${status}-${Date.now()}`,
        plan_id: plan.id,
        area_index: index,
        expected_title: area.title || null,
        status,
        waiver_reason: status === "waived" ? waiverReason.trim() : null,
      });
      if (result) {
        setWaiverFor(null);
        setWaiverReason("");
        onChange?.();
      }
    } catch {
      // error is surfaced by the shared hook
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Hand-over progress</Label>
        <span className="text-xs text-gray-500">
          {closed} of {areas.length} closed
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0202ff] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {openCount > 0 ? (
        <p className="text-xs text-gray-600 flex items-start gap-1.5">
          <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
          {openCount} area{openCount === 1 ? "" : "s"} still open — the transition cannot be completed until each is finished or formally waived.
        </p>
      ) : (
        <p className="text-xs text-green-700 flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Every knowledge area is closed. The transition is clear to complete.
        </p>
      )}

      <div className="space-y-2">
        {areas.map((area, index) => (
          <div key={`${area.title}-${index}`} className="p-3 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{area.title || "(untitled area)"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {area.transfer_method || "method not stated"}
                  {area.target_date ? ` · due ${area.target_date}` : ""}
                </p>
              </div>
              <Badge className={STATUS_STYLES[area.status] || STATUS_STYLES.not_started}>
                {STATUS_LABELS[area.status] || area.status}
              </Badge>
            </div>

            {area.status === "waived" && area.waiver_reason && (
              <p className="text-xs text-amber-800 mt-1.5 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Waived: {area.waiver_reason}
              </p>
            )}

            {canEdit && (
              <div className="mt-2">
                {waiverFor === index ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      aria-label={`Waiver reason for ${area.title || "area"}`}
                      placeholder="Why is this area being waived? (required)"
                      value={waiverReason}
                      onChange={(e) => setWaiverReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading || !waiverReason.trim()}
                        onClick={() => setStatus(index, area, "waived")}
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm waiver"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setWaiverFor(null); setWaiverReason(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <select
                    aria-label={`Status for ${area.title || "area"}`}
                    value={area.status || "not_started"}
                    disabled={loading}
                    onChange={(e) => setStatus(index, area, e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="waived">Waived…</option>
                  </select>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}