import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import TranscriptTimeline from "@/components/dev-manager/learning/TranscriptTimeline";
import { downloadLearningRecordCsv, downloadLearningRecordPdf } from "@/lib/learningRecordExport";

const KIND_LABEL = {
  journey: "Journey",
  course: "Course",
  resource: "Resource",
  module: "Conversation",
};

/**
 * The learner's own record. Completions across journeys, courses, resources,
 * conversations and experiences sit above the append-only activity trail the
 * server writes, so the whole record can be downloaded as CSV or PDF.
 */
export default function MyLearningRecord({ email, items = [], experiences = [] }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    setLoading(true);
    base44.entities.LearningRecordEvent.filter(
      { learner_email: email },
      { sort: "-occurred_at", limit: 200 }
    )
      .then((page) => {
        if (!cancelled) setEvents(Array.isArray(page) ? page : page?.items || []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const completions = useMemo(() => {
    const fromLearning = items
      .filter((item) => item.status === "completed")
      .map((item) => ({
        date: item.raw?.completed_date || item.raw?.updated_date || null,
        type: KIND_LABEL[item.kind] || "Learning",
        title: item.title,
      }));
    const fromExperiences = experiences
      .filter((exp) => exp.status === "completed")
      .map((exp) => ({
        date: exp.end_date || exp.updated_date || null,
        type: "Experience",
        title: exp.title,
      }));
    return [...fromLearning, ...fromExperiences].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [items, experiences]);

  const hasRecord = completions.length > 0 || events.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] text-[var(--pf-muted)]">
          {completions.length} completion{completions.length === 1 ? "" : "s"} ·{" "}
          {events.length} activity {events.length === 1 ? "entry" : "entries"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!hasRecord}
            onClick={() => downloadLearningRecordCsv(email, { completions, events })}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!hasRecord}
            onClick={() => downloadLearningRecordPdf(email, { completions, events })}
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--pf-muted)]">
        Written by the server. Activity entries are append-only and cannot be edited.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--pf-accent)]" />
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pf-muted)]">
              Completions
            </p>
            {completions.length === 0 ? (
              <p className="text-[12px] text-[var(--pf-muted)]">
                Nothing completed yet. Finished journeys, courses, conversations and experiences
                appear here.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {completions.map((row, index) => (
                  <li
                    key={`${row.type}-${row.title}-${index}`}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] px-3 py-2"
                  >
                    <span className="w-[74px] flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--pf-muted)]">
                      {row.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--pf-text)]">
                      {row.title}
                    </span>
                    <span className="flex-shrink-0 text-[11px] text-[var(--pf-muted)]">
                      {row.date ? new Date(row.date).toLocaleDateString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pf-muted)]">
              Activity
            </p>
            <div className="rounded-xl border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] px-3 py-2">
              <TranscriptTimeline events={events} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}