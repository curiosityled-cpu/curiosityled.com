import React from "react";
import { AlertTriangle, BookOpen, Check, Clock, GraduationCap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_TONE_CLASSES, KIND_META, dueMeta } from "@/lib/learning";

const KIND_ICON = {
  course: GraduationCap,
  resource: BookOpen,
  module: MessageSquare,
};

/** One assigned course, resource or conversation, sized for a shelf. */
export default function LearningShelfCard({ item, onOpen, onMarkComplete, busy }) {
  const meta = KIND_META[item.kind] || KIND_META.resource;
  const Icon = KIND_ICON[item.kind] || BookOpen;
  const due = dueMeta(item.due_date);
  const complete = item.status === "completed";
  const cta = complete
    ? item.kind === "resource"
      ? "Review"
      : "Open"
    : item.status === "in_progress"
    ? meta.cta
    : meta.ctaNew;

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0202ff]/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", meta.chipClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                DUE_TONE_CLASSES[due.tone]
              )}
            >
              {due.tone === "danger" ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {due.label}
            </span>
          )}
          {complete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <Check className="h-3 w-3" /> Done
            </span>
          )}
        </div>
      </div>

      <p className={cn("mt-2.5 inline-block w-fit rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.chipClass)}>
        {meta.label}
      </p>

      <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground line-clamp-2">{item.title}</h3>
      {item.subtitle && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.subtitle}</p>
      )}

      <div className="mt-auto pt-3">
        {item.meta && <p className="mb-2 text-[11px] text-muted-foreground line-clamp-1">{item.meta}</p>}

        {typeof item.percent === "number" && item.percent > 0 && !complete && (
          <div className="mb-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", meta.barClass)}
                style={{ width: `${Math.min(100, item.percent)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.percent}% complete</p>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpen?.(item)}
            className="flex-1 rounded-lg bg-[#0202ff] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0101dd]"
          >
            {cta}
          </button>
          {item.kind === "resource" && !complete && onMarkComplete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMarkComplete(item)}
              title="Mark complete"
              className="rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}