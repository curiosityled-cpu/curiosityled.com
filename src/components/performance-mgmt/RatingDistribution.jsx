import React from "react";
import { BarChart3 } from "lucide-react";

const SHRM_DISTRIBUTION = [
  { rating: 1, label: "Far Below", min: 2, max: 5, color: "#EF4444" },
  { rating: 2, label: "Below", min: 10, max: 15, color: "#F97316" },
  { rating: 3, label: "Partially", min: 50, max: 60, color: "#F59E0B" },
  { rating: 4, label: "Meets", min: 20, max: 30, color: "#22C55E" },
  { rating: 5, label: "Exceeds", min: 5, max: 10, color: "#0202ff" },
];

export default function RatingDistribution({ employees }) {
  const ratings = employees
    .map(e => e.calibrated_rating ?? e.manager_rating)
    .filter(r => r != null);
  const total = ratings.length;

  if (total === 0) return null;

  const counts = [1, 2, 3, 4, 5].map(r => ({
    rating: r,
    count: ratings.filter(v => v === r).length,
    pct: (ratings.filter(v => v === r).length / total) * 100,
  }));

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-[#0202ff]" />
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Rating Distribution</h4>
        <span className="text-[10px] text-gray-400 ml-auto">SHRM guidelines shown as shaded range</span>
      </div>
      <div className="space-y-2">
        {counts.map(c => {
          const guideline = SHRM_DISTRIBUTION.find(g => g.rating === c.rating);
          const withinRange = c.pct >= guideline.min && c.pct <= guideline.max;
          return (
            <div key={c.rating} className="flex items-center gap-3">
              <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-medium text-gray-700">{c.rating}</span>
                <span className="text-[10px] text-gray-400">{guideline.label}</span>
              </div>
              <div className="flex-1 relative h-5 bg-white rounded border border-gray-100 overflow-hidden">
                <div
                  className="absolute h-full opacity-15"
                  style={{
                    left: `${guideline.min}%`,
                    width: `${guideline.max - guideline.min}%`,
                    backgroundColor: guideline.color,
                  }}
                />
                <div
                  className="h-full rounded transition-all flex items-center justify-end pr-1.5 relative"
                  style={{
                    width: `${Math.max(c.pct, 2)}%`,
                    backgroundColor: guideline.color,
                    opacity: 0.85,
                  }}
                >
                  {c.count > 0 && <span className="text-[10px] text-white font-medium">{c.count}</span>}
                </div>
              </div>
              <div className="w-24 text-right flex-shrink-0">
                <span className={`text-xs font-medium ${withinRange ? "text-green-600" : "text-amber-600"}`}>
                  {c.pct.toFixed(0)}%
                </span>
                <span className="text-[10px] text-gray-400 ml-1">
                  ({guideline.min}-{guideline.max}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        Bars outside the SHRM recommended range are highlighted in amber — indicates potential rating inflation or deflation.
      </p>
    </div>
  );
}