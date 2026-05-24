import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Telescope, 
  UserPlus, 
  Sparkles, 
  TrendingUp, 
  Repeat2, 
  DoorOpen,
  ChevronRight,
  ArrowUpRight,
  MoveRight,
  Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Stage support status labels
const SUPPORT_STATUS = {
  attraction: "Directional",
  onboarding: "Directional",
  development: "Supported today",
  performance: "Supported today",
  transition: "Directional",
  retention: "Directional",
  separation: "Coming soon",
};

const SUPPORT_STATUS_STYLE = {
  "Supported today": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Directional":     "bg-amber-50 text-amber-700 border-amber-200",
  "Coming soon":     "bg-slate-50 text-slate-500 border-slate-200",
};

const STAGES = [
  {
    id: "attraction",
    label: "Attract & Hire",
    icon: Telescope,
    color: "from-violet-500 to-purple-600",
    lightColor: "bg-violet-50 border-violet-200 text-violet-700",
    activeBg: "bg-violet-600",
    dot: "bg-violet-500",
    description: "Early pipeline & leadership signals"
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: UserPlus,
    color: "from-blue-500 to-indigo-600",
    lightColor: "bg-blue-50 border-blue-200 text-blue-700",
    activeBg: "bg-blue-600",
    dot: "bg-blue-500",
    description: "90-day integration & early signals"
  },
  {
    id: "development",
    label: "Develop",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
    lightColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeBg: "bg-emerald-600",
    dot: "bg-emerald-500",
    description: "Growth, coaching & capability building"
  },
  {
    id: "performance",
    label: "Perform",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-600",
    lightColor: "bg-amber-50 border-amber-200 text-amber-700",
    activeBg: "bg-amber-600",
    dot: "bg-amber-500",
    description: "Execution, goals & manager effectiveness"
  },
  {
    id: "transition",
    label: "Mobility & Succession",
    icon: Repeat2,
    color: "from-purple-500 to-indigo-600",
    lightColor: "bg-purple-50 border-purple-200 text-purple-700",
    activeBg: "bg-purple-600",
    dot: "bg-purple-500",
    description: "Promotion, movement & readiness decisions"
  },
  {
    id: "retention",
    label: "Retain",
    icon: MoveRight,
    color: "from-rose-500 to-pink-600",
    lightColor: "bg-rose-50 border-rose-200 text-rose-700",
    activeBg: "bg-rose-600",
    dot: "bg-rose-500",
    description: "Flight risk, engagement & loyalty"
  },
  {
    id: "separation",
    label: "Separation",
    icon: DoorOpen,
    color: "from-slate-500 to-gray-600",
    lightColor: "bg-slate-50 border-slate-200 text-slate-700",
    activeBg: "bg-slate-600",
    dot: "bg-slate-500",
    description: "Exit intelligence & alumni strategy"
  }
];

// Mobility & Succession sub-chips
const MOBILITY_CHIPS = [
  { id: "promotion_ready", label: "Promotion Ready", icon: ArrowUpRight, color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "lateral_move",    label: "Lateral Move",    icon: MoveRight,    color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { id: "high_potential",  label: "High Potential",  icon: Star,         color: "bg-amber-100 text-amber-800 border-amber-200" },
];

export { STAGES, MOBILITY_CHIPS };

export default function TalentCareLifecycleBar({ activeStage, onStageChange, activeMobilityChip, onMobilityChipChange }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Leadership Lifecycle</h3>
          <p className="text-xs text-gray-500 mt-0.5">Select a stage to re-prioritise the intelligence view. Executive Pulse stays fixed.</p>
        </div>
        {activeStage && (
          <button
            onClick={() => { onStageChange(null); onMobilityChipChange?.(null); }}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md px-2 py-1 transition-colors"
          >
            View All Stages
          </button>
        )}
      </div>

      {/* Stage Pipeline */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            const supportStatus = SUPPORT_STATUS[stage.id];

            return (
              <React.Fragment key={stage.id}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onStageChange(isActive ? null : stage.id); onMobilityChipChange?.(null); }}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all cursor-pointer min-w-[100px] ${
                    isActive
                      ? `border-transparent bg-gradient-to-br ${stage.color} text-white shadow-md`
                      : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white text-gray-600"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? "bg-white/20" : "bg-white border border-gray-200"
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-semibold leading-tight ${isActive ? "text-white" : "text-gray-700"}`}>
                      {stage.label}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${isActive ? "text-white/80" : "text-gray-400"}`}>
                      {stage.description}
                    </div>
                    {!isActive && (
                      <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded border font-medium ${SUPPORT_STATUS_STYLE[supportStatus]}`}>
                        {supportStatus}
                      </span>
                    )}
                  </div>
                </motion.button>

                {index < STAGES.length - 1 && (
                  <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-300" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobility & Succession sub-chips */}
      <AnimatePresence>
        {activeStage === "transition" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-purple-100"
          >
            <div className="px-6 py-3 bg-purple-50 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-purple-600 font-medium">Refine view:</span>
              {MOBILITY_CHIPS.map(chip => {
                const ChipIcon = chip.icon;
                const isChipActive = activeMobilityChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => onMobilityChipChange?.(isChipActive ? null : chip.id)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                      isChipActive
                        ? chip.color + " ring-1 ring-offset-1 ring-purple-400"
                        : "bg-white border-gray-200 text-gray-600 hover:border-purple-300"
                    }`}
                  >
                    <ChipIcon className="w-3 h-3" />
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}