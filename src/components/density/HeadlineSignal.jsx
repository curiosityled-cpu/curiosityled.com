/**
 * HeadlineSignal — a one-line, derived signal from today's check-in scores.
 * The calm, at-a-glance indicator that sits in the headline tier of the Today page.
 *
 * Examples: "Heavy day — energy 2, load 4" / "Strong day — energy 4, load 2"
 */
import React from "react";
import { cn } from "@/lib/utils";

export default function HeadlineSignal({ todayRecord, hasCheckedIn }) {
  let signal = "Set your morning check-in to calibrate the day.";
  let tone = "neutral";

  if (hasCheckedIn && todayRecord) {
    const energy = todayRecord.energy_score;
    const load = todayRecord.load_score;
    if (energy != null && load != null) {
      if (energy <= 2 || load >= 4) {
        signal = `Heavy day — energy ${energy}, load ${load}`;
        tone = "heavy";
      } else if (energy >= 4 && load <= 2) {
        signal = `Strong day — energy ${energy}, load ${load}`;
        tone = "strong";
      } else {
        signal = `Steady day — energy ${energy}, load ${load}`;
        tone = "steady";
      }
    } else if (todayRecord.big3_priorities?.length > 0) {
      signal = "Intent is set. Let's hold the shape.";
      tone = "steady";
    }
  }

  const toneStyles = {
    heavy:   "bg-amber-50 text-amber-800 border-amber-100",
    strong:  "bg-emerald-50 text-emerald-800 border-emerald-100",
    steady:  "bg-slate-50 text-slate-700 border-slate-200",
    neutral: "bg-slate-50 text-slate-600 border-slate-200",
  };

  const dotColor = tone === "heavy" ? "#f59e0b" : tone === "strong" ? "#10b981" : "#64748b";

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium", toneStyles[tone])}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      {signal}
    </div>
  );
}