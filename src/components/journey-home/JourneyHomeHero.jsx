import React from "react";
import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressRing from "./ProgressRing";

/**
 * Journey Home hero: where the learner stands across their development and the
 * single next thing to do. Brand blue, kept dark so the resume action stands out.
 */
export default function JourneyHomeHero({ firstName, percent, activeJourneys, activeLearning, nextAction }) {
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
            <Compass className="w-3 h-3" />
            My journey
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
            {firstName ? `${firstName}, here's where you're growing` : "Here's where you're growing"}
          </h1>
          <p className="mt-2 text-sm text-white/75 leading-relaxed">
            {activeJourneys + activeLearning > 0
              ? `${activeJourneys} journey${activeJourneys === 1 ? "" : "s"} and ${activeLearning} learning item${
                  activeLearning === 1 ? "" : "s"
                } in progress. Pick up where you left off.`
              : "Your journeys, courses and experiences will appear here as they're assigned."}
          </p>

          {nextAction && (
            <Link
              to={nextAction.to}
              style={{ backgroundColor: "#ffffff", color: "#070a2b" }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {nextAction.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-6 self-start md:self-center">
          <ProgressRing percent={percent} size={104} stroke={9} tone="light" label="Overall" />
          <div className="space-y-2 text-sm">
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{activeJourneys}</span>
              <span className="text-white/70">journeys active</span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-bold">{activeLearning}</span>
              <span className="text-white/70">learning active</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}