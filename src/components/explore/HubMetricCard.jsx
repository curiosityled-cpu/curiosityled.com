import React from "react";
import { Info } from "lucide-react";

const TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

export default function HubMetricCard({ icon: Icon, tone, value, label, description, footnote }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone] || TONES.slate}`}>
        <Icon className="w-4 h-4" />
      </span>

      <p className="mt-3 text-3xl font-extrabold text-gray-900 leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-sm font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-[11px] text-gray-500 leading-snug">{description}</p>

      <div className="mt-auto pt-3 border-t border-gray-100 mt-3">
        <p className="text-[10px] text-gray-400 leading-snug">{footnote}</p>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-400">
          <Info className="w-3 h-3" />
          How measured
        </span>
      </div>
    </div>
  );
}