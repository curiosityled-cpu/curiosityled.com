import React from "react";
import { Check, Clock, AlertTriangle, BookOpen, MessageSquare, Map, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_TONE_CLASSES, KIND_META, dueMeta } from "@/lib/learning";

const KIND_ICON = {
  course: GraduationCap,
  resource: BookOpen,
  module: MessageSquare,
  journey: Map,
};

const STATUS_CHIP = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  in_progress: "bg-blue-50 text-blue-700 border-blue-100",
  not_started: "bg-muted text-muted-foreground border-border",
};

/**
 * One learner work item (course, resource, conversation or journey) with its
 * progress, due date and the single next action.
 */
export default function LearnerItemCard({ item, onOpen, onMarkComplete, busy }) {
  const meta = KIND_META[item.kind] || KIND_META.resource;
  const Icon = KIND_ICON[item.kind] || BookOpen;
  const due = dueMeta(item.due_date);
  const complete = item.status === "completed";
  const started = item.status === "in_progress";
  const canOpen = !complete || item.kind === "journey" || item.kind === "course";
  const cta = complete && item.kind === "resource" ? "Review" : !started ? meta.ctaNew : meta.cta;

  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-[#0202ff]/20">
      <div className="flex items-start gap-4">
        <div className={cn("w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center", meta.chipClass)}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", meta.chipClass)}>
              {meta.label}
            </span>
            {item.status && (
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", STATUS_CHIP[item.status])}>
                {item.status.replace("_", " ")}
              </span>
            )}
            {due && (
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1", DUE_TONE_CLASSES[due.tone])}>
                {due.tone === "danger" ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {due.label}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-foreground leading-snug">{item.title}</h3>

          {item.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.subtitle}</p>
          )}

          {item.meta && (
            <p className="mt-1.5 text-xs text-muted-foreground">{item.meta}</p>
          )}

          {typeof item.percent === "number" && item.percent > 0 && !complete && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", meta.barClass)}
                  style={{ width: `${Math.min(100, item.percent)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.percent}% complete</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canOpen && (
              <button
                type="button"
                onClick={() => onOpen?.(item)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0202ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0101dd]"
              >
                {cta}
              </button>
            )}
            {item.kind === "resource" && !complete && onMarkComplete && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onMarkComplete(item)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Mark complete
              </button>
            )}
            {complete && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <Check className="w-4 h-4" />
                Completed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}