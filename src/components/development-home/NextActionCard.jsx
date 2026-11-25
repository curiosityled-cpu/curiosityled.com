import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_TONE_CLASSES, KIND_META, dueMeta } from "@/lib/learning";

const BACKDROP_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/7bf92102343e8d0a7e30b33399f6a9c1_generated_image.png";

function ctaLabel(item) {
  if (item.kind === "journey") {
    return item.status === "in_progress" ? "Resume journey" : "Open journey";
  }
  const meta = KIND_META[item.kind] || KIND_META.resource;
  return item.status === "in_progress" ? meta.cta : meta.ctaNew;
}

/**
 * The brand-blue surface for the single, deterministic next action.
 * Which item it shows is decided by the page (see selectNextAction) so the
 * choice stays auditable and never duplicates another primary call to action.
 */
export default function NextActionCard({ item, onOpen }) {
  const due = item ? dueMeta(item.due_date) : null;
  const percent = Math.min(100, Math.round(item?.percent || 0));
  const kindLabel = item ? (KIND_META[item.kind] || KIND_META.resource).label : null;

  // Two distinct moves: the image drifts in and holds while hovered, then
  // settles back when the pointer leaves.
  const [hovered, setHovered] = useState(false);
  const [hasHovered, setHasHovered] = useState(false);

  const imageAnimation = hovered
    ? "nextup-image-in 8s ease-out forwards"
    : hasHovered
      ? "nextup-image-out 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards"
      : undefined;

  return (
    <section
      onMouseEnter={() => {
        setHasHovered(true);
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      className="relative h-full overflow-hidden rounded-[24px] bg-[#0202ff] p-6 text-white shadow-[0_16px_36px_rgba(2,2,255,0.22)] sm:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2222ff] via-[#0202ff] to-[#0404b4]" />
      <img
        src={BACKDROP_IMAGE}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-screen"
        style={{ animation: imageAnimation, willChange: "transform" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0202ff]/85 via-[#0202ff]/50 to-[#0202ff]/15" />

      {item ? (
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
              {item.status === "in_progress" ? "Pick up where you left off" : "Next up"}
            </p>
            <span className="hidden h-11 w-11 flex-shrink-0 place-items-center rounded-full border border-white/30 bg-white/10 sm:grid">
              <ArrowUpRight className="h-5 w-5 text-white" />
            </span>
          </div>

          <h2 className="mt-3 max-w-[520px] text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-[30px]">
            {item.title}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/75">
            <span className="font-semibold uppercase tracking-[0.1em] text-white/65">{kindLabel}</span>
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
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="text-xs font-bold text-white">{percent}%</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpen(item)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0202ff] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              {ctaLabel(item)}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col justify-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">Next up</p>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white">
            Nothing assigned right now
          </h2>
          <p className="mt-2 max-w-[440px] text-sm leading-[1.6] text-white/75">
            When your program team assigns a journey, course or conversation it lands here — or browse the
            library to pick something yourself.
          </p>
          <Link
            to="/LearningLibrary"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0202ff] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            Browse the library
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}