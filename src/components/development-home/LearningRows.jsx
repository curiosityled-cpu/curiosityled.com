import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, Check, Clock, GraduationCap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_TONE_CLASSES, KIND_META, dueMeta } from "@/lib/learning";
import { DevSection, DevEmpty, DevRowsSkeleton, SectionLink } from "./DevSection";

const KIND_ICON = { course: GraduationCap, resource: BookOpen, module: MessageSquare };
const PREVIEW_COUNT = 4;

/** My courses & learning — compact rows that keep the shelf's resume behaviour. */
export default function LearningRows({
  items,
  loading,
  showCompleted,
  onToggleCompleted,
  onOpen,
  onMarkComplete,
  busyId,
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <DevSection
      title="My courses & learning"
      subtitle="Assigned courses, resources and conversations."
      actions={
        <>
          <Link
            to="/LearningLibrary"
            className="text-xs font-bold text-[var(--pf-accent)] transition-colors hover:text-[#E1A45E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
          >
            Course library
          </Link>
          <SectionLink onClick={onToggleCompleted}>
            {showCompleted ? "Show active" : "Show completed"}
          </SectionLink>
        </>
      }
    >
      {loading ? (
        <DevRowsSkeleton />
      ) : items.length === 0 ? (
        <DevEmpty
          icon={GraduationCap}
          title={showCompleted ? "Nothing completed yet" : "Nothing assigned right now"}
          text="When your program team assigns a course, resource or conversation it lands here."
          action={
            <Link
              to="/LearningLibrary"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3B7890] bg-[#3B7890] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#2f6379]"
            >
              Browse the course library
            </Link>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {shown.map((item) => {
              const meta = KIND_META[item.kind] || KIND_META.resource;
              const Icon = KIND_ICON[item.kind] || BookOpen;
              const due = dueMeta(item.due_date);
              const complete = item.status === "completed";
              const cta = complete ? "Review" : item.status === "in_progress" ? meta.cta : meta.ctaNew;

              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-[14px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3.5 py-3 transition-colors hover:border-[var(--pf-soft-border)] hover:bg-[var(--pf-panel)]"
                >
                  <span className={cn("grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border", meta.chipClass)}>
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--pf-text)]">{item.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--pf-muted)]">
                      <span className="font-semibold uppercase tracking-[0.08em]">{meta.label}</span>
                      {item.meta && <span className="truncate">{item.meta}</span>}
                      {due && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
                            DUE_TONE_CLASSES[due.tone]
                          )}
                        >
                          {due.tone === "danger" ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {due.label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1">
                    {item.kind === "resource" && !complete && onMarkComplete && (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => onMarkComplete(item)}
                        aria-label={`Mark ${item.title} complete`}
                        title="Mark complete"
                        className="rounded-lg border border-[var(--pf-border)] p-1.5 text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-soft)] hover:text-[var(--pf-text)] disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-[var(--pf-accent)] transition-colors hover:bg-[var(--pf-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)]"
                    >
                      {cta}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {items.length > PREVIEW_COUNT && (
            <div className="mt-2">
              <SectionLink onClick={() => setExpanded((prev) => !prev)}>
                {expanded ? "Show fewer" : `View all ${items.length}`}
              </SectionLink>
            </div>
          )}
        </>
      )}
    </DevSection>
  );
}