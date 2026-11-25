import React, { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { EXP_TYPE_LABELS } from "@/components/development/ExperienceCard";
import ExperienceAdoptionPanel from "@/components/development/ExperienceAdoptionPanel";
import { DevSection, DevEmpty, DevRowsSkeleton, SectionButton, SectionLink } from "./DevSection";

const STATUS_BADGE = {
  assigned: "bg-[var(--pf-soft)] text-[var(--pf-muted)]",
  started: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  planned: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  active: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  cancelled: "bg-[var(--pf-soft)] text-[var(--pf-muted)]",
};

const PREVIEW_COUNT = 4;

/** My experiences — compact rows, keeping edit, delete and adoption in place. */
export default function ExperienceRows({
  experiences,
  loading,
  showCompleted,
  onToggleCompleted,
  onLog,
  onEdit,
  onDelete,
  onAdopt,
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? experiences : experiences.slice(0, PREVIEW_COUNT);

  return (
    <DevSection
      title="My experiences"
      subtitle="Coaching, stretch projects, mentorship and more."
      actions={
        <>
          <SectionLink onClick={onToggleCompleted}>
            {showCompleted ? "Show active" : "Show completed"}
          </SectionLink>
          <SectionButton onClick={onLog}>
            <Plus className="h-3.5 w-3.5" /> Log experience
          </SectionButton>
        </>
      }
    >
      {loading ? (
        <DevRowsSkeleton />
      ) : experiences.length === 0 ? (
        <DevEmpty
          icon={Star}
          title={showCompleted ? "No completed experiences yet" : "No active experiences"}
          text="Log coaching, stretch projects, mentorship and more."
          action={
            !showCompleted ? (
              <SectionButton onClick={onLog}>
                <Plus className="h-3.5 w-3.5" /> Log experience
              </SectionButton>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {shown.map((exp) => (
              <li
                key={exp.id}
                className="rounded-[14px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3.5 py-3 transition-colors hover:border-[var(--pf-soft-border)] hover:bg-[var(--pf-panel)]"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-[#E1A45E]/35 bg-[#E1A45E]/10 text-[#B4762E] dark:text-[#E1A45E]">
                    <Star className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--pf-text)]">{exp.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--pf-muted)]">
                      {exp.type && <span>{EXP_TYPE_LABELS[exp.type] || exp.type}</span>}
                      <span
                        className={`rounded-full px-1.5 py-0.5 font-medium capitalize ${
                          STATUS_BADGE[exp.status] || STATUS_BADGE.assigned
                        }`}
                      >
                        {exp.status}
                      </span>
                      {exp.provider_or_sponsor && <span className="truncate">{exp.provider_or_sponsor}</span>}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onEdit(exp)}
                      aria-label={`Edit ${exp.title}`}
                      title="Edit experience"
                      className="rounded-md p-1.5 text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-soft)] hover:text-[var(--pf-text)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(exp)}
                      aria-label={`Delete ${exp.title}`}
                      title="Delete experience"
                      className="rounded-md p-1.5 text-[var(--pf-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {(exp.captured_goals?.length > 0 || exp.recommended_learning?.length > 0) && (
                  <div className="mt-2 pl-12">
                    <ExperienceAdoptionPanel exp={exp} onAdopted={onAdopt} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {experiences.length > PREVIEW_COUNT && (
            <div className="mt-2">
              <SectionLink onClick={() => setExpanded((prev) => !prev)}>
                {expanded ? "Show fewer" : `View all ${experiences.length}`}
              </SectionLink>
            </div>
          )}
        </>
      )}
    </DevSection>
  );
}