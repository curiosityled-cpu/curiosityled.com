import React from "react";
import { Sparkles, TrendingUp, Building2, Plus } from "lucide-react";

const STEPS = [
  {
    name: "Essentials",
    icon: Sparkles,
    adds: ["Atreus – AI Manager Companion", "Nudges & check-ins", "Goals, KPIs & OKRs", "Reporting & analytics", "LMS"],
    depth: 1,
  },
  {
    name: "Growth",
    icon: TrendingUp,
    adds: ["Assessments", "Leadership Index", "Performance reviews", "360 feedback", "Skills library"],
    depth: 2,
  },
  {
    name: "Organization",
    icon: Building2,
    adds: ["Competency library", "Succession plans", "Career paths"],
    depth: 3,
  },
];

export default function TierLadder() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-8 rounded-[2rem] pointer-events-none"
        style={{ background: "radial-gradient(circle at 60% 30%, rgba(2,2,255,0.10), transparent 65%)" }}
      />
      <div className="relative space-y-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const active = index === 1;
          return (
            <div
              key={step.name}
              className={`rounded-xl border bg-white p-4 shadow-sm transition-all ${active ? "border-[#0202ff] shadow-lg" : "border-gray-200"}`}
              style={{ marginLeft: `${index * 16}px` }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <Icon className="w-4 h-4" style={{ color: "#0202ff" }} />
                <p className="text-sm font-bold text-gray-900">{step.name}</p>
                {index > 0 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> adds
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step.adds.map((chip) => (
                  <span
                    key={chip}
                    className="text-[10.5px] font-medium px-2 py-1 rounded-full"
                    style={{ backgroundColor: index === 2 ? "#0202ff" : "#eef2ff", color: index === 2 ? "#ffffff" : "#1f2937" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}