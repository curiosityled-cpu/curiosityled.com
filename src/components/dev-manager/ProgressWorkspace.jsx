import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import LearningAnalyticsTab from "@/components/dev-manager/LearningAnalyticsTab";
import AssignmentsBoard from "@/components/dev-manager/learning/AssignmentsBoard";
import RecordsPanel from "@/components/dev-manager/learning/RecordsPanel";
import RetentionPanel from "@/components/dev-manager/learning/RetentionPanel";

/**
 * Progress is the consumption side of the house: it never creates or edits content.
 * It answers three questions — what is owed, what happened, and is it being used.
 */
const SEGMENTS = [
  { id: "assignments", label: "Assignments", hint: "Who owes what" },
  { id: "records", label: "Records", hint: "The evidence" },
  { id: "insights", label: "Insights", hint: "Adoption" },
];

export default function ProgressWorkspace({ user }) {
  const [segment, setSegment] = useState("assignments");
  const [overdue, setOverdue] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    base44.entities.CourseProgress
      .count({ due_date: { $lt: today }, status: { $ne: "completed" } })
      .then(setOverdue)
      .catch(() => setOverdue(0));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-5 border-b border-gray-200 overflow-x-auto">
        {SEGMENTS.map((item) => {
          const active = segment === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSegment(item.id)}
              className={`-mb-px pb-2 border-b-2 text-left transition-colors whitespace-nowrap ${
                active ? "border-[#0202ff]" : "border-transparent hover:border-gray-300"
              }`}
            >
              <span
                className={`flex items-center gap-1.5 text-sm font-semibold ${
                  active ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {item.label}
                {item.id === "assignments" && overdue > 0 && (
                  <span className="font-mono text-[10px] px-1 rounded bg-red-50 text-red-600 tabular-nums">
                    {overdue}
                  </span>
                )}
              </span>
              <span className="block text-[10px] text-gray-400">{item.hint}</span>
            </button>
          );
        })}
      </div>

      {segment === "assignments" && <AssignmentsBoard user={user} />}
      {segment === "records" && (
        <div className="space-y-3">
          <RecordsPanel />
          <RetentionPanel />
        </div>
      )}
      {segment === "insights" && <LearningAnalyticsTab />}
    </div>
  );
}