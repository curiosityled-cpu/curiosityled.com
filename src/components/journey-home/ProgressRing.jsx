import React from "react";

/** Compact SVG progress ring used on the journey hero and detail panel. */
export default function ProgressRing({ percent = 0, size = 92, stroke = 8, tone = "brand", label, caption }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const ringColor = tone === "light" ? "#ffffff" : "#0202ff";
  const trackColor = tone === "light" ? "rgba(255,255,255,0.22)" : "hsl(var(--muted))";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold leading-none ${tone === "light" ? "text-white" : "text-foreground"}`}
            style={{ fontSize: size / 4 }}
          >
            {value}%
          </span>
          {label && (
            <span
              className={`mt-1 text-[10px] uppercase tracking-wider ${
                tone === "light" ? "text-white/70" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          )}
        </div>
      </div>
      {caption && (
        <p className={`text-xs ${tone === "light" ? "text-white/70" : "text-muted-foreground"}`}>{caption}</p>
      )}
    </div>
  );
}