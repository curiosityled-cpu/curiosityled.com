import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const TONE_CLASSES = {
  default: "text-foreground",
  warning: "text-amber-600",
};

function Metric({ label, value, hint, tone = "default" }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${TONE_CLASSES[tone]}`}>{value}</p>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function LearningMetricsStrip({ metrics }) {
  const { enrolled, completed, inProgress, overdue, externalRecords } = metrics;
  const completionRate = enrolled ? Math.round((completed / enrolled) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Metric label="Enrolments" value={enrolled} hint={`${inProgress} in progress`} />
      <Metric label="Completions" value={completed} hint={`${completionRate}% completion rate`} />
      <Metric
        label="Overdue"
        value={overdue}
        hint={overdue ? "Past due date" : "Nothing past due"}
        tone={overdue ? "warning" : "default"}
      />
      <Metric label="External records" value={externalRecords} hint="From other systems" />
      <Metric label="Active learners" value={metrics.activeLearners} hint="Distinct learners enrolled" />
    </div>
  );
}