import React from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const RADAR_DATA = [
  { area: "Support", value: 65 },
  { area: "Readiness", value: 72 },
  { area: "Follow-through", value: 58 },
  { area: "Coordination", value: 70 },
  { area: "Insight", value: 80 },
];

const SCORE = 68;

function ScoreGauge({ value }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E5E5" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#0202ff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-[#0a0a0a] leading-none">{value}</div>
        <div className="text-xs text-gray-400 mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

export default function ReportPreviewCard() {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-white shadow-xl">
      {/* Black header bar */}
      <div className="flex items-center justify-between bg-[#0a0a0a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-white">
            <img
              src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
              alt=""
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="text-white">
            <div className="text-xs font-bold tracking-wide">CURIOSITY LED</div>
            <div className="text-[10px] text-gray-400 leading-none">LEADERSHIP INTELLIGENCE BRIEF</div>
          </div>
        </div>
        <span className="text-[10px] font-medium text-white border border-gray-600 px-2 py-0.5 rounded">PDF REPORT</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100 px-4">
        {["SCORE", "GROWTH BLOCK", "90-DAY PLAN"].map((tab, i) => (
          <div
            key={tab}
            className={`py-2.5 text-xs font-semibold tracking-wide ${i === 0 ? "text-[#0a0a0a] border-b-2" : "text-gray-400"}`}
            style={i === 0 ? { borderColor: "#0202ff" } : {}}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Score + radar */}
      <div className="px-5 py-5 flex items-center gap-5">
        <div className="flex flex-col items-center">
          <ScoreGauge value={SCORE} />
          <p className="text-[10px] font-semibold text-gray-500 mt-2 tracking-wide uppercase">Leadership Readiness Score</p>
        </div>
        <div className="flex-1 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={RADAR_DATA} outerRadius="70%">
              <PolarGrid stroke="#E5E5E5" />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 9, fill: "#666" }} />
              <Radar dataKey="value" stroke="#0202ff" fill="#0202ff" fillOpacity={0.12} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth block summary */}
      <div className="px-5 pb-5">
        <p className="text-[11px] font-semibold tracking-wide text-[#0202ff] mb-1">01 / YOUR FIRST FOCUS</p>
        <p className="text-sm font-bold text-[#0a0a0a] mb-1">See Manager Risk and Readiness in One View</p>
        <p className="text-xs text-gray-500 leading-relaxed">See which leaders are at risk, ready, and where support should go first.</p>

        {/* Progress slider */}
        <div className="mt-4 relative">
          <div className="h-1 bg-gray-200 rounded-full" />
          <div className="absolute top-0 left-0 h-1 rounded-full" style={{ width: "60%", backgroundColor: "#0202ff" }} />
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>30 · Assess</span>
            <span>60 · Support</span>
            <span>90 · Develop</span>
          </div>
        </div>
      </div>

      {/* Black bottom bar */}
      <div className="bg-[#0a0a0a] text-white text-center py-2.5 text-xs font-semibold tracking-wide">
        ↓ DOWNLOADABLE BLUEPRINT INCLUDED
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-5 py-3 bg-[#F9F7F5]">
        <span className="flex-shrink-0 w-3 h-3 rounded-sm mt-0.5" style={{ backgroundColor: "#0202ff" }} />
        <p className="text-[11px] text-gray-500 leading-snug">
          Built from your answers. Ready to print, share, and review with your leadership team.
        </p>
      </div>
    </div>
  );
}