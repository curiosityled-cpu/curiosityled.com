import React from "react";
import { Check, Lock } from "lucide-react";
import { REVIEW_STAGE_MAP, canActOnStage } from "./reviewStageConfig";

/**
 * ReviewStageRail — the cycle stepper, in the same shape as the Succession
 * stage rail: vertical on desktop, a horizontal scroller on mobile.
 *
 * Stages arrive from buildCycleStages() with a `state` of done / current /
 * upcoming, a short detail line, and whether the stage is admin-only.
 */
export default function ReviewStageRail({
  stages = [],
  activeStage = null,
  onSelect,
  role,
  horizontal = false,
}) {
  if (!stages.length) return null;

  if (horizontal) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 lg:hidden">
        {stages.map((stage) => {
          const conf = REVIEW_STAGE_MAP[stage.id];
          const Icon = conf?.icon;
          const isActive = activeStage === stage.id;
          const canAct = canActOnStage(stage.id, role);

          return (
            <button
              key={stage.id}
              onClick={() => onSelect?.(stage.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive
                  ? "bg-[#0202ff] text-white border-[#0202ff]"
                  : stage.state === "current"
                  ? "bg-blue-50 text-[#0202ff] border-blue-200"
                  : stage.state === "done"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white text-gray-500 border-gray-200"
              } ${canAct ? "" : "opacity-60"}`}
            >
              {stage.state === "done" ? (
                <Check className="w-3 h-3 flex-shrink-0" />
              ) : (
                Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {stage.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav aria-label="Review cycle stages" className="space-y-1">
      {stages.map((stage) => {
        const conf = REVIEW_STAGE_MAP[stage.id];
        const Icon = conf?.icon;
        const isActive = activeStage === stage.id;
        const isComplete = stage.state === "done";
        const isCurrent = stage.state === "current";
        const canAct = canActOnStage(stage.id, role);

        return (
          <button
            key={stage.id}
            onClick={() => onSelect?.(stage.id)}
            className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
              isActive
                ? "bg-[#0202ff]/5 border border-[#0202ff]/20"
                : "border border-transparent hover:bg-gray-50"
            }`}
          >
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                isComplete
                  ? "bg-green-100 text-green-600"
                  : isCurrent
                  ? "bg-[#0202ff] text-white"
                  : "bg-gray-50 text-gray-400 border border-gray-200"
              }`}
            >
              {isComplete ? (
                <Check className="w-4 h-4" />
              ) : !canAct ? (
                <Lock className="w-3 h-3" />
              ) : (
                Icon && <Icon className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-[#0202ff]"
                      : isCurrent
                      ? "text-gray-900"
                      : canAct
                      ? "text-gray-600"
                      : "text-gray-400"
                  }`}
                >
                  {stage.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-medium text-[#0202ff] bg-[#0202ff]/10 px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                {stage.detail || conf?.short}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}