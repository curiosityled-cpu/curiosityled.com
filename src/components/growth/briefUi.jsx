import React from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({ children, kicker }) {
  return (
    <div className="mb-4">
      {kicker && (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
          {kicker}
        </p>
      )}
      <h2 className="text-xl font-bold tracking-tight text-foreground">{children}</h2>
    </div>
  );
}

export function Lead({ children }) {
  return <p className="text-[15px] leading-relaxed text-muted-foreground">{children}</p>;
}

export function Callout({ children, tone = "default", title }) {
  const tones = {
    default: "border-border bg-muted/40",
    accent: "border-[#0202ff]/25 bg-[#0202ff]/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-rose-500/30 bg-rose-500/5",
    good: "border-emerald-500/30 bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", tones[tone] || tones.default)}>
      {title && <p className="text-sm font-bold text-foreground mb-1.5">{title}</p>}
      <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function DataTable({ columns, rows, dense = false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-left align-top">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground",
                  c.className
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3.5 align-top text-sm leading-relaxed text-foreground",
                    dense ? "py-2" : "py-3",
                    c.cellClassName
                  )}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tag({ children, tone = "default" }) {
  const tones = {
    default: "bg-muted text-muted-foreground",
    accent: "bg-[#0202ff]/10 text-[#0202ff] dark:text-blue-300",
    good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone] || tones.default
      )}
    >
      {children}
    </span>
  );
}

export function Bullets({ items, className }) {
  return (
    <ul className={cn("space-y-1.5 text-sm leading-relaxed text-muted-foreground", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}