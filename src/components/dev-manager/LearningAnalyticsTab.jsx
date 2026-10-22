import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import LearningMetricsStrip from "@/components/dev-manager/learning/LearningMetricsStrip";
import CourseCompletionTable from "@/components/dev-manager/learning/CourseCompletionTable";
import ExternalLearningPanel from "@/components/dev-manager/learning/ExternalLearningPanel";

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);
const today = () => new Date().toISOString().slice(0, 10);
// One entity a viewer may not read should not blank the whole tab — it reports as empty.
const safe = (promise, fallback) => promise.catch(() => fallback);

/**
 * Learning analytics: adoption across courses, learning resources and paths, plus the
 * completions brought in from other systems. Counts and per-course numbers come from the
 * server rather than from loaded records.
 */
export default function LearningAnalyticsTab() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        enrolled,
        completed,
        inProgress,
        overdue,
        resourcesCompleted,
        resourcesOpen,
        journeysEnrolled,
        journeysCompleted,
        externalCount,
        progressPage,
        externalPage,
      ] = await Promise.all([
        safe(base44.entities.CourseProgress.count({}), 0),
        safe(base44.entities.CourseProgress.count({ status: "completed" }), 0),
        safe(base44.entities.CourseProgress.count({ status: "in_progress" }), 0),
        safe(
          base44.entities.CourseProgress.count({
            due_date: { $lt: today() },
            status: { $ne: "completed" },
          }),
          0
        ),
        safe(base44.entities.AssignedLearning.count({ status: "completed" }), 0),
        safe(base44.entities.AssignedLearning.count({ status: { $ne: "completed" } }), 0),
        safe(base44.entities.JourneyEnrollment.count({}), 0),
        safe(base44.entities.JourneyEnrollment.count({ status: "completed" }), 0),
        safe(base44.entities.ExternalLearningRecord.count({}), 0),
        safe(
          base44.entities.CourseProgress.filter({}, { sort: "-created_date", limit: 200 }),
          []
        ),
        safe(
          base44.entities.ExternalLearningRecord.filter({}, { sort: "-created_date", limit: 6 }),
          []
        ),
      ]);

      const rows = asArray(progressPage);

      const byCourse = new Map();
      const learners = new Set();
      rows.forEach((row) => {
        if (row.learner_email) learners.add(row.learner_email);
        const key = row.course_id || row.course_title || "unknown";
        const entry = byCourse.get(key) || {
          key,
          course_title: row.course_title || "Untitled course",
          enrolled: 0,
          completed: 0,
          overdue: 0,
        };
        entry.enrolled += 1;
        if (row.status === "completed") entry.completed += 1;
        if (row.due_date && row.due_date < today() && row.status !== "completed") {
          entry.overdue += 1;
        }
        byCourse.set(key, entry);
      });

      const courseRows = [...byCourse.values()]
        .map((entry) => ({
          ...entry,
          completion_rate: entry.enrolled
            ? Math.round((entry.completed / entry.enrolled) * 100)
            : 0,
        }))
        .sort((a, b) => b.enrolled - a.enrolled);

      setState({
        metrics: {
          enrolled,
          completed,
          inProgress,
          overdue,
          activeLearners: learners.size,
          resourcesCompleted,
          resourcesOpen,
          journeysEnrolled,
          journeysCompleted,
          externalRecords: externalCount,
        },
        courseRows,
        externalRecords: asArray(externalPage),
        externalTotal: externalCount,
      });
    } catch (error) {
      toast.error("Could not load learning analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!state) {
    return (
      <p className="text-sm text-muted-foreground py-12 text-center">
        Learning analytics could not be loaded. Try again in a moment.
      </p>
    );
  }

  const { metrics, courseRows, externalRecords, externalTotal } = state;

  return (
    <div className="space-y-4">
      <LearningMetricsStrip metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CourseCompletionTable rows={courseRows} />
          <CourseInFlightSummary metrics={metrics} />
        </div>
        <ExternalLearningPanel records={externalRecords} total={externalTotal} />
      </div>
    </div>
  );
}

function CourseInFlightSummary({ metrics }) {
  const items = [
    ["Learning resources completed", metrics.resourcesCompleted],
    ["Learning resources still open", metrics.resourcesOpen],
    ["Learning paths enrolled", metrics.journeysEnrolled],
    ["Learning paths completed", metrics.journeysCompleted],
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4">
      <p className="text-sm font-medium mb-3">Beyond courses</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-lg font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}