import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import TranscriptTimeline from "./TranscriptTimeline";

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);
const safe = (promise, fallback) => promise.catch(() => fallback);

const DATALIST_ID = "learning-record-learners";

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCsv(learner, events) {
  const header = ["Occurred at", "Event", "Learner", "Actor", "Course", "Version", "Lesson", "Detail"];
  const lines = events.map((event) => [
    event.occurred_at || event.created_date,
    event.event_type,
    event.learner_email,
    event.actor_email || "",
    event.course_title || "",
    event.course_version ?? "",
    event.lesson_title || "",
    event.metadata ? JSON.stringify(event.metadata) : "",
  ]);
  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `learning-record-${learner.replace(/[^a-z0-9@._-]/gi, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Records — one learner at a time, showing what actually happened and offering the
 * packet an auditor asks for (a CSV of the record itself).
 */
export default function RecordsPanel() {
  const [learners, setLearners] = useState([]);
  const [learner, setLearner] = useState("");
  const [events, setEvents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const rows = await safe(base44.entities.CourseProgress.list({ distinct: "learner_email" }), []);
      const emails = asArray(rows).filter(Boolean);
      setLearners(emails);
      if (emails.length > 0) setLearner(emails[0]);
    })();
  }, []);

  const load = useCallback(async (email) => {
    if (!email) return;
    setLoading(true);
    try {
      const [eventPage, progressRows, certificateRows] = await Promise.all([
        safe(base44.entities.LearningRecordEvent.filter({ learner_email: email }, { sort: "-occurred_at", limit: 200 }), []),
        safe(base44.entities.CourseProgress.filter({ learner_email: email }), []),
        safe(base44.entities.LearningCertificate.filter({ user_email: email }), []),
      ]);
      setEvents(asArray(eventPage));
      setProgress(asArray(progressRows));
      setCertificates(asArray(certificateRows));
    } catch (error) {
      console.error("Could not load learning record", error);
      toast.error("Could not load this learner's record");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(learner);
  }, [learner, load]);

  const summary = useMemo(() => {
    const completed = progress.filter((row) => row.status === "completed").length;
    const inProgress = progress.filter((row) => row.status !== "completed").length;
    const last = events[0];
    return {
      completed,
      inProgress,
      certificates: certificates.length,
      lastActivity: last ? format(new Date(last.occurred_at || last.created_date), "MMM d, yyyy") : "—",
    };
  }, [progress, certificates, events]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Input
            list={DATALIST_ID}
            value={learner}
            onChange={(e) => setLearner(e.target.value.trim())}
            placeholder="Find a learner by email"
            className="h-8 w-72 text-xs bg-white font-mono"
          />
          <datalist id={DATALIST_ID}>
            {learners.map((email) => (
              <option key={email} value={email} />
            ))}
          </datalist>
        </div>
        <span className="text-[11px] text-gray-400">
          {learners.length} learner{learners.length === 1 ? "" : "s"} on record
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 text-xs gap-1.5"
          disabled={!learner || events.length === 0}
          onClick={() => downloadCsv(learner, events)}
        >
          <Download className="w-3.5 h-3.5" /> Download record (CSV)
        </Button>
      </div>

      {!learner ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-600">Choose a learner to open their record.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_15rem]">
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 min-h-[18rem]">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
              </div>
            ) : (
              <TranscriptTimeline events={events} />
            )}
          </div>

          <div className="space-y-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Summary</p>
              <dl className="mt-3 space-y-2">
                {[
                  ["Completed", summary.completed],
                  ["Outstanding", summary.inProgress],
                  ["Certificates", summary.certificates],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between">
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="font-mono text-sm tabular-nums text-gray-900">{value}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between pt-2 border-t border-gray-50">
                  <dt className="text-xs text-gray-500">Last activity</dt>
                  <dd className="font-mono text-[11px] tabular-nums text-gray-600">{summary.lastActivity}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Integrity</p>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                Completion and certificates are written by the server, not the browser. Records are
                append-only, so nothing here can be edited or deleted after the fact.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}