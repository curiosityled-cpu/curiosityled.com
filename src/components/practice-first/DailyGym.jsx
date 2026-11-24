/**
 * DailyGym — one panel for the practice chapter of the Practice First page.
 *
 * The day's prescribed practice sits at the top as a callout; the rest of the
 * workouts follow as rows on the same surface, so the two read as one section
 * rather than two stacked cards.
 */
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import PrescribedPracticeCard from "@/components/practice/PrescribedPracticeCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";

export default function DailyGym({
  goals = [],
  trends = null,
  insight = null,
  crossToolData,
  bpoPatterns,
  recentSessionIds = [],
  onSessionLogged,
}) {
  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem("cl_collapse_daily_gym");
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem("cl_collapse_daily_gym", JSON.stringify(next));
    } catch {
      /* preference is best-effort */
    }
  };

  return (
    <section className="overflow-hidden rounded-[20px] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[0_10px_26px_rgba(23,40,50,0.08)]">
      <header className="flex items-start gap-3 px-5 pb-4 pt-5">
        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-[#E1A45E]/50 bg-[#E1A45E]/15">
          <Dumbbell className="h-4 w-4 text-[#8a5a1f] dark:text-[#E1A45E]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--pf-text)]">
            Daily Gym
          </h2>
          <p className="mt-0.5 text-[12px] leading-[1.45] text-[var(--pf-muted)]">
            Today's prescription first — then everything else you can run.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Collapse Daily Gym" : "Expand Daily Gym"}
          className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[var(--pf-muted)] transition-colors duration-200 hover:bg-[var(--pf-soft)] hover:text-[var(--pf-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B7890]"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </header>

      {expanded && (
        <div className="px-5 pb-5">
          <PrescribedPracticeCard
            variant="callout"
            crossToolData={crossToolData}
            bpoPatterns={bpoPatterns}
            trends={trends}
            recentSessionIds={recentSessionIds}
            onSessionLogged={onSessionLogged}
          />

          <WorkoutsSection variant="flat" goals={goals} trends={trends} insight={insight} />
        </div>
      )}
    </section>
  );
}