import React from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { HUB_RISKS, HUB_OPPORTUNITIES } from "@/lib/exploreHubContent";

export default function HubRisksOpportunities() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <p className="text-xs font-semibold text-gray-900">Top Risks</p>
        </div>
        <div className="space-y-2">
          {HUB_RISKS.map((r) => (
            <div key={r.title} className="rounded-lg bg-red-50/60 border border-red-100 px-3 py-2">
              <p className="text-[11px] font-semibold text-gray-900">{r.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{r.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <p className="text-xs font-semibold text-gray-900">Top Opportunities</p>
        </div>
        <div className="space-y-2">
          {HUB_OPPORTUNITIES.map((o) => (
            <div key={o.title} className="rounded-lg bg-emerald-50/60 border border-emerald-100 px-3 py-2">
              <p className="text-[11px] font-semibold text-gray-900">{o.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">{o.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}