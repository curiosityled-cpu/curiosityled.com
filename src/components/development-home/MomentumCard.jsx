import React from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Flame } from "lucide-react";

function Row({ icon: Icon, tone, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--pf-muted)]">{label}</p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--pf-text)]">{value}</p>
      </div>
    </div>
  );
}

/** Compact momentum summary: completion, the next step, what needs attention. */
export default function MomentumCard({ completed = 0, total = 0, nextTitle, overdue = 0, sessionsThisWeek = 0 }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <section className="flex h-full flex-col rounded-[20px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-[var(--pf-text)]">Your momentum</h2>
        <span className="text-xs font-semibold text-[var(--pf-muted)]">
          {completed} of {total}
        </span>
      </div>

      <p className="mt-1 text-xs text-[var(--pf-muted)]">
        {total ? `${percent}% of your assigned activities are complete.` : "No activities assigned yet."}
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--pf-soft)]">
        <div className="h-full rounded-full bg-[#0202ff]" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-5 flex flex-1 flex-col gap-4">
        <Row
          icon={ArrowRight}
          tone="bg-[#0202ff]/10 text-[#0202ff]"
          label="Next up"
          value={nextTitle || "Nothing assigned"}
        />
        <Row
          icon={overdue ? AlertTriangle : CheckCircle2}
          tone={overdue ? "bg-red-50 text-red-600 dark:bg-red-950/40" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"}
          label="Needs attention"
          value={overdue ? `${overdue} overdue ${overdue === 1 ? "item" : "items"}` : "All caught up"}
        />
        <Row
          icon={Flame}
          tone="bg-[#E1A45E]/15 text-[#B4762E] dark:text-[#E1A45E]"
          label="Practice"
          value={`${sessionsThisWeek} ${sessionsThisWeek === 1 ? "session" : "sessions"} this week`}
        />
      </div>
    </section>
  );
}