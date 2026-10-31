import React from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { STAGE_ORDER } from "./stageConfig";

/**
 * StageRail — the 9-stage stepper that replaces the flat pill nav.
 *
 * Vertical on desktop (left side), horizontal scroller on mobile.
 * Reads the cycle's current process_stage to render completed/current/locked.
 * Stages not in the user's role are rendered muted (read-only).
 */
export default function StageRail({
  stages,
  currentStage,
  activeStage,
  onSelect,
  role,
  horizontal = false,
}) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  if (horizontal) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 lg:hidden">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.key;
          const isComplete = currentIdx >= 0 && i < currentIdx;
          const isCurrent = stage.key === currentStage;
          const canAct = !role || stage.roles.includes(role) || role === "admin";

          return (
            <button
              key={stage.key}
              onClick={() => onSelect(stage.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive
                  ? "bg-[#0202ff] text-white border-[#0202ff]"
                  : isCurrent
                  ? "bg-blue-50 text-[#0202ff] border-blue-200"
                  : isComplete
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white text-gray-500 border-gray-200"
              } ${!canAct ? "opacity-50" : ""}`}
            >
              {isComplete && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {stage.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav aria-label="Succession stages" className="space-y-1">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const isActive = activeStage === stage.key;
        const isComplete = currentIdx >= 0 && i < currentIdx;
        const isCurrent = stage.key === currentStage;
        const isLocked = currentIdx >= 0 && i > currentIdx && !isCurrent;
        const canAct = !role || stage.roles.includes(role) || role === "admin";

        return (
          <button
            key={stage.key}
            onClick={() => onSelect(stage.key)}
            className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors group ${
              isActive
                ? "bg-[#0202ff]/5 border border-[#0202ff]/20"
                : "border border-transparent hover:bg-gray-50"
            }`}
          >
            {/* Status indicator */}
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                isComplete
                  ? "bg-green-100 text-green-600"
                  : isCurrent
                  ? "bg-[#0202ff] text-white"
                  : isLocked
                  ? "bg-gray-100 text-gray-400"
                  : "bg-gray-50 text-gray-400 border border-gray-200"
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isLocked ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
            </div>

            {/* Label + short */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-[#0202ff]"
                      : isCurrent
                      ? "text-gray-900"
                      : isLocked
                      ? "text-gray-400"
                      : "text-gray-600"
                  }`}
                >
                  {stage.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-medium text-[#0202ff] bg-[#0202ff]/10 px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
                {!canAct && (
                  <Lock className="w-3 h-3 text-gray-300" />
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                {stage.short}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}