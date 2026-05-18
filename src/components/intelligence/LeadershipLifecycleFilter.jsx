import React from "react";
import { motion } from "framer-motion";
import { Magnet, UserPlus, Sparkles, TrendingUp, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STAGES = [
  {
    id: "attraction",
    label: "Attraction",
    description: "Brand perception & pipeline quality",
    icon: Magnet,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    description: "90-day integration & early signals",
    icon: UserPlus,
  },
  {
    id: "development",
    label: "Development",
    description: "Growth, coaching & capability building",
    icon: Sparkles,
  },
  {
    id: "performance",
    label: "Performance",
    description: "Execution, goals & manager effectiveness",
    icon: TrendingUp,
  },
  {
    id: "retention",
    label: "Retention",
    description: "Flight risk, engagement & loyalty",
    icon: Heart,
  },
];

export default function LeadershipLifecycleFilter({ selectedStage, onStageChange }) {
  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl">
      <CardContent className="px-6 py-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Leadership Lifecycle</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Select a lifecycle stage to{" "}
            <span className="text-[#0202ff] font-medium">filter the intelligence view</span>
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isSelected = selectedStage === stage.id;

            return (
              <React.Fragment key={stage.id}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onStageChange(isSelected ? null : stage.id)}
                  className={`flex-shrink-0 flex flex-col items-center text-center px-5 py-4 rounded-xl border-2 transition-all cursor-pointer min-w-[140px] ${
                    isSelected
                      ? "border-[#0202ff] bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                      isSelected ? "bg-[#0202ff]" : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-500"}`}
                    />
                  </div>
                  <p
                    className={`text-xs font-semibold mb-1 ${
                      isSelected ? "text-[#0202ff]" : "text-gray-800"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">{stage.description}</p>
                </motion.button>

                {index < STAGES.length - 1 && (
                  <div className="flex items-center flex-shrink-0 text-gray-300">
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                      <path d="M1 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}