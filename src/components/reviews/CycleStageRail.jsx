import React from "react";
import { Check, ChevronRight, Lock } from "lucide-react";

/**
 * The cycle's stages, always visible above the work. Each stage is a button:
 * clicking it jumps to the people and actions sitting at that stage.
 */
export default function CycleStageRail({ stages = [], activeStage = null, onSelect }) {
  if (!stages.length) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {stages.map((stage, index) => {
          const selected = activeStage === stage.id;
          const circle =
            stage.state === "done"
              ? "bg-green-500 text-white"
              : stage.state === "current"
              ? "bg-[#0202ff] text-white"
              : "bg-gray-100 text-gray-400";

          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => onSelect?.(stage)}
                title={stage.hint}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all ${
                  selected
                    ? "bg-[#0202ff]/5 ring-1 ring-[#0202ff]/30"
                    : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${circle}`}
                >
                  {stage.state === "done" ? <Check className="w-3 h-3" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[11px] font-semibold whitespace-nowrap ${
                      selected || stage.state === "current" ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 whitespace-nowrap">
                    {stage.adminOnly && <Lock className="w-2.5 h-2.5" />}
                    {stage.detail}
                  </span>
                </span>
              </button>
              {index < stages.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}