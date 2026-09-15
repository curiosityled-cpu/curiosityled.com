/**
 * PracticeStreakRing — inline weekly practice-consistency ring for the Practice hero.
 *
 * Shows sessions completed this week (Mon–Sun ET) as a ring fill, with the count
 * in the center. Clicking opens the sessions log drawer.
 */
import React from "react";
import { Flame } from "lucide-react";

export default function PracticeStreakRing({ weekCount, onClick }) {
  // Target: 5 practice sessions per week for a full ring.
  const target = 5;
  const pct = Math.min(100, Math.round((weekCount / target) * 100));
  const circumference = 2 * Math.PI * 18;
  const dash = (pct / 100) * circumference;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 group"
      aria-label={`Practice streak: ${weekCount} sessions this week`}
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
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
          className="absolute w-4 h-4 text-amber-200/90"
          style={{ filter: "drop-shadow(0 0 4px rgba(255,180,80,0.5))" }}
        />
      </div>
      <div className="text-left leading-tight">
        <p className="text-base font-bold text-white">{weekCount}</p>
        <p className="text-[9px] font-medium text-white/65 uppercase tracking-wider">
          this week
        </p>
      </div>
    </button>
  );
}