import React from "react";
import { Telescope, UserPlus, Sparkles, TrendingUp, Repeat2, MoveRight, DoorOpen } from "lucide-react";
import { HUB_LIFECYCLE } from "@/lib/exploreHubContent";

const ICONS = [Telescope, UserPlus, Sparkles, TrendingUp, Repeat2, MoveRight, DoorOpen];

const STATUS = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  watch: "bg-amber-50 text-amber-700 border-amber-200",
  soon: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUS_LABEL = { ok: "✓", watch: "~", soon: "Soon" };

export default function HubLifecycle({ activeStage, onStageChange }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Leadership Lifecycle</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Select a stage to re-prioritise the intelligence view.{" "}
          <span className="text-gray-400">Executive Pulse stays fixed.</span>
        </p>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {HUB_LIFECYCLE.map((stage, i) => {
            const Icon = ICONS[i];
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => onStageChange(isActive ? null : stage.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? "border-transparent bg-[#0202ff] text-white shadow-md"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white text-gray-700"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-white/20" : "bg-white border border-gray-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold leading-tight truncate ${isActive ? "text-white" : "text-gray-800"}`}>
                    {stage.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 leading-tight ${isActive ? "text-white/80" : "text-gray-400"} truncate`}>
                    {stage.description}
                  </div>
                </div>
                {!isActive && (
                  <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${STATUS[stage.status]}`}>
                    {STATUS_LABEL[stage.status]}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => onStageChange(null)}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white transition-all text-left text-gray-700"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white border border-gray-200">
              <span className="text-xs font-bold text-gray-500">↺</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold leading-tight truncate text-gray-800">View All Stages</div>
            </div>
          </button>
        </div>
      </div>

      {activeStage && (
        <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500">Filtering by lifecycle stage:</span>
          <span className="text-[11px] font-semibold text-[#0202ff]">
            {HUB_LIFECYCLE.find((s) => s.id === activeStage)?.label}
          </span>
          <button onClick={() => onStageChange(null)} className="text-[11px] text-gray-400 hover:text-gray-600 underline">
            Clear
          </button>
          <span className="text-[11px] text-gray-400 ml-auto hidden sm:inline">
            Stage views include partial signals — treat as directional.
          </span>
        </div>
      )}
    </div>
  );
}