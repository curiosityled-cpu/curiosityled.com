import React from "react";
import { Users, Circle, PlayCircle, CheckCircle2, AlertTriangle, TrendingUp, Timer } from "lucide-react";

const STAT_TILES = [
  { key: "enrolled", label: "Enrolled", Icon: Users, tone: "text-gray-900" },
  { key: "not_started", label: "Not started", Icon: Circle, tone: "text-gray-600" },
  { key: "in_progress", label: "In progress", Icon: PlayCircle, tone: "text-blue-600" },
  { key: "completed", label: "Completed", Icon: CheckCircle2, tone: "text-emerald-600" },
  { key: "overdue", label: "Overdue", Icon: AlertTriangle, tone: "text-red-600" },
  { key: "completion_rate", label: "Completion rate", Icon: TrendingUp, tone: "text-[#0202ff]", suffix: "%" },
  {
    key: "avg_days_to_complete",
    label: "Avg time to complete",
    Icon: Timer,
    tone: "text-amber-600",
    suffix: "d",
    fallback: "—",
  },
];

/** Course-level progress overview: the numbers up top, then per-module completion. */
export default function CourseRosterSummary({ summary, modules = [] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAT_TILES.map(({ key, label, Icon, tone, suffix, fallback }) => {
          const raw = summary?.[key];
          const value = raw === null || raw === undefined ? fallback ?? 0 : raw;
          return (
            <div key={key} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px]">{label}</span>
              </div>
              <p className={`mt-1 text-xl font-bold ${tone}`}>
                {value}
                {value !== fallback && suffix ? suffix : ""}
              </p>
            </div>
          );
        })}
      </div>

      {modules.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Completion by module</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A module that lags the others is usually where learners stall.
          </p>
          <div className="mt-3 space-y-3">
            {modules.map((module) => (
              <div key={module.id || module.title}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {module.title}
                    <span className="ml-1.5 text-muted-foreground">
                      {module.lessons} {module.lessons === 1 ? "lesson" : "lessons"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">{module.learner_percent}% finished</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0202ff] transition-all duration-500"
                    style={{ width: `${Math.min(100, module.learner_percent || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}