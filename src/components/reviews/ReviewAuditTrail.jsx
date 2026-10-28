import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, History } from "lucide-react";

const LABELS = {
  cycle_created: "Cycle created",
  cycle_configured: "Configuration changed",
  cycle_launched: "Cycle launched",
  cycle_closed: "Cycle closed",
  participant_added: "Roster updated",
  participant_removed: "Participant removed",
  reviewer_reassigned: "Reviewer reassigned",
  task_draft_saved: "Draft saved",
  task_submitted: "Review submitted",
  task_amended: "Review amended",
  calibration_started: "Calibration started",
  calibration_adjusted: "Rating adjusted",
  calibration_finalized: "Calibration finalized",
  conversation_recorded: "Conversation recorded",
  review_released: "Review released",
  review_acknowledged: "Review acknowledged",
  employee_responded: "Employee responded",
  legal_hold_set: "Retention hold set",
  legal_hold_cleared: "Retention hold cleared",
  export_generated: "Export generated",
};

function downloadCsv(events) {
  const header = ["occurred_at", "event_type", "actor_email", "actor_role", "subject_email", "reason"];
  const rows = events.map((e) =>
    header
      .map((k) => `"${String(e[k] ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `review-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReviewAuditTrail({ events = [] }) {
  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0202ff]" />
            <p className="text-sm font-semibold text-gray-900">Cycle history</p>
            <Badge variant="outline" className="text-[10px]">{events.length}</Badge>
          </div>
          {events.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={() => downloadCsv(events)}
            >
              <Download className="w-3 h-3" /> Export
            </Button>
          )}
        </div>
        <p className="text-[11px] text-gray-500">
          Append-only record of every consequential action in this cycle. Entries cannot be edited or
          removed.
        </p>

        {events.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="py-2 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0202ff] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800">
                    {LABELS[event.event_type] || event.event_type}
                    {event.subject_email && event.subject_email !== event.actor_email && (
                      <span className="font-normal text-gray-500"> — {event.subject_email}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {event.actor_email || "system"} ·{" "}
                    {event.occurred_at ? new Date(event.occurred_at).toLocaleString() : ""}
                  </p>
                  {event.reason && (
                    <p className="text-[11px] text-gray-600 mt-0.5">{event.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}