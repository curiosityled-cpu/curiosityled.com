/**
 * HeadlineSignal — a one-line, derived signal from today's check-in scores.
 * The calm, at-a-glance indicator that sits in the headline tier of the Today page.
 *
 * Uses the DB record when available, but also falls back to the same localStorage
 * completion flags that MorningCheckIn / EveningCheckIn write — so the signal
 * updates instantly even before the query refetches.
 *
 * Examples: "Heavy day — energy 2, load 4" / "Strong day — energy 4, load 2"
 */
import React from "react";
import { cn } from "@/lib/utils";

function getTodayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function getMorningLocal(userEmail) {
  try {
    const raw = localStorage.getItem("morning_checkin_completed");
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.date !== getTodayET()) return null;
    if (userEmail && saved.email !== userEmail) return null;
    return saved;
  } catch { return null; }
}

function getEveningLocal(userEmail) {
  try {
    const key = userEmail ? `evening_checkin_completed_${userEmail}` : "evening_checkin_completed";
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.date !== getTodayET()) return null;
    return saved;
  } catch { return null; }
}

export default function HeadlineSignal({ todayRecord, hasCheckedIn, userEmail, hour }) {
  // Merge DB record with localStorage fallbacks so the signal reflects
  // the latest check-in even before the query catches up.
  const morningLocal = getMorningLocal(userEmail);
  const eveningLocal = getEveningLocal(userEmail);

  const merged = { ...(todayRecord || {}) };
  if (morningLocal && !merged.morning_completed) {
    merged.morning_completed = true;
    if (morningLocal.scores) {
      merged.energy_score = merged.energy_score ?? morningLocal.scores.energy;
      merged.load_score = merged.load_score ?? morningLocal.scores.load;
    }
  }
  if (eveningLocal && !merged.evening_completed) {
    merged.evening_completed = true;
    if (eveningLocal.big3) merged.big3_priorities = merged.big3_priorities?.length ? merged.big3_priorities : eveningLocal.big3;
  }

  const hasData = hasCheckedIn || !!morningLocal || !!eveningLocal || !!merged.morning_completed || !!merged.evening_completed;

  const currentHour = hour ?? parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', hour12: false
  }).format(new Date()), 10);
  const defaultSignal = currentHour >= 5 && currentHour < 12
    ? "Set your morning check-in to calibrate the day."
    : currentHour >= 12 && currentHour < 17
    ? "Set your Big 3 priorities to anchor the afternoon."
    : "Complete your evening check-in to close the day with intention.";
  let signal = defaultSignal;
  let tone = "neutral";

  if (hasData && merged && Object.keys(merged).length > 0) {
    const energy = merged.energy_score;
    const load = merged.load_score;
    const morningDone = !!merged.morning_completed;
    const eveningDone = !!merged.evening_completed;
    const hasScores = energy != null && load != null;
    const hasBig3 = merged.big3_priorities?.length > 0;

    if (eveningDone) {
      signal = hasBig3 ? "Day complete — Big 3 set for tomorrow." : "Day complete.";
      tone = hasBig3 ? "strong" : "steady";
    } else if (hasScores) {
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
    } else if (morningDone) {
      signal = "Morning set — ready for the day.";
      tone = "steady";
    } else if (hasBig3) {
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