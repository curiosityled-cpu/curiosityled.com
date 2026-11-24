import React from "react";
import { Compass } from "lucide-react";
import ProgressRing from "@/components/journey-home/ProgressRing";

/**
 * Develop hero — one banner for the whole destination, so My Journey and
 * Practice sit beneath it as two equal halves of the same thing.
 */
export default function DevelopHero({
  firstName,
  journeyPercent,
  activeJourneys,
  activeLearning,
  practiceThisWeek,
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#070a2b] text-white shadow-lg">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #0202ff 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #7c5cff 0%, transparent 70%)" }}
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80">
            <Compass className="h-3 w-3" />
            Develop
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {firstName ? `${firstName}, where are you growing next?` : "Where are you growing next?"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            My Journey is the path you're on. Practice is where you build the skills to walk it. Both
            live here.
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-6 self-start md:self-center">
          <ProgressRing percent={journeyPercent} size={96} stroke={9} tone="light" label="Journey" />
          <div className="space-y-2 text-sm">
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{activeJourneys}</span>
              <span className="text-white/70">journeys active</span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{activeLearning}</span>
              <span className="text-white/70">learning active</span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{practiceThisWeek}</span>
              <span className="text-white/70">practised this week</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}