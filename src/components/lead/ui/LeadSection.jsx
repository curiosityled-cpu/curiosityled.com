import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  accent: "bg-[var(--ld-accent)]",
  green: "bg-[var(--ld-green)]",
  purple: "bg-[var(--ld-purple)]",
};

/**
 * A titled band of the Lead page: the small coloured label the design standard
 * uses, one line saying what the band is for, and an optional action at the end.
 * Pass `collapsible` to let the reader fold the band's content away.
 */
export default function LeadSection({
  label,
  description,
  action,
  tone = "accent",
  collapsible = false,
  defaultOpen = true,
  children,
  className,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;

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
        <div className="flex flex-shrink-0 items-center gap-2">
          {action}
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--ld-muted)] transition-colors hover:bg-black/5 hover:text-[var(--ld-text)]"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")}
              />
            </button>
          )}
        </div>
      </div>
      {expanded && children}
    </section>
  );
}