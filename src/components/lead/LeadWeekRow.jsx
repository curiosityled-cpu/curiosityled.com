import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The week strip that sits under the hero greeting: one cell per day of this
 * week, a tick for the days checked in, today picked out in the Lead orange,
 * and the current run of days beside it.
 */
export default function LeadWeekRow({ days = [], streak = 0 }) {
  if (!days.length) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-end gap-1.5">
        {days.map((d) => (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/55">
              {d.label}
            </span>
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center border",
                d.done
                  ? "bg-white border-white text-[#1a1a1a]"
                  : "border-white/30 bg-white/10",
                d.isToday && !d.done && "border-[var(--ld-accent)] bg-[var(--ld-accent)]/30",
                d.isToday && d.done && "ring-2 ring-[var(--ld-accent)] ring-offset-1 ring-offset-black/20"
              )}
            >
              {d.done && <Check className="w-3 h-3" strokeWidth={3} />}
            </div>
          </div>
        ))}
      </div>
      {streak > 0 && (
        <span className="text-[11px] font-semibold text-white/80 whitespace-nowrap">
          {streak} day streak
        </span>
      )}
    </div>
  );
}