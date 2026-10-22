import React from "react";
import { CalendarPlus, ListPlus, PenLine, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS = {
  calendar_event: CalendarPlus,
  create_task: ListPlus,
  draft_communication: PenLine,
};

const HEADINGS = {
  calendar_event: "Add this to your calendar?",
  create_task: "Create this task?",
  draft_communication: "Draft this for you?",
};

export default function ModuleActionCard({ action, busy, onApprove, onDecline }) {
  const Icon = ICONS[action.type] || ListPlus;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {HEADINGS[action.type] || "Carry this out?"}
          </p>
          <p className="text-sm text-gray-700 mt-0.5">{action.summary}</p>
          {action.start_time && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(action.start_time).toLocaleString()}
              {action.duration_minutes ? ` · ${action.duration_minutes} min` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={busy}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1" />
          )}
          Yes, do it
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline} disabled={busy}>
          <X className="w-3.5 h-3.5 mr-1" />
          Not now
        </Button>
      </div>
    </div>
  );
}