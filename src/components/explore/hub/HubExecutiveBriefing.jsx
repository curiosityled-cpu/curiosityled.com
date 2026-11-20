import React from "react";
import { Sparkles, RefreshCw, ChevronDown } from "lucide-react";
import { HUB_BRIEFING } from "@/lib/exploreHubContent";

export default function HubExecutiveBriefing() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{HUB_BRIEFING.eyebrow}</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{HUB_BRIEFING.subtitle}</p>
          </div>
        </div>
        <RefreshCw className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>

      <div className="px-5 py-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 leading-snug">{HUB_BRIEFING.headline}</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {HUB_BRIEFING.stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 px-4 py-3.5">
          <p className="text-sm text-gray-900 leading-relaxed">{HUB_BRIEFING.summary}</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {HUB_BRIEFING.columns.map((col, ci) =>
              col.map((line) => (
                <p key={`${ci}-${line}`} className="text-xs text-gray-600 leading-relaxed">
                  {line}
                </p>
              ))
            )}
          </div>
          <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-amber-700">{HUB_BRIEFING.footnote}</p>
        </div>

        <div className="rounded-xl border border-gray-200 border-t-4 border-t-purple-400 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-sm font-semibold text-gray-900">{HUB_BRIEFING.contextTitle}</p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{HUB_BRIEFING.contextBody}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0202ff]">
              Read full briefing
              <ChevronDown className="w-3 h-3" />
            </button>
            <p className="text-[10px] text-gray-400 leading-relaxed max-w-md">{HUB_BRIEFING.contextFootnote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}