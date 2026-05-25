import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Telescope,
  UserPlus,
  Sparkles,
  TrendingUp,
  Repeat2,
  DoorOpen,
  ArrowUpRight,
  MoveRight,
  Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPPORT_STATUS = {
  attraction:  "Directional",
  onboarding:  "Directional",
  development: "Supported today",
  performance: "Supported today",
  transition:  "Directional",
  retention:   "Directional",
  separation:  "Coming soon",
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
    activeBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    activeRing: "ring-violet-300",
    description: "Pipeline & leadership signals",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: UserPlus,
    color: "from-blue-500 to-indigo-600",
    activeBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    activeRing: "ring-blue-300",
    description: "90-day integration",
  },
  {
    id: "development",
    label: "Develop",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    activeRing: "ring-emerald-300",
    description: "Coaching & capability",
  },
  {
    id: "performance",
    label: "Perform",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-600",
    activeBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    activeRing: "ring-amber-300",
    description: "Goals & effectiveness",
  },
  {
    id: "transition",
    label: "Mobility & Succession",
    icon: Repeat2,
    color: "from-purple-500 to-indigo-600",
    activeBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
    activeRing: "ring-purple-300",
    description: "Readiness decisions",
  },
  {
    id: "retention",
    label: "Retain",
    icon: MoveRight,
    color: "from-rose-500 to-pink-600",
    activeBg: "bg-gradient-to-br from-rose-500 to-pink-600",
    activeRing: "ring-rose-300",
    description: "Flight risk & loyalty",
  },
  {
    id: "separation",
    label: "Separation",
    icon: DoorOpen,
    color: "from-slate-500 to-gray-600",
    activeBg: "bg-gradient-to-br from-slate-500 to-gray-600",
    activeRing: "ring-slate-300",
    description: "Exit & continuity",
  },
];

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
      <div className="px-5 py-3.5 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Leadership Lifecycle</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select a stage to re-prioritise the intelligence view.{" "}
            <span className="text-gray-400">Executive Pulse stays fixed.</span>
          </p>
        </div>
      </div>

      {/* Desktop: wrapped 2-row grid — all stages visible at once */}
      <div className="hidden md:block px-5 py-4">
        <div className="grid grid-cols-4 gap-2.5">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            const supportStatus = SUPPORT_STATUS[stage.id];

            const btn = (
              <motion.button
                key={stage.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onStageChange(isActive ? null : stage.id); onMobilityChipChange?.(null); }}
                className={`relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  isActive
                    ? `border-transparent ${stage.activeBg} text-white shadow-md ring-2 ring-offset-1 ${stage.activeRing}`
                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white text-gray-700"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? "bg-white/20" : "bg-white border border-gray-200"
                }`}>
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
                  <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium ${SUPPORT_STATUS_STYLE[supportStatus]}`}>
                    {supportStatus === "Supported today" ? "✓" : supportStatus === "Coming soon" ? "Soon" : "~"}
                  </span>
                )}
              </motion.button>
            );

            // Wrap with tooltip for support status explanation
            const tooltipText = {
              "Supported today": "This stage view is supported by current connected data and available insights.",
              "Directional": "This stage view includes partial or early signals — treat as directional.",
              "Coming soon": "This stage view is not yet supported by enough connected data.",
            }[supportStatus];

            return (
              <TooltipProvider key={stage.id}>
                <Tooltip>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                    <strong>{stage.label}</strong>: {tooltipText}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* View All Stages button styled as a stage card */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { onStageChange(null); onMobilityChipChange?.(null); }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white transition-all cursor-pointer text-left text-gray-700"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white border border-gray-200">
              <span className="text-xs font-bold text-gray-500">↺</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold leading-tight truncate text-gray-800">
                View All Stages
              </div>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mobile: compact horizontal scroll or dropdown */}
      <div className="md:hidden px-4 py-3">
        {/* Mobile dropdown selector */}
        <Select
          value={activeStage || ""}
          onValueChange={(val) => {
            onStageChange(val || null);
            onMobilityChipChange?.(null);
          }}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Select a lifecycle stage…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Stages (no filter)</SelectItem>
            {STAGES.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.label} — {stage.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile: show active stage badge if selected */}
        {activeStage && (() => {
          const s = STAGES.find(s => s.id === activeStage);
          if (!s) return null;
          const Icon = s.icon;
          return (
            <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg ${s.activeBg} text-white text-xs`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{s.label}</span>
              <span className="text-white/70 ml-auto">{SUPPORT_STATUS[s.id]}</span>
            </div>
          );
        })()}
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
            <div className="px-5 py-3 bg-purple-50 flex items-center gap-3 flex-wrap">
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