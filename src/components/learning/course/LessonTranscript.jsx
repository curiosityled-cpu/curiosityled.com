import React from "react";
import { clockLabel } from "@/lib/vtt";

/**
 * The written form of a lesson video, built from the captions that were attached to it.
 * Reading is a first-class way to take a lesson in, not a fallback.
 */
export default function LessonTranscript({ cues = [], onSeek }) {
  if (!cues.length) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No transcript was attached to this lesson.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Transcript
        </span>
        <span className="text-[11px] text-muted-foreground">
          {cues.length} line{cues.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto px-2 py-2">
        <ol className="space-y-0.5">
          {cues.map((cue, index) => (
            <li key={`${cue.start}-${index}`}>
              <button
                type="button"
                onClick={() => onSeek?.(cue.start)}
                className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1 text-left text-sm text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0202ff]/40"
              >
                <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {clockLabel(cue.start)}
                </span>
                <span className="min-w-0 flex-1">{cue.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}