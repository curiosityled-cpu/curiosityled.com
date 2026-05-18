import React from "react";
import { Megaphone, UserPlus, Sparkles, TrendingUp, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STAGES = [
  {
    id: "attraction",
    label: "Attraction",
    description: "Brand perception & pipeline quality",
    icon: Megaphone,
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
      <CardContent className="py-5 px-6">
        <div className="mb-4">
          <p className="text-base font-semibold text-gray-900">Leadership Lifecycle</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Select a lifecycle stage to{" "}
            <span className="text-amber-600 font-medium">filter</span>{" "}
            the intelligence view
          </p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = selectedStage === stage.id;
            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => onStageChange(isActive ? null : stage.id)}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all min-w-[140px] flex-shrink-0 ${
                    isActive
                      ? "border-[#0202ff] bg-indigo-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${isActive ? "text-[#0202ff]" : "text-gray-400"}`}
                  />
                  <p className={`text-sm font-medium ${isActive ? "text-[#0202ff]" : "text-gray-800"}`}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{stage.description}</p>
                </button>
                {index < STAGES.length - 1 && (
                  <div className="flex items-center flex-shrink-0">
                    <div className="w-4 h-px bg-gray-300" />
                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[5px] border-l-gray-300" />
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