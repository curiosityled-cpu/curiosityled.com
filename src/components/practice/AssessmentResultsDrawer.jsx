import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Award, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import ResultsDashboard from "@/components/results/ResultsDashboard";
import CompetencyRadarChart from "@/components/results/CompetencyRadarChart";
import SituationalIntelligenceCard from "@/components/results/SituationalIntelligenceCard";
import SuccessionReadinessCard from "@/components/results/SuccessionReadinessCard";
import DevelopmentGoals from "@/components/results/DevelopmentGoals";

/**
 * AssessmentResultsDrawer — full-height right drawer that renders
 * assessment results. For Leadership Index (Assessment entity) it reuses
 * the rich results components. For custom assessment submissions it
 * renders a simpler score summary.
 *
 * Props: open, onClose, result
 *   result = { type: "leadership_index" | "custom", assessment?, submission? }
 */
export default function AssessmentResultsDrawer({ open, onClose, result }) {
  if (!result) return null;

  const isLeadershipIndex = result.type === "leadership_index";
  const assessment = result.assessment;
  const submission = result.submission;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {isLeadershipIndex ? "Leadership Index Results" : (submission?.assessment_title || "Assessment Results")}
          </SheetTitle>
          <SheetDescription>
            {isLeadershipIndex
              ? `Completed on ${assessment ? format(new Date(assessment.submission_ts || assessment.created_date), "MMMM d, yyyy") : "—"}`
              : submission?.submission_date ? `Submitted on ${format(new Date(submission.submission_date), "MMMM d, yyyy")}` : "Submitted"}
          </SheetDescription>
        </SheetHeader>

        {isLeadershipIndex && assessment ? (
          <div className="space-y-4 pb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              🧭 This is a development compass, not a certification
            </div>
            <ResultsDashboard assessment={assessment} user={null} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SituationalIntelligenceCard assessment={assessment} />
              <CompetencyRadarChart assessment={assessment} />
            </div>
            <SuccessionReadinessCard assessment={assessment} user={null} />
            <DevelopmentGoals assessment={assessment} user={null} />
          </div>
        ) : submission ? (
          <div className="space-y-4 pb-8">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Score</span>
                  <span className={`text-2xl font-bold ${(submission.percentage || 0) >= 70 ? "text-green-600" : "text-red-600"}`}>
                    {submission.percentage || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Result</span>
                  {submission.passed ? (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Passed</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Did not pass</Badge>
                  )}
                </div>
                {submission.score != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Raw Score</span>
                    <span className="text-sm font-semibold">{submission.score}</span>
                  </div>
                )}
                {submission.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">{submission.status}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
            {submission.responses && Object.keys(submission.responses).length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" /> Your Responses
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(submission.responses).map(([key, value]) => (
                      <div key={key} className="text-sm p-2 rounded-lg bg-muted/30 border border-border">
                        <span className="font-medium text-xs text-muted-foreground">Q{key}:</span>{" "}
                        <span className="text-sm">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">No results data available</div>
        )}
      </SheetContent>
    </Sheet>
  );
}