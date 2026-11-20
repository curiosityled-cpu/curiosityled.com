import React from "react";
import { Users } from "lucide-react";
import { HUB_TALENT } from "@/lib/exploreHubContent";

const BAND_TONES = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  gray: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function HubTalentLens() {
  const t = HUB_TALENT;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {t.coverage.map((c) => (
          <div key={c.label} className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-purple-700 mt-1 leading-none">{c.value}</p>
            <p className="text-[11px] text-gray-600 mt-1 leading-snug">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0202ff]" />
          <p className="text-sm font-semibold text-gray-900">Talent Pipeline</p>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Directional
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {t.rows.map((r) => (
            <div key={r.name} className="px-5 py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-500">{r.role}</p>
              </div>
              <span className="text-[11px] font-semibold text-gray-900 w-10 text-right">{r.score}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${BAND_TONES[r.tone]}`}
              >
                {r.band}
              </span>
            </div>
          ))}
        </div>
        <p className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">{t.note}</p>
      </div>
    </div>
  );
}