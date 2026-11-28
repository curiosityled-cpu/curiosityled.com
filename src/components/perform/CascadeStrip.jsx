/**
 * CascadeStrip — the few organizational goals the team's work rolls up to.
 * Context only: the goals are authored and managed on the org goals page.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Target, ChevronRight } from "lucide-react";
import LeadCard from "@/components/lead/ui/LeadCard";

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value ?? 0)));

export default function CascadeStrip({ goals = [] }) {
  if (goals.length === 0) return null;

  return (
    <LeadCard padded={false} className="overflow-hidden">
      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ld-muted)]">
        The organization is steering by
      </p>
      {goals.slice(0, 2).map((goal) => (
        <div
          key={goal.id}
          className="px-4 py-2 border-t border-[var(--ld-border)] flex items-center gap-2"
        >
          <Target className="w-3.5 h-3.5 text-[var(--ld-muted)] flex-shrink-0" />
          <p className="text-sm text-[var(--ld-text)] truncate flex-1">{goal.title}</p>
          <span className="text-xs font-semibold text-[var(--ld-muted)] tabular-nums">
            {clamp(goal.progress)}%
          </span>
        </div>
      ))}
      <div className="px-4 py-2.5">
        <Link
          to="/OrgBusinessGoals"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0202ff]"
        >
          Open organizational goals <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </LeadCard>
  );
}