import React from "react";
import { motion } from "framer-motion";
import { 
  Telescope, 
  UserPlus, 
  Sparkles, 
  TrendingUp, 
  Repeat2, 
  DoorOpen,
  ChevronRight
} from "lucide-react";

const STAGES = [
  {
    id: "attraction",
    label: "Attraction",
    icon: Telescope,
    color: "from-violet-500 to-purple-600",
    lightColor: "bg-violet-50 border-violet-200 text-violet-700",
    activeBg: "bg-violet-600",
    dot: "bg-violet-500",
    description: "Brand perception & pipeline quality"
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
    label: "Development",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
    lightColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeBg: "bg-emerald-600",
    dot: "bg-emerald-500",
    description: "Growth, coaching & capability building"
  },
  {
    id: "performance",
    label: "Performance",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-600",
    lightColor: "bg-amber-50 border-amber-200 text-amber-700",
    activeBg: "bg-amber-600",
    dot: "bg-amber-500",
    description: "Execution, goals & manager effectiveness"
  },
  {
    id: "retention",
    label: "Retention",
    icon: Repeat2,
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

export { STAGES };

export default function TalentCareLifecycleBar({ activeStage, onStageChange }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Associate-Centered Talent Care Model</h3>
          <p className="text-xs text-gray-500 mt-0.5">Select a lifecycle stage to filter the intelligence view</p>
        </div>
        {activeStage && (
          <button
            onClick={() => onStageChange(null)}
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

            return (
              <React.Fragment key={stage.id}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onStageChange(isActive ? null : stage.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer min-w-[110px] ${
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
                    <div className={`text-xs font-semibold ${isActive ? "text-white" : "text-gray-700"}`}>
                      {stage.label}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${isActive ? "text-white/80" : "text-gray-400"}`}>
                      {stage.description}
                    </div>
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
    </div>
  );
}