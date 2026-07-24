import React from "react";

// Horizontal 0-100 score bar with label, score/100, optional sublabel and definition.
// Used in the diagnostic results score summary to make scores interpretable at a glance.
export default function ScoreBar({
  label,
  score,
  sublabel,
  definition,
  whatHigh,
  whatLow,
  prominent,
}) {
  const pct = Math.max(0, Math.min(100, score || 0));

  return (
    <div className={prominent ? "" : "py-2"}>
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <span
          className={
            prominent
              ? "text-base font-bold text-[#0a0a0a]"
              : "text-sm font-semibold text-[#0a0a0a]"
          }
        >
          {label}
        </span>
        <span
          className={
            prominent
              ? "text-2xl font-bold text-[#0a0a0a]"
              : "text-sm font-bold text-[#0a0a0a]"
          }
        >
          {score}
          <span className="text-sm font-medium text-gray-400">/100</span>
        </span>
      </div>

      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: "#0202ff" }}
        />
      </div>

      {sublabel && (
        <p
          className="text-xs font-medium mt-1.5"
          style={{ color: "#0202ff" }}
        >
          {sublabel}
        </p>
      )}
      {definition && (
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{definition}</p>
      )}

      {prominent && whatHigh && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              What 100 looks like
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">{whatHigh}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              What 0 means
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">{whatLow}</p>
          </div>
        </div>
      )}
    </div>
  );
}