import React from "react";
import { ChevronRight, Sparkles } from "lucide-react";

/**
 * GuidedNextSteps — the shared "What to do next" panel. The caller decides
 * which actions apply (each workspace computes them from its own data); the
 * panel only numbers them and renders the deep links.
 */
export default function GuidedNextSteps({ actions = [], onAction, title = "What to do next" }) {
  if (!actions.length) return null;

  return (
    <div className="border border-[#0202ff]/15 rounded-lg bg-[#0202ff]/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#0202ff]/10 bg-[#0202ff]/[0.02]">
        <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {actions.map((action, i) => (
          <button
            key={`${action.viewKey || action.stageKey || "action"}-${i}`}
            onClick={() => onAction?.(action)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0202ff]/10 flex items-center justify-center text-[11px] font-semibold text-[#0202ff]">
              {i + 1}
            </div>
            <span className="text-sm text-gray-700 flex-1">{action.label}</span>
            {action.hint && (
              <span className="text-[10px] text-gray-400 hidden sm:inline">{action.hint}</span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0202ff] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}