import React from "react";
import { ShieldCheck, Users, Zap, BookOpen, Target, Brain, AlertTriangle, RefreshCw } from "lucide-react";
import { HUB_WELLBEING } from "@/lib/exploreHubContent";

const CARD_ICONS = [Users, Zap, BookOpen, Target];

const OVERLOAD_TONES = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export default function HubWellbeing() {
  const w = HUB_WELLBEING;
  const maxEnergy = 5;
  const overloadTotal = w.overload.reduce((s, o) => s + o.value, 0);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{w.title}</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-3xl">{w.subtitle}</p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-700 leading-relaxed">{w.privacy}</p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">{w.categoryBTitle}</p>
            <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{w.categoryB}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 flex-shrink-0">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {w.cards.map((c, i) => {
          const Icon = CARD_ICONS[i];
          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
              <Icon className="w-4 h-4 text-gray-400 mb-2" />
              <p className="text-xl font-bold text-gray-900 leading-none">{c.value}</p>
              <p className="text-xs font-medium text-gray-700 mt-1">{c.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{c.of}</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-snug">{c.note}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gray-400" />
          <p className="text-xs font-semibold text-gray-900">Identity friction signals</p>
        </div>
        <p className="text-xl font-bold text-gray-900 mt-2 leading-none">{w.identityFriction.value}</p>
        <p className="text-[11px] text-gray-600 mt-1">{w.identityFriction.caption}</p>
        <p className="text-[10px] text-gray-400 mt-1">{w.identityFriction.note}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#0202ff]" />
            <p className="text-xs font-semibold text-gray-900">Energy trends</p>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">
              14-day window
            </span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {w.energyTrend.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${(v / maxEnergy) * 100}%`,
                  backgroundColor: i === w.energyTrend.length - 1 ? "#0202ff" : "#c7d2fe",
                }}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Average daily energy across the group · 1–5 scale</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-gray-900">Overload risk distribution</p>
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">
              28-day composite
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden">
            {w.overload.map((o) => (
              <div
                key={o.label}
                className={OVERLOAD_TONES[o.tone]}
                style={{ width: `${(o.value / overloadTotal) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {w.overload.map((o) => (
              <div key={o.label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${OVERLOAD_TONES[o.tone]}`} />
                <span className="text-[11px] text-gray-600">{o.label}</span>
                <span className="ml-auto text-[11px] font-semibold text-gray-900">{o.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">{w.overloadNote}</p>
        </div>
      </div>
    </div>
  );
}