import React from "react";
import { cn } from "@/lib/utils";

/**
 * One section of a Lead page: the same eyebrow, title and spacing every time,
 * so the page reads as a sequence rather than a pile of cards.
 */
export default function LeadSection({ eyebrow, title, description, action, className, children }) {
  return (
    <section className={cn("mt-8 first:mt-0", className)}>
      {(eyebrow || title || action) && (
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pf-muted)]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--pf-text)]">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--pf-muted)]">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}