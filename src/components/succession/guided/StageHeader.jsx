import React from "react";
import { Lock } from "lucide-react";
import StageAssist from "./StageAssist";

/**
 * StageHeader — the title bar for the current stage. Shows the stage name,
 * description, a read-only badge when the user can't act on this stage,
 * and the inline ✨ AI Assist button.
 */
export default function StageHeader({ stage, readOnly, context }) {
  if (!stage) return null;
  const Icon = stage.icon;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#0202ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{stage.label}</h2>
            {readOnly && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                <Lock className="w-2.5 h-2.5" />
                Read-only
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{stage.description}</p>
        </div>
      </div>
      <div className="px-4 py-3">
        <StageAssist stageKey={stage.key} context={context} />
      </div>
    </div>
  );
}