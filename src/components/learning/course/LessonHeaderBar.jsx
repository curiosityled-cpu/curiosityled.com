import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** The lesson shell: where the learner is, and the two moves that matter. */
export default function LessonHeaderBar({ position, total, percent, onPrev, onNext }) {
  const atStart = position <= 1;
  const atEnd = position >= total;

  return (
    <div className="sticky top-2 z-10 mb-3 rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={atStart}
          aria-label="Previous lesson"
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-foreground">
              Lesson {position || "—"} of {total}
            </p>
            <p className="text-[11px] font-medium tabular-nums text-muted-foreground">{percent}%</p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-[#0202ff] transition-all duration-500")}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={atEnd}
          aria-label="Next lesson"
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}