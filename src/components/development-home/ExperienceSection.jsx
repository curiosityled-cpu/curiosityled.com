import React, { useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Star, Trash2 } from "lucide-react";
import ExperienceAdoptionPanel from "@/components/development/ExperienceAdoptionPanel";
import { EXP_TYPE_LABELS } from "@/components/development/ExperienceCard";
import { Chip, EmptyNote, RowSkeleton, SectionHeading, TextButton } from "./ui";

const PREVIEW_COUNT = 5;

const STATUS_LABEL = {
  assigned: "Assigned",
  started: "Started",
  in_progress: "In progress",
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Row({ exp, onEdit, onDelete, onAdopt }) {
  const status = STATUS_LABEL[exp.status] || exp.status;
  const start = formatDate(exp.start_date);
  const canAdopt = (exp.captured_goals || []).length > 0 || (exp.recommended_learning || []).length > 0;

  return (
    <li className="rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3.5 py-3 transition-colors hover:border-[var(--pf-accent)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {exp.type && <Chip>{EXP_TYPE_LABELS[exp.type] || exp.type}</Chip>}
            {status && <Chip tone={exp.status === "completed" ? "accent" : "neutral"}>{status}</Chip>}
            {start && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--pf-muted)]">
                <CalendarDays className="h-3 w-3" /> {start}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm font-semibold text-[var(--pf-text)]">{exp.title}</p>
          {exp.description && (
            <p className="line-clamp-1 text-[11px] text-[var(--pf-muted)]">{exp.description}</p>
          )}
          {exp.provider_or_sponsor && (
            <p className="mt-0.5 truncate text-[11px] text-[var(--pf-muted)]">{exp.provider_or_sponsor}</p>
          )}

          {canAdopt && (
            <div className="mt-1">
              <ExperienceAdoptionPanel exp={exp} onAdopted={onAdopt} />
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(exp)}
            title="Edit experience"
            aria-label={`Edit ${exp.title}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-soft)] hover:text-[var(--pf-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pf-accent)]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(exp)}
            title="Delete experience"
            aria-label={`Delete ${exp.title}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-soft)] hover:text-[#B4442E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pf-accent)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

/** Coaching, stretch projects and mentorship — compact, status-aware rows. */
export default function ExperienceSection({
  experiences = [],
  loading,
  onLog,
  onEdit,
  onDelete,
  onAdopt,
}) {
  const [tab, setTab] = useState("active");
  const [showAll, setShowAll] = useState(false);

  const { active, completed } = useMemo(
    () => ({
      active: experiences.filter((exp) => exp.status !== "completed" && exp.status !== "cancelled"),
      completed: experiences.filter((exp) => exp.status === "completed"),
    }),
    [experiences]
  );

  const list = tab === "active" ? active : completed;
  const visible = showAll ? list : list.slice(0, PREVIEW_COUNT);

  const TabButton = ({ value, label, count }) => (
    <button
      type="button"
      aria-pressed={tab === value}
      onClick={() => {
        setTab(value);
        setShowAll(false);
      }}
      className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pf-accent)] ${
        tab === value
          ? "bg-[var(--pf-accent)] text-white"
          : "border border-[var(--pf-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)] hover:bg-[var(--pf-soft)]"
      }`}
    >
      {label} <span className="opacity-70">{count}</span>
    </button>
  );

  return (
    <section className="mx-4 mt-10 sm:mx-6 sm:ml-12 lg:ml-16">
      <SectionHeading
        eyebrow="Experiences"
        title="My experiences"
        subtitle="Coaching, stretch projects, mentorship and the goals that came out of them."
      >
        <TabButton value="active" label="Active" count={active.length} />
        <TabButton value="completed" label="Completed" count={completed.length} />
        <button
          type="button"
          onClick={onLog}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#3B7890] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#2f6379] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B7890]"
        >
          <Plus className="h-3.5 w-3.5" /> Log experience
        </button>
      </SectionHeading>

      {loading ? (
        <RowSkeleton />
      ) : list.length === 0 ? (
        <EmptyNote
          icon={Star}
          title={tab === "active" ? "No active experiences" : "No completed experiences yet"}
          text="Log coaching, a stretch project or mentorship to keep a record of what you have done."
          action={
            tab === "active" ? (
              <button
                type="button"
                onClick={onLog}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#3B7890] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#2f6379]"
              >
                <Plus className="h-3.5 w-3.5" /> Log experience
              </button>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((exp) => (
              <Row key={exp.id} exp={exp} onEdit={onEdit} onDelete={onDelete} onAdopt={onAdopt} />
            ))}
          </ul>

          {list.length > PREVIEW_COUNT && (
            <div className="mt-3 flex justify-center">
              <TextButton onClick={() => setShowAll((prev) => !prev)}>
                {showAll ? "Show fewer" : `Show all ${list.length}`}
              </TextButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}