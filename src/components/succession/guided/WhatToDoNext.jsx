import React from "react";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { STAGE_MAP } from "./stageConfig";

/**
 * WhatToDoNext — a pinned panel that shows the next 1-3 concrete actions with
 * deep-links into the relevant stage/view. The actions are computed by
 * useSuccessionNextSteps so the panel and the current-step action under each
 * stage always agree.
 */
export default function WhatToDoNext({ actions = [], loading = false, onNavigate }) {
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white px-4 py-3 flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Finding your next steps…
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="border border-[#0202ff]/15 rounded-lg bg-[#0202ff]/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#0202ff]/10 bg-[#0202ff]/[0.02]">
        <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          What to do next
        </h3>
      </div>
      <div className="p-3 space-y-1.5">
        {actions.map((action, i) => {
          const stage = STAGE_MAP[action.stageKey];
          return (
            <button
              key={i}
              onClick={() => onNavigate(action.stageKey, action.viewKey)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white transition-colors text-left group"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0202ff]/10 flex items-center justify-center text-[11px] font-semibold text-[#0202ff]">
                {i + 1}
              </div>
              <span className="text-sm text-gray-700 flex-1">{action.label}</span>
              {stage && (
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  {stage.label}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0202ff] flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}