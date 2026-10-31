import React from "react";
import { Lock } from "lucide-react";

const STATE_LABEL = { done: "Complete", current: "In progress", upcoming: "Not started" };

const STATE_CLASS = {
  done: "border-green-200 bg-green-50 text-green-700",
  current: "border-blue-200 bg-blue-50 text-[#0202ff]",
  upcoming: "border-gray-200 bg-gray-50 text-gray-500",
};

/**
 * ReviewStageHeader — the title bar for the stage being looked at: what the
 * stage is for, where the cycle stands in it, and who can act on it.
 */
export default function ReviewStageHeader({ stage, readOnly }) {
  if (!stage) return null;
  const Icon = stage.icon;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 bg-gray-50">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#0202ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">{stage.label}</h2>
            <span
              className={`text-[10px] font-medium border px-1.5 py-0.5 rounded ${
                STATE_CLASS[stage.state] || STATE_CLASS.upcoming
              }`}
            >
              {STATE_LABEL[stage.state] || "Not started"}
            </span>
            {stage.adminOnly && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                <Lock className="w-2.5 h-2.5" />
                {readOnly ? "Read-only" : "HR Admin"}
              </span>
            )}
          </div>

          {stage.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{stage.description}</p>
          )}

          {stage.percent != null ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-40 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0202ff]"
                  style={{ width: `${stage.percent}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500">{stage.detail}</span>
            </div>
          ) : (
            stage.detail && <p className="text-[11px] text-gray-400 mt-1">{stage.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}