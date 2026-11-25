import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Eyebrow } from "./ui";

const RING_RADIUS = 24;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function Stat({ value, label, highlight = false }) {
  return (
    <div>
      <p
        className={`text-[22px] font-extrabold leading-none ${
          highlight ? "text-[#B4762E] dark:text-[#E1A45E]" : "text-[var(--pf-text)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--pf-muted)]">
        {label}
      </p>
    </div>
  );
}

/** The editorial opening of the Development home: who you are, where you are. */
export default function DevelopmentHeader({
  percent = 0,
  completedCount = 0,
  totalCount = 0,
  activeJourneys = 0,
  activeLearning = 0,
  sessionsThisWeek = 0,
  onSettingsClick,
}) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const dashOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * safePercent) / 100;

  return (
    <header className="mx-4 mt-6 sm:mx-6 sm:ml-12 lg:ml-16">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>Develop</Eyebrow>
          <h1 className="mt-1.5 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--pf-text)] sm:text-[42px]">
            My development
          </h1>
          <p className="mt-2.5 max-w-[520px] text-sm leading-[1.5] text-[var(--pf-muted)]">
            One next step at a time: learn it, practise it, then take it into the week.
          </p>
        </div>

        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--pf-text)] transition-colors hover:bg-[var(--pf-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Settings
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-5 rounded-2xl border border-[var(--pf-border)] bg-[var(--pf-surface)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden="true">
              <circle cx="28" cy="28" r={RING_RADIUS} fill="none" stroke="var(--pf-soft)" strokeWidth="5" />
              <circle
                cx="28"
                cy="28"
                r={RING_RADIUS}
                fill="none"
                stroke="#E1A45E"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[12px] font-extrabold text-[var(--pf-text)]">
              {safePercent}%
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--pf-text)]">
              {totalCount ? `${completedCount} of ${totalCount} complete` : "Nothing assigned yet"}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
              {totalCount
                ? "Journeys, courses and experiences combined."
                : "Your programme team will add work here."}
            </p>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-[var(--pf-border)] sm:block" />

        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <Stat value={activeJourneys} label="journeys active" />
          <Stat value={activeLearning} label="learning active" />
          <Stat value={sessionsThisWeek} label="practice this week" highlight />
        </div>
      </div>
    </header>
  );
}