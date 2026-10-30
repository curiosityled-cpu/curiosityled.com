import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import TranscriptTimeline from "@/components/dev-manager/learning/TranscriptTimeline";
import { downloadRecordCsv } from "@/lib/learningRecordExport";

/**
 * The learner's own record. Read-only by design: these entries are written by the
 * server when something happens and cannot be edited afterwards, which is what makes
 * the download worth keeping.
 */
export default function MyLearningRecord({ email }) {
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

  const completed = events.filter((event) => event.event_type === "course_completed").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[11px] text-gray-500">
          {completed} completion{completed === 1 ? "" : "s"} · {events.length} entries
        </span>
        <span className="text-[11px] text-gray-400">
          Written by the server. Entries are append-only and cannot be edited.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 text-xs gap-1.5"
          disabled={events.length === 0}
          onClick={() => downloadRecordCsv(email, events)}
        >
          <Download className="w-3.5 h-3.5" /> Download my record (CSV)
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
          </div>
        ) : (
          <TranscriptTimeline events={events} />
        )}
      </div>
    </div>
  );
}