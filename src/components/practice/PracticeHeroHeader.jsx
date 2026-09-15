/**
 * PracticeHeroHeader — animated hero banner for the Practice page.
 *
 * Mirrors the Lead page's DynamicHeroHeader, but swaps the time-of-day landscape
 * for a "training room at dusk" illustration, and the weather overlay for a
 * restrained "energy pulse" (concentric rings + drifting dust motes).
 *
 * Includes the date, greeting, a practice-themed status pill, an inline practice
 * streak ring, and a frosted-glass Settings button top-right.
 */
import React, { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import EnergyPulseOverlay from "@/components/practice/EnergyPulseOverlay";
import PracticeStreakRing from "@/components/practice/PracticeStreakRing";

const HERO_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5365205b0_generated_image.png";

export default function PracticeHeroHeader({
  firstName,
  greeting,
  day,
  statusText,
  weekCount,
  onSettingsClick,
  onStreakClick,
}) {
  const pill = useMemo(() => {
    if (statusText) return statusText;
    return "Pick a workout and move the needle today.";
  }, [statusText]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5 shadow-lg"
      style={{ minHeight: "180px" }}
    >
      {/* Background image with breathing animation */}
      <div
        className="absolute inset-0"
        style={{ animation: "practice-breathe 22s ease-in-out infinite" }}
      >
        <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />

      {/* Energy pulse + dust motes */}
      <EnergyPulseOverlay />

      {/* Settings button */}
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/25 transition-colors text-xs font-medium"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      )}

      {/* Content */}
      <div
        className="relative z-10 px-6 py-5 flex flex-col justify-end"
        style={{ minHeight: "180px" }}
      >
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest mb-1">
          {day}
        </p>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="text-2xl font-bold text-white tracking-tight"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
            >
              {greeting}, {firstName}.
            </h1>
            <div className="mt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 text-slate-700 border border-white/40 text-xs font-medium backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {pill}
              </div>
            </div>
          </div>
          {/* Streak ring */}
          <div className="flex-shrink-0 pb-0.5">
            <PracticeStreakRing weekCount={weekCount} onClick={onStreakClick} />
          </div>
        </div>
      </div>
    </div>
  );
}