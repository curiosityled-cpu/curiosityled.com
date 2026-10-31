import React from "react";
import { Lock } from "lucide-react";

/**
 * ReviewStageHeader — the title bar for the stage or view in focus, in the
 * same shape as the Succession stage header: icon, name, description, a
 * read-only badge when the person cannot act here, and the stage's current
 * detail with a progress bar where one is meaningful.
 */
export default function ReviewStageHeader({ stage, stageState, readOnly, actions }) {
  if (!stage) return null;
  const Icon = stage.icon;
  const showProgress = stageState?.percent != null;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
          {Icon && <Icon className="w-4 h-4 text-[#0202ff]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900">{stage.label}</h2>
            {readOnly && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                <Lock className="w-2.5 h-2.5" />
                Read-only
              </span>
            )}
            {stageState?.state === "current" && (
              <span className="text-[10px] font-medium text-[#0202ff] bg-[#0202ff]/10 px-1.5 py-0.5 rounded">
                Current stage
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{stage.description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {(stageState?.detail || showProgress) && (
        <div className="px-4 py-2.5 flex items-center gap-3">
          {stageState?.detail && (
            <p className="text-[11px] text-gray-500 flex-1">{stageState.detail}</p>
          )}
          {showProgress && (
            <div className="w-32 h-1.5 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
              <div
                className="h-full rounded-full bg-[#0202ff]"
                style={{ width: `${Math.min(100, stageState.percent)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}