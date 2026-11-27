import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Lock,
  MessageSquare,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import JourneyStepPanel from "@/components/journey-trail/JourneyStepPanel";
import { cn } from "@/lib/utils";

const KIND_LABEL = {
  resource: "Learn",
  signal: "Reflect",
  experience: "Experience",
};

const stepMeta = (step, resource) => {
  const parts = [KIND_LABEL[step.kind] || "Step"];
  if (step.kind === "resource") {
    if (resource?.type) parts.push(String(resource.type).replace(/_/g, " "));
    if (resource?.duration_string) parts.push(resource.duration_string);
  }
  if (step.kind === "signal" && step.subtitle) parts.push(String(step.subtitle).replace(/_/g, " "));
  if (step.kind === "experience" && step.subtitle) parts.push(String(step.subtitle).replace(/_/g, " "));
  return parts.filter(Boolean).join(" · ");
};

/**
 * The trail: one continuous path, steps in the order the journey was authored.
 * A step opens in place, so reading and watching never leave the path.
 */
export default function JourneyTrail({
  steps,
  progressMap,
  lockedKeys,
  nextId,
  resources,
  busyKey,
  onToggle,
  onStartSignal,
}) {
  const nextKey = steps.find((step) => step.kind === "resource" && step.id === nextId)?.key;
  const [openKey, setOpenKey] = useState(nextKey || null);

  return (
    <ol className="relative space-y-3">
      {steps.map((step, index) => {
        const resource = step.id ? resources[step.id] : null;
        const done = step.kind === "resource" && progressMap[step.id] === "completed";
        const locked = lockedKeys.has(step.key);
        const isNext = !done && !locked && step.key === nextKey;
        const busy = busyKey === step.key;
        const open = openKey === step.key;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.key} className="relative pl-11 sm:pl-14">
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[15px] top-9 bottom-[-12px] w-px bg-[var(--pf-dash)] sm:left-[19px]"
              />
            )}

            <span
              className={cn(
                "absolute left-0 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10",
                done
                  ? "bg-emerald-500 text-white"
                  : locked
                  ? "border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] text-[var(--pf-muted)]"
                  : isNext
                  ? "bg-[#0202ff] text-white shadow-[0_0_0_4px_rgba(2,2,255,0.12)]"
                  : "border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] text-[var(--pf-muted)]"
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : locked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                index + 1
              )}
            </span>

            <div
              className={cn(
                "overflow-hidden rounded-2xl border bg-[var(--pf-surface)] transition-colors",
                open
                  ? "border-[#0202ff]/35 shadow-sm"
                  : isNext
                  ? "border-[#0202ff]/25"
                  : "border-[var(--pf-soft-border)]",
                locked && "border-dashed opacity-70"
              )}
            >
              <button
                type="button"
                disabled={locked}
                onClick={() => setOpenKey(open ? null : step.key)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[var(--pf-soft)] disabled:cursor-not-allowed sm:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--pf-muted)]">
                      {KIND_LABEL[step.kind] || "Step"}
                    </span>
                    {step.optional && (
                      <span className="rounded-full border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] px-1.5 py-0.5 text-[10px] text-[var(--pf-muted)]">
                        Optional
                      </span>
                    )}
                    {isNext && (
                      <span className="rounded-full bg-[#0202ff] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Up next
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-sm font-semibold",
                      done ? "text-[var(--pf-muted)] line-through" : "text-[var(--pf-text)]"
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] capitalize text-[var(--pf-muted)]">
                    {locked ? "Complete the earlier steps to unlock" : stepMeta(step, resource)}
                  </span>
                </span>

                <span className="flex flex-shrink-0 items-center gap-1.5 text-[var(--pf-muted)]">
                  {step.kind === "signal" && <MessageSquare className="h-3.5 w-3.5" />}
                  {step.kind === "experience" && <Sparkles className="h-3.5 w-3.5" />}
                  {isNext && <PlayCircle className="h-4 w-4 text-[#0202ff]" />}
                  {!locked && !open && <Circle className="h-1.5 w-1.5 fill-current" />}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                  />
                </span>
              </button>

              {open && !locked && (
                <div className="px-3.5 pb-3.5 sm:px-4">
                  <JourneyStepPanel
                    step={step}
                    resource={resource}
                    done={done}
                    busy={busy}
                    onToggle={onToggle}
                    onStartSignal={onStartSignal}
                  />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}