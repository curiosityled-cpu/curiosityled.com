import React from "react";

export default function BlueprintPreview() {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black text-white text-[10px] font-semibold tracking-widest">
        <span>CURIOSITY LED / LEADERSHIP BLUEPRINT</span>
        <span>PDF REPORT</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-5 px-4 pt-3 pb-2 border-b border-gray-100 text-[11px] font-medium">
        <span className="pb-2 border-b-2" style={{ borderColor: "#0202ff", color: "#0202ff" }}>SCORE</span>
        <span className="pb-2 text-gray-400">PRESSURE POINTS</span>
        <span className="pb-2 text-gray-400">90-DAY PLAN</span>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#0202ff" strokeWidth="8"
                strokeLinecap="round" strokeDasharray="264" strokeDashoffset="76"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">68</span>
              <span className="text-[9px] text-gray-400 tracking-wider">/ 100</span>
            </div>
          </div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-500 mt-2">SUPPORT READINESS SCORE</p>
        </div>

        {/* Pressure points radar (simplified pentagon) */}
        <div className="flex justify-center py-1">
          <svg width="120" height="110" viewBox="0 0 120 110">
            <polygon points="60,8 112,38 92,100 28,100 8,38"
              fill="none" stroke="#e5e7eb" strokeWidth="1" />
            <polygon points="60,28 96,46 86,88 34,88 22,46"
              fill="#0202ff15" stroke="#0202ff" strokeWidth="1.5" />
            {[ [60,8],[112,38],[92,100],[28,100],[8,38] ].map((pt, i) => (
              <circle key={i} cx={pt[0]} cy={pt[1]} r="2.5" fill="#0202ff" />
            ))}
          </svg>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 mb-1">02 / PRESSURE POINTS</p>
          <p className="text-sm text-gray-700 leading-snug">
            Your first area to fix — get a clear answer about what's slowing leadership support right now.
          </p>
        </div>

        {/* Scale bar */}
        <div className="pt-1">
          <div className="relative h-1 bg-gray-100 rounded-full">
            <div className="absolute top-0 left-0 h-1 rounded-full" style={{ width: "68%", backgroundColor: "#0202ff" }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-gray-400 tracking-wider">
            <span>30 · REVIEW</span>
            <span>60 · FIX</span>
            <span>90 · GROW</span>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-black text-white text-[11px] font-semibold tracking-wider">
        <span>↓</span>
        <span>DOWNLOADABLE PDF INCLUDED</span>
      </div>
    </div>
  );
}