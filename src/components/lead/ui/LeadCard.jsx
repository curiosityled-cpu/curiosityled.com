import React from "react";
import { cn } from "@/lib/utils";

/**
 * The Lead area's card: white on the warm ground, generous radius, one soft
 * shadow. Everything a manager reads sits in one of these, so the page reads
 * as a small number of things rather than a wall of panels.
 */
export default function LeadCard({ children, className, padded = true }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--ld-border)] bg-[var(--ld-surface)]",
        "shadow-[0_1px_2px_rgba(26,26,26,0.04),0_10px_28px_-20px_rgba(26,26,26,0.25)]",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}