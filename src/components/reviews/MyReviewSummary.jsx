import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, CheckCircle2, AlertTriangle, Users, Info } from "lucide-react";
import { toast } from "sonner";

export default function MyReviewSummary({ cycle, summary, onUpdated }) {
  const [comments, setComments] = useState(summary.acknowledgment_comments || "");
  const [response, setResponse] = useState(summary.employee_response || "");
  const [disagree, setDisagree] = useState(!!summary.disagreement);
  const [saving, setSaving] = useState(false);

  const alreadyResponded = summary.release_status === "acknowledged" || summary.release_status === "responded";

  const handleAcknowledge = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("reviewCycleCommand", {
        action: "acknowledge",
        review_cycle_id: cycle.id,
        participant_id: summary.participant_id,
        comments,
        response,
        disagreement: disagree,
      });
      toast.success("Acknowledgment recorded");
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not record acknowledgment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Final rating</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <Star className="w-4 h-4 text-[#0202ff] mb-1" />
                <span className="text-2xl font-bold text-gray-900">{summary.final_rating ?? "—"}</span>
                <span className="text-xs text-gray-400">/ 5</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant="outline"
                className={`text-[10px] border ${
                  summary.final_rating_source === "calibrated"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {summary.final_rating_source === "calibrated" ? "Calibrated" : "Manager rating"}
              </Badge>
              {summary.final_released_at && (
                <span className="text-[10px] text-gray-400">
                  Released {new Date(summary.final_released_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {summary.calibration_note && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
              <p className="text-[10px] font-medium text-blue-800">Calibration note</p>
              <p className="text-xs text-blue-900 mt-0.5">{summary.calibration_note}</p>
            </div>
          )}

          {summary.manager_review && (
            <div className="space-y-2 pt-2 border-t border-gray-50">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                Manager review
              </p>
              {summary.manager_review.strengths && (
                <div>
                  <p className="text-[10px] text-gray-500">Strengths</p>
                  <p className="text-xs text-gray-700">{summary.manager_review.strengths}</p>
                </div>
              )}
              {summary.manager_review.improvements && (
                <div>
                  <p className="text-[10px] text-gray-500">Areas to develop</p>
                  <p className="text-xs text-gray-700">{summary.manager_review.improvements}</p>
                </div>
              )}
              {summary.manager_review.development_goals && (
                <div>
                  <p className="text-[10px] text-gray-500">Development goals</p>
                  <p className="text-xs text-gray-700">{summary.manager_review.development_goals}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {summary.peer_feedback?.length > 0 && (
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0202ff]" />
              <p className="text-sm font-semibold text-gray-900">Peer feedback</p>
              <Badge variant="outline" className="text-[10px]">
                {summary.peer_feedback.length}
              </Badge>
            </div>
            {summary.peer_feedback.map((p, i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-700">
                    {p.submitter_email || "Anonymous colleague"}
                  </span>
                  {p.overall_rating != null && (
                    <Badge variant="outline" className="text-[10px]">{p.overall_rating}/5</Badge>
                  )}
                </div>
                {p.strengths && <p className="text-xs text-gray-600">{p.strengths}</p>}
                {p.improvements && <p className="text-xs text-gray-600">{p.improvements}</p>}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {summary.peer_attribution === "named"
                ? "Your organisation shares peer feedback with reviewer names."
                : "Your organisation shares peer feedback without reviewer names. Names are visible only to authorized reviewers."}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border border-gray-100 shadow-sm rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Acknowledge receipt</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Acknowledging confirms you received and read this review. It does not mean you agree
              with the assessment.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Your response (optional)</Label>
            <Textarea
              rows={3}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Add context, a correction, or anything you want recorded alongside the review."
              className="text-xs"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={disagree}
              onChange={(e) => setDisagree(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff]"
            />
            <span className="text-xs text-gray-700">
              I want it recorded that I disagree with parts of this assessment
            </span>
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs">Comments for the record (optional)</Label>
            <Textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="text-xs"
            />
          </div>

          {summary.disagreement && (
            <div className="flex items-center gap-1.5 text-amber-700 text-[11px] bg-amber-50 border border-amber-100 rounded-lg p-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              A disagreement is already on record for this review.
            </div>
          )}

          <Button
            onClick={handleAcknowledge}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {alreadyResponded ? "Update my acknowledgment" : "Acknowledge review"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}