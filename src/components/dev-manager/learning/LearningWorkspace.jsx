import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import AdminLearningManagementTab from "@/components/experience-mgmt/AdminLearningManagementTab";
import LearningAnalyticsTab from "@/components/dev-manager/LearningAnalyticsTab";
import AssignmentsBoard from "./AssignmentsBoard";
import RecordsPanel from "./RecordsPanel";

/**
 * Learning has three jobs and they are not the same job: build the content, chase what is
 * owed, and prove what happened. Each gets its own surface rather than one long tab.
 */
const SEGMENTS = [
  { id: "catalog", label: "Catalog", hint: "Build and publish" },
  { id: "assignments", label: "Assignments", hint: "Who owes what" },
  { id: "records", label: "Records", hint: "The evidence" },
  { id: "insights", label: "Insights", hint: "Adoption" },
];

export default function LearningWorkspace({ user }) {
  const [segment, setSegment] = useState("catalog");
  const [overdue, setOverdue] = useState(0);
  const opened = useRef(false);

  // Land where the work is: if anything is overdue, start there; otherwise start in the catalog.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    base44.entities.CourseProgress
      .count({ due_date: { $lt: today }, status: { $ne: "completed" } })
      .then((count) => {
        setOverdue(count);
        if (count > 0 && !opened.current) setSegment("assignments");
      })
      .catch(() => setOverdue(0));
  }, []);

  const choose = (id) => {
    opened.current = true;
    setSegment(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-5 border-b border-gray-200 overflow-x-auto">
        {SEGMENTS.map((item) => {
          const active = segment === item.id;
          return (
            <button
              key={item.id}
              onClick={() => choose(item.id)}
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

      {segment === "catalog" && <AdminLearningManagementTab user={user} />}
      {segment === "assignments" && <AssignmentsBoard user={user} />}
      {segment === "records" && <RecordsPanel />}
      {segment === "insights" && <LearningAnalyticsTab />}
    </div>
  );
}