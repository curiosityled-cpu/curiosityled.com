/**
 * OrgGoalsCard — the organization's goals and outcomes in one read: the business
 * goals it is steering by, the OKRs set for the period, and the KPIs it is
 * measured on. Read-only; each is managed where it is authored.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Target, Gauge, Compass, ChevronRight } from "lucide-react";
import LeadCard from "@/components/lead/ui/LeadCard";

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value ?? 0)));

function GoalRow({ icon: Icon, title, progress, meta }) {
  return (
    <div className="px-4 py-3 border-b border-[var(--ld-border)]">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[var(--ld-muted)] flex-shrink-0" />
        <p className="text-sm font-medium text-[var(--ld-text)] truncate flex-1">{title}</p>
        <span className="text-xs font-semibold text-[var(--ld-muted)] tabular-nums">
          {progress}%
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[var(--ld-panel)] overflow-hidden">
        <div className="h-full rounded-full bg-[#0202ff]" style={{ width: `${progress}%` }} />
      </div>
      {meta ? (
        <p className="text-[11px] text-[var(--ld-muted)] mt-1 tabular-nums">{meta}</p>
      ) : null}
    </div>
  );
}

export default function OrgGoalsCard({ businessGoals = [], okrs = [], kpis = [] }) {
  const groups = [
    {
      key: "goal",
      label: "Business goals",
      icon: Target,
      rows: businessGoals.slice(0, 4).map((goal) => ({
        id: goal.id,
        title: goal.title,
        progress: clamp(goal.progress),
        meta: [goal.target_metric, goal.quarter].filter(Boolean).join(" · "),
      })),
    },
    {
      key: "okr",
      label: "OKRs",
      icon: Compass,
      rows: okrs.slice(0, 4).map((goal) => ({
        id: goal.id,
        title: goal.title,
        progress: clamp(goal.progress),
        meta: goal.timeframe_end ? `Due ${String(goal.timeframe_end).slice(0, 10)}` : "",
      })),
    },
    {
      key: "kpi",
      label: "KPIs",
      icon: Gauge,
      rows: kpis.slice(0, 5).map((kpi) => ({
        id: kpi.id,
        title: kpi.title,
        progress: clamp(kpi.progress),
        meta: `${kpi.current_value ?? "—"} of ${kpi.target_value ?? "—"}${
          kpi.unit ? ` ${kpi.unit}` : ""
        }`,
      })),
    },
  ].filter((group) => group.rows.length > 0);

  const footer = (
    <Link
      to="/OrgBusinessGoals"
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0202ff]"
    >
      Open organizational goals <ChevronRight className="w-3 h-3" />
    </Link>
  );

  if (groups.length === 0) {
    return (
      <LeadCard>
        <p className="text-sm font-semibold text-[var(--ld-text)]">No org-wide goals yet</p>
        <p className="text-xs text-[var(--ld-muted)] mt-1 leading-relaxed">
          Business goals, OKRs and KPIs set for the organization show up here.
        </p>
        <div className="mt-2">{footer}</div>
      </LeadCard>
    );
  }

  return (
    <LeadCard padded={false} className="overflow-hidden">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ld-muted)]">
              {group.label}
            </p>
          </div>
          {group.rows.map((row) => (
            <GoalRow
              key={`${group.key}:${row.id}`}
              icon={group.icon}
              title={row.title}
              progress={row.progress}
              meta={row.meta}
            />
          ))}
        </div>
      ))}
      <div className="px-4 py-2.5">{footer}</div>
    </LeadCard>
  );
}