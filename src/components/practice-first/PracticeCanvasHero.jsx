/**
 * PracticeCanvasHero — the shared banner above the combined Practice + Develop
 * page. A dark, image-led canvas with the two-part Practice/Develop emblem, the
 * overall progress ring and the live journey/learning counts.
 */
import React from "react";
import { SlidersHorizontal } from "lucide-react";

const HERO_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/e207b1a7dc1173c3bfb874f8fb020a10_generated_910b452a.jpg";

export default function PracticeCanvasHero({
  percent = 0,
  activeJourneys = 0,
  activeLearning = 0,
  sessionsThisWeek = 0,
  onSettingsClick,
}) {
  const dashOffset = 270 - (270 * Math.min(100, Math.max(0, percent))) / 100;

  return (
    <section
      className="relative mx-4 mt-6 overflow-hidden rounded-3xl bg-[#172832] text-[#E9EEF2] shadow-[0_18px_40px_rgba(23,40,50,0.3)] sm:mx-6 sm:ml-12 lg:ml-16"
      style={{ animation: "pf-rise .8s ease-out both", animationDelay: ".05s" }}
    >
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(23,40,50,0.55)] to-[rgba(23,40,50,0.88)]" />

      {/* Energy rings */}
      <span
        className="pointer-events-none absolute right-[90px] top-[150px] hidden h-[120px] w-[120px] rounded-full border-2 border-[#E1A45E] md:block"
        style={{ animation: "pf-ring 3.5s ease-out infinite" }}
      />
      <span
        className="pointer-events-none absolute right-[90px] top-[150px] hidden h-[120px] w-[120px] rounded-full border-2 border-[#E1A45E] md:block"
        style={{ animation: "pf-ring 3.5s ease-out infinite", animationDelay: "1.7s" }}
      />

      <div className="relative flex flex-col gap-[22px] px-6 py-7 sm:px-8 sm:pb-8">
        {/* Top row — emblem + settings */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border-2 border-[#E1A45E]">
              <span className="block h-3 w-3 rotate-45 rounded-[3px] bg-[#E1A45E]" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9EEF2]/30 bg-[#E9EEF2]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#E9EEF2]">
              My development
            </span>
          </div>

          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E9EEF2]/28 bg-[#E9EEF2]/14 px-3.5 py-1.5 text-xs font-semibold text-[#E9EEF2] transition-[background] duration-200 hover:bg-[#E9EEF2]/26 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E1A45E]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Settings
            </button>
          )}
        </div>

        {/* Headline + progress */}
        <div className="flex flex-col justify-between gap-6 pt-6 sm:flex-row sm:items-end sm:gap-8 sm:pt-[60px]">
          <div className="min-w-0">
            <h1 className="max-w-[560px] text-[34px] font-extrabold leading-[1.05] tracking-[-0.025em] text-[#E9EEF2] sm:text-[44px]">
              My development
            </h1>
            <p className="mt-3 max-w-[500px] text-sm leading-[1.5] text-[#E9EEF2]/75">
              Your journeys, courses and experiences will appear here as they're assigned.
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-[22px]">
            <div className="relative h-[104px] w-[104px]">
              <svg viewBox="0 0 104 104" className="h-[104px] w-[104px] -rotate-90">
                <circle cx="52" cy="52" r="43" fill="none" stroke="rgba(233,238,242,.2)" strokeWidth="9" />
                <circle
                  cx="52"
                  cy="52"
                  r="43"
                  fill="none"
                  stroke="#E1A45E"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="270"
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-[#E9EEF2]">
                {percent}%
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-[13px] text-[#E9EEF2]/75">
              <p className="flex items-baseline">
                <b className="mr-2 text-[26px] font-extrabold text-[#E9EEF2]">{activeJourneys}</b>
                journeys active
              </p>
              <p className="flex items-baseline">
                <b className="mr-2 text-[26px] font-extrabold text-[#E9EEF2]">{activeLearning}</b>
                learning active
              </p>
              <p className="flex items-baseline">
                <b className="mr-2 text-[26px] font-extrabold text-[#E1A45E]">{sessionsThisWeek}</b>
                practice sessions this week
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}