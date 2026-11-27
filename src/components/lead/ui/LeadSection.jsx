import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  accent: "bg-[var(--ld-accent)]",
  green: "bg-[var(--ld-green)]",
  purple: "bg-[var(--ld-purple)]",
};

/**
 * A titled band of the Lead page: the small coloured label the design standard
 * uses, one line saying what the band is for, and an optional action at the end.
 */
export default function LeadSection({ label, description, action, tone = "accent", children, className }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white",
              TONES[tone] || TONES.accent
            )}
          >
            {label}
          </span>
          {description && (
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--ld-muted)]">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}