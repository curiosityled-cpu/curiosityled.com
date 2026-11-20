import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  Layers,
  Database,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Info,
} from "lucide-react";
import { HUB_METRICS, HUB_PRIORITY } from "@/lib/exploreHubContent";

const TONES = {
  indigo: { card: "bg-indigo-50 border-indigo-200", icon: "text-indigo-600", value: "text-indigo-700" },
  emerald: { card: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600", value: "text-emerald-700" },
  purple: { card: "bg-purple-50 border-purple-200", icon: "text-purple-600", value: "text-purple-700" },
  slate: { card: "bg-slate-50 border-slate-200", icon: "text-slate-500", value: "text-slate-500" },
};

const PRIORITY_TONES = {
  amber: { chip: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  yellow: { chip: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" },
  slate: { chip: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

const ICONS = { health: Shield, risk: AlertTriangle, succession: Layers, confidence: Database };

export default function HubPulseCards() {
  const [openHow, setOpenHow] = useState(null);
  const [openPriority, setOpenPriority] = useState(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {HUB_METRICS.map((m) => {
          const tone = TONES[m.tone];
          const Icon = ICONS[m.id];
          const quiet = m.id === "confidence";
          const Trend = m.id === "risk" ? TrendingUp : m.id === "succession" ? TrendingDown : TrendingUp;
          return (
            <div key={m.id} className={`rounded-xl border p-4 relative ${tone.card} ${quiet ? "opacity-80" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${tone.icon}`} />
                {!quiet && <Trend className={`w-3.5 h-3.5 ${m.id === "health" ? "text-emerald-600" : "text-amber-600"}`} />}
              </div>
              <div className={`${quiet ? "text-xl" : "text-2xl"} font-bold ${tone.value}`}>{m.value}</div>
              <div className={`${quiet ? "text-[11px] text-gray-500" : "text-xs font-medium text-gray-700"} mt-0.5`}>
                {m.label}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{m.interpretation}</div>
              <div className="text-[11px] text-gray-400 mt-1 leading-snug">{m.sub}</div>

              <button
                onClick={() => setOpenHow((prev) => (prev === m.id ? null : m.id))}
                className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
              >
                <Info className="w-2.5 h-2.5" />
                How measured
              </button>
              {openHow === m.id && (
                <div className="mt-2 p-2.5 bg-white border border-gray-200 rounded-lg text-[10px] text-gray-600 leading-relaxed shadow-sm">
                  {m.howMeasured}
                  <button
                    onClick={() => setOpenHow(null)}
                    className="block mt-1 text-gray-400 hover:text-gray-600"
                  >
                    Close ×
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Priority Areas</p>
        <div className="flex flex-wrap gap-2">
          {HUB_PRIORITY.map((p) => {
            const tone = PRIORITY_TONES[p.tone];
            return (
              <button
                key={p.id}
                onClick={() => setOpenPriority((prev) => (prev === p.id ? null : p.id))}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${tone.chip}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tone.dot}`} />
                {p.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${openPriority === p.id ? "rotate-180" : ""}`} />
              </button>
            );
          })}
        </div>

        {openPriority && (() => {
          const p = HUB_PRIORITY.find((x) => x.id === openPriority);
          if (!p) return null;
          return (
            <div className="mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 leading-relaxed flex items-start justify-between gap-3 shadow-sm">
              <p>{p.detail}</p>
              <span className="text-[11px] text-indigo-600 font-medium whitespace-nowrap flex-shrink-0">{p.action}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}