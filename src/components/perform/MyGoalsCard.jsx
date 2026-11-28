/**
 * MyGoalsCard — the goals and KPIs the signed-in person owns, with the progress
 * already recorded on them. Read-only: editing stays in My Performance.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Target, Gauge, ChevronRight } from "lucide-react";
import LeadCard from "@/components/lead/ui/LeadCard";

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value ?? 0)));

export default function MyGoalsCard({ goals = [], kpis = [] }) {
  const rows = [
    ...goals.map((g) => ({
      id: g.id,
      kind: "goal",
      title: g.title,
      progress: clamp(g.progress),
      due: g.timeframe_end,
    })),
    ...kpis.map((k) => ({
      id: k.id,
      kind: "kpi",
      title: k.title,
      progress: clamp(k.progress),
      value: k.current_value,
      target: k.target_value,
      unit: k.unit,
    })),
  ];

  const footer = (
    <Link
      to="/my-performance"
      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ld-accent)]"
    >
      Open my performance <ChevronRight className="w-3 h-3" />
    </Link>
  );

  if (rows.length === 0) {
    return (
      <LeadCard>
        <p className="text-sm font-semibold text-[var(--ld-text)]">No goals or KPIs yet</p>
        <p className="text-xs text-[var(--ld-muted)] mt-1 leading-relaxed">
          Set a goal or a KPI and its progress shows up here.
        </p>
        <div className="mt-2">{footer}</div>
      </LeadCard>
    );
  }

  return (
    <LeadCard padded={false} className="overflow-hidden">
      {rows.slice(0, 6).map((row) => (
        <div key={`${row.kind}:${row.id}`} className="px-4 py-3 border-b border-[var(--ld-border)]">
          <div className="flex items-center gap-2">
            {row.kind === "kpi" ? (
              <Gauge className="w-3.5 h-3.5 text-[var(--ld-muted)] flex-shrink-0" />
            ) : (
              <Target className="w-3.5 h-3.5 text-[var(--ld-muted)] flex-shrink-0" />
            )}
            <p className="text-sm font-medium text-[var(--ld-text)] truncate flex-1">{row.title}</p>
            <span className="text-xs font-semibold text-[var(--ld-muted)] tabular-nums">
              {row.progress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--ld-panel)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--ld-accent)]"
              style={{ width: `${row.progress}%` }}
            />
          </div>
          {row.kind === "kpi" ? (
            <p className="text-[11px] text-[var(--ld-muted)] mt-1 tabular-nums">
              {row.value ?? "—"} of {row.target ?? "—"}
              {row.unit ? ` ${row.unit}` : ""}
            </p>
          ) : row.due ? (
            <p className="text-[11px] text-[var(--ld-muted)] mt-1">
              Due {String(row.due).slice(0, 10)}
            </p>
          ) : null}
        </div>
      ))}
      <div className="px-4 py-2.5">{footer}</div>
    </LeadCard>
  );
}