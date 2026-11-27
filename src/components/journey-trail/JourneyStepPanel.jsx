import React from "react";
import { Check, ExternalLink, Loader2, MessageSquare } from "lucide-react";
import LessonVideoPlayer from "@/components/learning/course/LessonVideoPlayer";
import InlineDocument from "@/components/journey-trail/InlineDocument";
import { getResourceFileUri, getResourceMediaKind } from "@/lib/resourceFile";
import { getResourceVideoEmbed } from "@/lib/videoEmbed";

/**
 * One step, opened in place. Reading and watching happen here so the learner
 * never leaves the trail to consume a step.
 */
export default function JourneyStepPanel({ step, resource, done, busy, onToggle, onStartSignal }) {
  const fileUri = getResourceFileUri(resource);
  const kind = getResourceMediaKind(resource);
  const playsVideoFile = kind === "video" && !!fileUri;
  const embedUrl = playsVideoFile ? null : getResourceVideoEmbed(resource);

  return (
    <div className="mt-3 rounded-2xl border border-[var(--pf-soft-border)] bg-[var(--pf-panel)] p-3 sm:p-4">
      {step.kind === "resource" && (
        <div className="space-y-3">
          {resource?.description && (
            <p className="text-sm leading-relaxed text-[var(--pf-text)]">{resource.description}</p>
          )}

          {playsVideoFile ? (
            <LessonVideoPlayer
              resource={resource}
              embedUrl={null}
              title={step.title}
              onEnded={() => !done && onToggle?.(step)}
            />
          ) : embedUrl ? (
            <LessonVideoPlayer
              resource={resource}
              embedUrl={embedUrl}
              title={step.title}
              onEnded={() => !done && onToggle?.(step)}
            />
          ) : kind === "document" ? (
            <InlineDocument resource={resource} />
          ) : resource?.url ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-surface)] px-3 py-2 text-xs font-medium text-[var(--pf-text)] transition-colors hover:bg-[var(--pf-soft-hover)]"
            >
              Open this resource
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="text-xs text-[var(--pf-muted)]">
              This step has no material attached yet. Ask your program team to add it.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {done ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Step complete
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onToggle?.(step)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0202ff] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0101dd] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Mark this step done
              </button>
            )}
            {done && (
              <button
                type="button"
                onClick={() => onToggle?.(step)}
                disabled={busy}
                className="text-xs text-[var(--pf-muted)] underline-offset-2 hover:underline disabled:opacity-60"
              >
                Mark as not started
              </button>
            )}
          </div>
        </div>
      )}

      {step.kind === "signal" && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-[var(--pf-text)]">
            {step.subtitle
              ? `This journey includes a ${String(step.subtitle).replace(/_/g, " ")}. Your answers feed the reflection that follows.`
              : "This journey includes an activity. Your answers feed the reflection that follows."}
          </p>
          <button
            type="button"
            onClick={() => onStartSignal?.(step)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0202ff] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0101dd]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Start the activity
          </button>
        </div>
      )}

      {step.kind === "experience" && (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-[var(--pf-text)]">
            {step.entry?.description || "An off-platform experience that runs alongside your learning."}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--pf-muted)]">
            {step.entry?.provider_or_sponsor && <span>{step.entry.provider_or_sponsor}</span>}
            {step.entry?.start_date && <span>Starts {step.entry.start_date}</span>}
            {step.entry?.end_date && <span>Ends {step.entry.end_date}</span>}
          </div>
        </div>
      )}
    </div>
  );
}