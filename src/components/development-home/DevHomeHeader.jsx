import React from "react";
import { SlidersHorizontal, Sparkles, Flame } from "lucide-react";
import EnergyPulseOverlay from "@/components/practice/EnergyPulseOverlay";

/**
 * DevHomeHeader — the masthead for My Development.
 *
 * A dark hero band over a blurred practice image: today's date, the headline,
 * the space label as a status pill, the live counts and this week's practice
 * ring, with Settings in the top right.
 */
const HERO_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5365205b0_generated_image.png";

function WeekRing({ count = 0 }) {
  const target = 5;
  const pct = Math.min(100, Math.round((count / target) * 100));
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
        <p className="text-base font-bold text-white">{count}</p>
        <p className="text-[9px] font-medium uppercase tracking-wider text-white/65">
          this week
        </p>
      </div>
    </div>
  );
}

export default function DevHomeHeader({
  activeJourneys = 0,
  activeLearning = 0,
  sessionsThisWeek = 0,
  onSettingsClick,
  firstName,
}) {
  const today = new Date()
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-lg" style={{ minHeight: "210px" }}>
      <div
        className="absolute inset-0"
        style={{ animation: "practice-breathe 22s ease-in-out infinite" }}
      >
        <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
      <EnergyPulseOverlay />

      {onSettingsClick && (
        <button
          type="button"
          onClick={onSettingsClick}
          className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Settings
        </button>
      )}

      <div className="relative z-10 flex min-h-[210px] flex-col justify-end px-6 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
          {today}
        </p>

        <div className="mt-1.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="max-w-[620px] text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white sm:text-[34px]">
              {firstName ? `Ready to grow, ${firstName}?` : "Ready to grow?"}
            </h1>
            <p className="mt-2 max-w-[520px] text-[13px] leading-[1.55] text-white/70">
              Your journeys, courses and experiences in one place — with the next useful step already picked out.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-3 w-3 flex-shrink-0 text-amber-300" />
              Your Development Space
            </div>
          </div>

          <div className="flex flex-shrink-0 items-end gap-5 pb-0.5">
            <dl className="flex items-end gap-4">
              <div className="text-right">
                <dd className="text-[20px] font-extrabold leading-none text-white">
                  {activeJourneys}
                </dd>
                <dt className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-white/60">
                  Journeys
                </dt>
              </div>
              <div className="text-right">
                <dd className="text-[20px] font-extrabold leading-none text-white">
                  {activeLearning}
                </dd>
                <dt className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-white/60">
                  Learning
                </dt>
              </div>
            </dl>
            <WeekRing count={sessionsThisWeek} />
          </div>
        </div>
      </div>
    </section>
  );
}