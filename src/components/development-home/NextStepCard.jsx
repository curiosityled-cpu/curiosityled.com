import React, { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { KIND_META } from "@/lib/learning";
import { Chip, Eyebrow, PrimaryButton, TextButton } from "./ui";

const KIND_LABEL = {
  journey: "Journey",
  course: "Course",
  module: "Conversation",
  resource: "Resource",
};

function ctaFor(item) {
  if (item.kind === "journey") return "Open journey";
  const meta = KIND_META[item.kind] || KIND_META.resource;
  if (item.status === "in_progress") return meta.cta;
  return meta.ctaNew;
}

/**
 * The one primary action on the page. It shows the first item from the ranked
 * list and lets the learner step through the rest — no second primary CTA.
 */
export default function NextStepCard({ items = [], overdue = 0, dueSoon = 0, onOpen }) {
  const [index, setIndex] = useState(0);
  const firstId = items[0]?.id;

  useEffect(() => {
    setIndex(0);
  }, [firstId]);

  const item = items[index] || null;
  const due = item?.days;
  const attention = overdue + dueSoon;

  const scrollToPractice = () => {
    document.getElementById("practice-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[var(--pf-border)] bg-[var(--pf-surface)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#E1A45E]" />
          <Eyebrow>Your next step</Eyebrow>
        </div>
        {items.length > 1 && (
          <TextButton onClick={() => setIndex((prev) => (prev + 1) % items.length)}>
            Show another
          </TextButton>
        )}
      </div>

      {item ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip>{KIND_LABEL[item.kind] || "Learning"}</Chip>
            {due !== undefined && due !== null && due < 0 && (
              <Chip tone="attention">Overdue by {Math.abs(due)}d</Chip>
            )}
            {due !== undefined && due !== null && due === 0 && <Chip tone="attention">Due today</Chip>}
            {due !== undefined && due !== null && due > 0 && due <= 7 && (
              <Chip tone="attention">Due in {due}d</Chip>
            )}
            {item.status === "in_progress" && <Chip tone="accent">In progress</Chip>}
          </div>

          <h2 className="mt-2.5 text-[22px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[var(--pf-text)] sm:text-[26px]">
            {item.title}
          </h2>

          {item.subtitle && (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.5] text-[var(--pf-muted)]">
              {item.subtitle}
            </p>
          )}

          {item.meta && (
            <p className="mt-2 line-clamp-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--pf-muted)]">
              {item.meta}
            </p>
          )}

          {Math.round(item.percent || 0) > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pf-soft)]">
                <span
                  className="block h-full rounded-full bg-[#E1A45E]"
                  style={{ width: `${Math.min(100, Math.round(item.percent))}%` }}
                />
              </span>
              <span className="text-[11px] font-bold text-[var(--pf-text)]">
                {Math.round(item.percent)}%
              </span>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
            <PrimaryButton onClick={() => onOpen(item)}>
              {ctaFor(item)}
              <ArrowRight className="h-3.5 w-3.5" />
            </PrimaryButton>
            <span className="text-[11px] text-[var(--pf-muted)]">
              {item.kind === "journey" ? "Continue the path you started." : "Picked from your assigned work."}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--pf-text)]">
            Nothing assigned right now
          </h2>
          <p className="mt-1.5 max-w-[420px] text-[13px] leading-[1.5] text-[var(--pf-muted)]">
            There is no journey, course or experience waiting on you. Use the time for a short practice
            session — it is the fastest way to keep your leadership moving.
          </p>
          <div className="mt-auto pt-5">
            <PrimaryButton onClick={scrollToPractice}>
              Go to practice &amp; tools
              <ArrowRight className="h-3.5 w-3.5" />
            </PrimaryButton>
          </div>
        </div>
      )}

      {attention > 0 && (
        <p className="mt-4 border-t border-[var(--pf-border)] pt-3 text-[11px] text-[var(--pf-muted)]">
          {overdue > 0 && <span className="font-bold text-[#B4762E] dark:text-[#E1A45E]">{overdue} overdue</span>}
          {overdue > 0 && dueSoon > 0 && " · "}
          {dueSoon > 0 && `${dueSoon} due this week`}
          {" — everything else is listed below."}
        </p>
      )}
    </section>
  );
}