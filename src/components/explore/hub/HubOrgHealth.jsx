import React from "react";
import {
  Shield,
  AlertTriangle,
  Zap,
  Info,
  ChevronRight,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { HUB_HEALTH } from "@/lib/exploreHubContent";

export default function HubOrgHealth() {
  const h = HUB_HEALTH;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Shield className="w-4 h-4 text-[#0202ff] mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{h.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{h.subtitle}</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex-shrink-0">
          {h.badge}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* ME Index */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3.5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{h.meIndex.label}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  {h.meIndex.status}
                </span>
                <Info className="w-3 h-3 text-gray-400" />
              </div>
              <p className="text-3xl font-extrabold text-purple-700 mt-1 leading-none">{h.meIndex.value}</p>
              <p className="text-[11px] text-gray-600 mt-1.5">{h.meIndex.description}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-600">
                Decision Quality: <span className="font-semibold text-gray-900">{h.meIndex.decisionQuality}</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{h.meIndex.assessed}</p>
              <p className="text-[10px] text-gray-400 mt-1">{h.meIndex.distribution}</p>
            </div>
          </div>
        </div>

        {/* Sub-metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-gray-200 px-3.5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-semibold text-gray-900">Risk Signals</p>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
            </div>
            <div className="flex items-end gap-4">
              {h.riskSignals.map((r) => (
                <div key={r.label}>
                  <p className="text-base font-bold text-gray-900 leading-none">{r.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 px-3.5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-[#0202ff]" />
              <p className="text-xs font-semibold text-gray-900">Learning Velocity</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                {h.learningVelocity.status}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
            </div>
            <div className="flex items-end gap-4">
              {h.learningVelocity.stats.map((s) => (
                <div key={s.label}>
                  <p className="text-base font-bold text-gray-900 leading-none">{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-gray-900">Competency Dimensions</p>
            <p className="text-[10px] text-gray-400">{h.dimensionsNote}</p>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Directional
            </span>
          </div>

          <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5">
            <Sparkles className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-700 leading-relaxed">{h.insight}</p>
          </div>

          <div className="mt-3 space-y-2.5">
            {h.dimensions.map((d) => (
              <div key={d.label}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-gray-800 truncate">{d.label}</span>
                  {d.primary && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
                      Primary driver
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-bold text-gray-900 flex-shrink-0">{d.score}%</span>
                  <span className="text-[10px] text-red-500 flex-shrink-0">{d.delta}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.score}%`,
                      backgroundColor: d.primary ? "#0202ff" : "#a5b4fc",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0202ff]">
            View all 6 dimensions
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}