import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Lock, Plus, Settings2 } from "lucide-react";

/**
 * ReviewSetupView — the "Set up" stage. Shows the rules the cycle is running
 * under and, for people allowed to configure cycles, the door into the cycle
 * settings dialog. Without a cycle it is the create-a-cycle entry point.
 */
export default function ReviewSetupView({ cycle, canConfigure, onEdit, onCreate }) {
  if (!cycle) {
    return (
      <div className="text-center py-14 border border-dashed border-gray-200 rounded-2xl bg-white">
        <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">No review cycles yet</p>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          {canConfigure
            ? "Create a cycle to set the period, reviewers, and how outcomes are released."
            : "Your next review will appear here when it opens."}
        </p>
        {canConfigure && (
          <Button
            onClick={onCreate}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Create review cycle
          </Button>
        )}
      </div>
    );
  }

  const cfg = cycle.config || {};
  const reviewType = { self_review: "Self review", peer_review: "Peer review", "360": "360 review" };
  const rows = [
    ["Review type", reviewType[cfg.review_type] || "Self review"],
    ["Cycle length", cfg.cycle_length ? String(cfg.cycle_length).replace(/_/g, " ") : "annual"],
    ["Review period", cfg.period_start ? `${cfg.period_start} to ${cfg.period_end}` : "Not set"],
    ["Self assessment due", cfg.self_assessment_due || "Not set"],
    ["Manager review due", cfg.manager_review_due || "Not set"],
    [
      "Outcome released",
      cfg.release_policy === "after_manager" ? "After manager review" : "After calibration",
    ],
    [
      "Peer feedback",
      cfg.peer_enabled
        ? cfg.peer_attribution === "named"
          ? "Included, attributed"
          : "Included, anonymous"
        : "Not included",
    ],
    ["Conversation", cfg.require_conversation === false ? "Optional" : "Required before release"],
    ["Retention hold", cfg.legal_hold ? "In place" : "None"],
  ];

  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#0202ff]" />
            <p className="text-sm font-semibold text-gray-900">Cycle rules</p>
            {cfg.has_snapshot && (
              <Badge
                variant="outline"
                className="text-[10px] border-blue-200 text-blue-700 bg-blue-50 gap-1"
              >
                <Lock className="w-2.5 h-2.5" /> Locked at launch
              </Badge>
            )}
          </div>
          {canConfigure && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={onEdit}
            >
              <Settings2 className="w-3.5 h-3.5" />
              {cfg.has_snapshot ? "Reassignment rules" : "Edit rules"}
            </Button>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 border-b border-gray-50 pb-1.5">
              <dt className="text-[11px] text-gray-500">{label}</dt>
              <dd className="text-xs text-gray-800 text-right">{value}</dd>
            </div>
          ))}
        </dl>

        {!canConfigure && (
          <p className="text-[11px] text-gray-500">
            Only HR Admins and above can change the rules of a cycle.
          </p>
        )}
      </CardContent>
    </Card>
  );
}