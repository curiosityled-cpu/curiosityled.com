import React from "react";

// Circular SVG progress gauge for the overall 0-100 score.
export default function ScoreGauge({ score, label }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 140" className="w-32 h-32">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#0202ff"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontSize="34" fontWeight="700" fill="#0a0a0a">
          {score}
        </text>
        <text x="70" y="92" textAnchor="middle" fontSize="12" fill="#9ca3af">
          / 100
        </text>
      </svg>
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 -mt-1">
          {label}
        </p>
      )}
    </div>
  );
}