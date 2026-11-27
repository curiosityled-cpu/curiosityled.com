/**
 * StreakRing — the flame ring counter that sits in the Lead hero.
 *
 * Shows the manager's current run of check-in days, with the ring filling
 * across a seven-day week so a full week reads as a complete circle.
 */
import React from "react";
import { Flame } from "lucide-react";

export default function StreakRing({ days = 0 }) {
  const target = 7;
  const pct = Math.min(100, Math.round((days / target) * 100));
  const circumference = 2 * Math.PI * 18;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-12 w-12 flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="3.5"
          />
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="rgba(255, 206, 120, 0.95)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <Flame
          className="absolute h-4 w-4 text-amber-200/90"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,180,80,0.5))" }}
        />
      </div>
      <div className="leading-tight">
        <p className="text-base font-bold text-white">{days}</p>
        <p className="text-[9px] font-medium uppercase tracking-wider text-white/65">
          day streak
        </p>
      </div>
    </div>
  );
}