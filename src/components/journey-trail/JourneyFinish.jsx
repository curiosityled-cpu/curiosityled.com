import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

/** The moment a journey closes: what the learner finished, and where to go next. */
export default function JourneyFinish({ journey, stepCount, competencies = [] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-[var(--pf-surface)]">
      <div className="px-6 py-7 sm:px-8">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Journey complete
        </div>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-[var(--pf-text)]">
          You finished {journey?.title}
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--pf-muted)]">
          Every required step is done. Here is what you worked through.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-4 py-3">
            <p className="text-xl font-extrabold text-[var(--pf-text)]">{stepCount}</p>
            <p className="text-[11px] text-[var(--pf-muted)]">steps completed</p>
          </div>
          <div className="rounded-2xl border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-4 py-3">
            <p className="text-xl font-extrabold text-[var(--pf-text)]">
              {competencies.length || "—"}
            </p>
            <p className="text-[11px] text-[var(--pf-muted)]">competencies practised</p>
          </div>
          <div className="rounded-2xl border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-4 py-3">
            <p className="text-xl font-extrabold text-[var(--pf-text)]">Done</p>
            <p className="text-[11px] text-[var(--pf-muted)]">recorded in your learning record</p>
          </div>
        </div>

        {competencies.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {competencies.slice(0, 6).map((competency) => (
              <span
                key={competency}
                className="rounded-full border border-emerald-200 bg-[var(--pf-surface)] px-2.5 py-0.5 text-[11px] text-emerald-800"
              >
                {competency}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            to="/my-development#practice"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0202ff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0101dd]"
          >
            <Sparkles className="h-4 w-4" />
            Practise what you learned
          </Link>
          <Link
            to="/my-development"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--pf-text)] transition-colors hover:bg-[var(--pf-soft-hover)]"
          >
            Back to my development
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}