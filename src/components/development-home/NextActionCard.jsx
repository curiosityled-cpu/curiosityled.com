import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_TONE_CLASSES, KIND_META, dueMeta } from "@/lib/learning";

function ctaLabel(item) {
  if (item.kind === "journey") {
    return item.status === "in_progress" ? "Resume journey" : "Open journey";
  }
  const meta = KIND_META[item.kind] || KIND_META.resource;
  return item.status === "in_progress" ? meta.cta : meta.ctaNew;
}

/**
 * The one dark surface on the page: the single, deterministic next action.
 * Which item it shows is decided by the page (see selectNextAction) so the
 * choice stays auditable and never duplicates another primary call to action.
 */
export default function NextActionCard({ item, onOpen }) {
  const due = item ? dueMeta(item.due_date) : null;
  const percent = Math.min(100, Math.round(item?.percent || 0));
  const kindLabel = item ? (KIND_META[item.kind] || KIND_META.resource).label : null;

  return (
    <section className="relative h-full overflow-hidden rounded-[24px] bg-[#172832] p-6 text-[#E9EEF2] shadow-[0_16px_36px_rgba(23,40,50,0.28)] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#E1A45E]/10 blur-3xl" />

      {item ? (
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E1A45E]">
              {item.status === "in_progress" ? "Pick up where you left off" : "Next up"}
            </p>
            <span className="hidden h-11 w-11 flex-shrink-0 place-items-center rounded-full border border-[#E1A45E]/40 bg-gradient-to-br from-[#E1A45E]/30 to-transparent sm:grid">
              <ArrowUpRight className="h-5 w-5 text-[#E1A45E]" />
            </span>
          </div>

          <h2 className="mt-3 max-w-[520px] text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#E9EEF2] sm:text-[30px]">
            {item.title}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#E9EEF2]/70">
            <span className="font-semibold uppercase tracking-[0.1em] text-[#E9EEF2]/60">{kindLabel}</span>
            {item.meta && <span className="truncate">{item.meta}</span>}
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  DUE_TONE_CLASSES[due.tone]
                )}
              >
                <Clock className="h-3 w-3" /> {due.label}
              </span>
            )}
          </div>

          <div className="mt-auto pt-6">
            {percent > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E9EEF2]/20">
                  <span
                    className="block h-full rounded-full bg-[#E1A45E]"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-xs font-bold text-[#E9EEF2]">{percent}%</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpen(item)}
              className="inline-flex items-center gap-2 rounded-full bg-[#E9EEF2] px-5 py-2.5 text-sm font-bold text-[#172832] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E1A45E]"
            >
              {ctaLabel(item)}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E1A45E]">Next up</p>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#E9EEF2]">
            Nothing assigned right now
          </h2>
          <p className="mt-2 max-w-[440px] text-sm leading-[1.6] text-[#E9EEF2]/70">
            When your program team assigns a journey, course or conversation it lands here — or browse the
            library to pick something yourself.
          </p>
          <Link
            to="/LearningLibrary"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#E9EEF2] px-5 py-2.5 text-sm font-bold text-[#172832] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E1A45E]"
          >
            Browse the library
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}