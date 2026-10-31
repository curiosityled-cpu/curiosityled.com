import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Calendar, CheckCircle2, ChevronRight } from "lucide-react";
import MyReviewSummary from "@/components/reviews/MyReviewSummary";

const ROLE_LABEL = { self: "Self review", manager: "Manager review", peer: "Peer feedback" };

/**
 * ReviewMyWorkView — everything assigned to the signed-in person in this
 * cycle: their open and submitted tasks, and their released outcome.
 */
export default function ReviewMyWorkView({ cycle, myTasks = [], onOpenTask, onUpdated }) {
  if (myTasks.length === 0 && !cycle?.my_summary) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-white">
        <ClipboardCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Nothing assigned to you in this cycle</p>
        <p className="text-xs text-gray-400 mt-1">
          Tasks appear here when you are assigned a review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {myTasks.map((task) => (
        <Card key={task.task_id} className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">{ROLE_LABEL[task.role]}</p>
                <span className="text-xs text-gray-400">· {task.employee_name}</span>
                {task.submitted ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-green-200 bg-green-50 text-green-700 gap-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" /> Submitted
                  </Badge>
                ) : task.draft_responses ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-200 bg-amber-50 text-amber-700"
                  >
                    Draft saved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Not started
                  </Badge>
                )}
                {task.anonymous && (
                  <Badge variant="outline" className="text-[10px]">
                    Anonymous to employee
                  </Badge>
                )}
              </div>
              {task.due_date && (
                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due{" "}
                  {new Date(task.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant={task.submitted ? "outline" : "default"}
              className={`h-8 text-xs gap-1 ${
                task.submitted ? "" : "bg-[#0202ff] hover:bg-[#0101dd] text-white"
              }`}
              onClick={() => onOpenTask?.(task)}
            >
              {task.submitted ? "View" : task.draft_responses ? "Continue" : "Start"}
              <ChevronRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      ))}

      {cycle?.my_summary?.released && (
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your final summary
          </h3>
          <MyReviewSummary cycle={cycle} summary={cycle.my_summary} onUpdated={onUpdated} />
        </div>
      )}

      {cycle?.my_summary && !cycle.my_summary.released && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            Your review is in progress. You will be able to read the outcome here once your
            manager has completed the conversation and it is released.
          </p>
        </div>
      )}
    </div>
  );
}