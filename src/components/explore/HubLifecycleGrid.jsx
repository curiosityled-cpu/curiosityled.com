import React from "react";
import {
  Magnet,
  UserPlus,
  Sparkles,
  TrendingUp,
  Layers,
  Heart,
  LogOut,
  LayoutGrid,
  Check,
  Minus,
} from "lucide-react";

const ICONS = {
  magnet: Magnet,
  userplus: UserPlus,
  sparkles: Sparkles,
  trending: TrendingUp,
  layers: Layers,
  heart: Heart,
  logout: LogOut,
};

export default function HubLifecycleGrid({ stages, selected, onSelect }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">Leadership Lifecycle</p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        Select a stage to re-prioritise the intelligence view. Executive Pulse stays fixed.
      </p>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {stages.map((stage) => {
          const Icon = ICONS[stage.icon] || Layers;
          const active = selected === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => onSelect(active ? null : stage.id)}
              className={`relative text-left rounded-xl border px-3 py-3 transition-colors ${
                active
                  ? "border-[#0202ff] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="absolute top-2.5 right-2.5">
                {stage.status === "healthy" ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-1 py-0.5 text-emerald-600 border border-emerald-100">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-1 py-0.5 text-amber-600 border border-amber-100">
                    <Minus className="w-2.5 h-2.5" />
                  </span>
                )}
              </span>

              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  active ? "bg-[#0202ff] text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                <Icon className="w-4 h-4" />
              </span>
              <p className={`mt-2 text-[12px] font-semibold leading-snug ${active ? "text-[#0202ff]" : "text-gray-800"}`}>
                {stage.label}
              </p>
            </button>
          );
        })}

        <button
          onClick={() => onSelect(null)}
          className="relative text-left rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 hover:border-gray-400"
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500">
            <LayoutGrid className="w-4 h-4" />
          </span>
          <p className="mt-2 text-[12px] font-semibold leading-snug text-gray-700">View All Stages</p>
        </button>
      </div>
    </div>
  );
}