import React from "react";
import { TrendingDown, Heart } from "lucide-react";
import { HUB_WORKFORCE } from "@/lib/exploreHubContent";

export default function HubWorkforceLens() {
  const w = HUB_WORKFORCE;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          <p className="text-sm font-semibold text-gray-900">Workforce Stability &amp; Retention</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {w.stability.map((s) => (
            <div key={s.label}>
              <p className="text-xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs font-medium text-gray-700 mt-1">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          <p className="text-sm font-semibold text-gray-900">Engagement &amp; Culture</p>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {w.engagement.map((s) => (
            <div key={s.label}>
              <p className="text-xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs font-medium text-gray-700 mt-1">{s.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">{w.note}</p>
      </div>
    </div>
  );
}