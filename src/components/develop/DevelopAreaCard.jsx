import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * One of the two areas of Develop. Both areas use the same card so neither
 * reads as the main event: same surface, same weight, same call to action.
 */
export default function DevelopAreaCard({
  icon: Icon,
  kicker,
  title,
  description,
  stats = [],
  nextAction,
  ctaLabel,
  to,
}) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0202ff]/10 text-[#0202ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kicker}
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {stats.length > 0 && (
        <div className="mt-4 flex divide-x divide-border rounded-2xl border border-border bg-muted/40 p-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex-1 px-2 first:pl-0 last:pr-0">
              <p className="text-lg font-bold leading-none text-foreground">{stat.value}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-5">
        {nextAction && (
          <p className="mb-3 truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Next:</span> {nextAction}
          </p>
        )}
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0202ff] px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-[#0101dd]">
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}