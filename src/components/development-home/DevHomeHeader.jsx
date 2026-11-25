import React from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";

/**
 * The editorial masthead for My Development — a plain headline and three live
 * counts. No hero image and no progress ring: the page's single dark surface is
 * reserved for the next action below it.
 */
export default function DevHomeHeader({
  activeJourneys = 0,
  activeLearning = 0,
  sessionsThisWeek = 0,
  onSettingsClick,
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-6 pt-2">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--pf-accent)]">
          <Sparkles className="h-3 w-3" />
          Your learning space
        </span>
        <h1 className="mt-4 max-w-[620px] text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--pf-text)] sm:text-[42px]">
          Keep growing, one moment at a time.
        </h1>
        <p className="mt-3 max-w-[560px] text-sm leading-[1.6] text-[var(--pf-muted)]">
          Your journeys, courses and experiences in one place — with the next useful step already picked out.
        </p>
      </div>

      <div className="flex items-center gap-5">
        <dl className="flex items-end gap-5">
          <div>
            <dd className="text-[22px] font-extrabold leading-none text-[var(--pf-text)]">{activeJourneys}</dd>
            <dt className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[var(--pf-muted)]">Journeys</dt>
          </div>
          <div>
            <dd className="text-[22px] font-extrabold leading-none text-[var(--pf-text)]">{activeLearning}</dd>
            <dt className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[var(--pf-muted)]">Learning</dt>
          </div>
          <div>
            <dd className="text-[22px] font-extrabold leading-none text-[var(--pf-accent)]">{sessionsThisWeek}</dd>
            <dt className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[var(--pf-muted)]">Practice</dt>
          </div>
        </dl>

        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--pf-text)] transition-colors hover:bg-[var(--pf-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Settings
          </button>
        )}
      </div>
    </section>
  );
}