import React, { useMemo, useState } from "react";
import { BookOpen, Check, GraduationCap, MessageSquare } from "lucide-react";
import { KIND_META, dueMeta } from "@/lib/learning";
import { Chip, EmptyNote, RowSkeleton, SectionHeading, TextButton } from "./ui";

const PREVIEW_COUNT = 5;

const KIND_ICON = { course: GraduationCap, resource: BookOpen, module: MessageSquare };

function Row({ item, onOpen, onMarkComplete, busy }) {
  const meta = KIND_META[item.kind] || KIND_META.resource;
  const Icon = KIND_ICON[item.kind] || BookOpen;
  const due = dueMeta(item.due_date);
  const complete = item.status === "completed";
  const percent = Math.round(item.percent || 0);
  const cta = complete ? (item.kind === "resource" ? "Review" : "Open") : item.status === "in_progress" ? meta.cta : meta.ctaNew;

  return (
    <li className="rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3.5 py-3 transition-colors hover:border-[var(--pf-accent)]">
      <div className="flex items-center gap-3">
        <span className="hidden h-9 w-9 flex-shrink-0 place-items-center rounded-lg border border-[var(--pf-border)] bg-[var(--pf-soft)] text-[var(--pf-accent)] sm:grid">
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>{meta.label}</Chip>
            {due && !complete && (
              <Chip tone={due.tone === "danger" ? "attention" : "neutral"}>{due.label}</Chip>
            )}
            {complete && <Chip tone="accent">Completed</Chip>}
          </div>

          <p className="mt-1 truncate text-sm font-semibold text-[var(--pf-text)]">{item.title}</p>
          {item.meta && <p className="truncate text-[11px] text-[var(--pf-muted)]">{item.meta}</p>}

          {percent > 0 && !complete && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-1 w-24 overflow-hidden rounded-full bg-[var(--pf-soft)]">
                <span
                  className="block h-full rounded-full bg-[var(--pf-accent)]"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </span>
              <span className="text-[10px] font-medium text-[var(--pf-muted)]">{percent}%</span>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {item.kind === "resource" && !complete && onMarkComplete && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMarkComplete(item)}
              title="Mark complete"
              aria-label={`Mark ${item.title} complete`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--pf-border)] text-[var(--pf-muted)] transition-colors hover:bg-[var(--pf-soft)] hover:text-[var(--pf-text)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--pf-accent)]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="whitespace-nowrap rounded-lg bg-[#3B7890] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#2f6379] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B7890]"
          >
            {cta}
          </button>
        </div>
      </div>
    </li>
  );
}

/** Courses, resources and conversations — compact rows, active or completed. */
export default function LearningSection({ items = [], loading, onOpen, onMarkComplete, busyId }) {
  const [tab, setTab] = useState("active");
  const [showAll, setShowAll] = useState(false);

  const { active, completed } = useMemo(
    () => ({
      active: items.filter((item) => item.status !== "completed"),
      completed: items.filter((item) => item.status === "completed"),
    }),
    [items]
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
        eyebrow="Courses & learning"
        title="My courses & learning"
        subtitle="Assigned courses, resources and conversations — resume where you left off."
      >
        <TabButton value="active" label="Active" count={active.length} />
        <TabButton value="completed" label="Completed" count={completed.length} />
      </SectionHeading>

      {loading ? (
        <RowSkeleton />
      ) : list.length === 0 ? (
        <EmptyNote
          icon={GraduationCap}
          title={tab === "active" ? "Nothing assigned right now" : "No completed learning yet"}
          text={
            tab === "active"
              ? "When your programme team assigns a course, resource or conversation it lands here."
              : "Finished courses and resources will collect here."
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((item) => (
              <Row
                key={item.id}
                item={item}
                onOpen={onOpen}
                onMarkComplete={onMarkComplete}
                busy={busyId === item.id}
              />
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