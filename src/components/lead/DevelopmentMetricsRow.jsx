/**
 * DevelopmentMetricsRow — 3 callout cards showing active development progress.
 * Matches the reference design: Active Journeys (purple), Active Learning (blue), Experiences (gold).
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function DevelopmentMetricsRow({ journeys = 0, learning = 0, experiences = 0 }) {
  const metrics = [
    { label: "Active Journeys", value: journeys, color: "text-[#6A3AB2]" },
    { label: "Active Learning", value: learning, color: "text-blue-500" },
    { label: "Experiences", value: experiences, color: "text-amber-600" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Development</p>
        <Link to="/my-development" className="flex items-center gap-1 text-xs font-semibold text-[#0202ff] hover:underline">
          View Development <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200/80 p-3 text-center">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}