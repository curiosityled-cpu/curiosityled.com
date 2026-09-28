import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";

export default function AcknowledgeDialog({ submission, cycle, onClose, onAcked }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [comments, setComments] = useState("");
  const [disagree, setDisagree] = useState(false);
  const [mgrSubmission, setMgrSubmission] = useState(null);

  useEffect(() => {
    const loadManagerSubmission = async () => {
      setFetching(true);
      try {
        const mgrSubs = await base44.entities.CustomFormSubmission.filter({
          review_cycle_id: submission.review_cycle_id,
          linked_employee_email: submission.linked_employee_email,
          submitter_role: "manager",
          status: { $in: ["submitted", "acknowledged"] },
        });
        if (mgrSubs.length > 0) {
          setMgrSubmission(mgrSubs[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };
    if (submission) loadManagerSubmission();
  }, [submission]);

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      await base44.entities.CustomFormSubmission.update(submission.id, {
        acknowledged_at: new Date().toISOString(),
        acknowledged_by_email: submission.linked_employee_email,
        status: "acknowledged",
        metadata: {
          ...(submission.metadata || {}),
          acknowledgment_comments: comments,
          acknowledgment_disagreement: disagree,
        },
      });

      try {
        await base44.functions.invoke("createDevelopmentPlanFromReview", {
          review_cycle_id: submission.review_cycle_id,
          employee_email: submission.linked_employee_email,
        });
      } catch (e) {
        console.error("Failed to create development plan:", e);
      }

      toast.success("Review acknowledged — development plan created");
      onAcked?.();
      onClose();
    } catch (err) {
      toast.error("Failed to acknowledge: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const overallRating = mgrSubmission?.responses?.overall_rating || submission.responses?.overall_rating;
  const calibrated = mgrSubmission?.responses?.calibrated === true;
  const adjustmentReason = mgrSubmission?.responses?.calibration_adjustment_reason;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acknowledge Review</DialogTitle>
        </DialogHeader>
        {fetching ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
        ) : (
          <div className="space-y-4">
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Final Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-[#0202ff]" />
                    <span className="text-lg font-bold text-gray-900">{overallRating || "N/A"}</span>
                    <span className="text-xs text-gray-400">/ 5</span>
                  </div>
                </div>
                {calibrated && (
                  <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">
                    Calibrated
                  </Badge>
                )}
              </div>
              {calibrated && adjustmentReason && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-500">Calibration Adjustment:</p>
                  <p className="text-xs text-gray-600 mt-0.5">{adjustmentReason}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Comments (optional)</Label>
              <Textarea
                placeholder="Add any comments about your review..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
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
              <div>
                <span className="text-xs font-medium text-gray-700">I disagree with this assessment</span>
                <p className="text-[10px] text-gray-400">
                  Your disagreement will be recorded but does not change the rating. HR will be notified.
                </p>
              </div>
            </label>

            {disagree && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                Please add your reasons for disagreement in the comments above.
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAcknowledge}
            disabled={loading || fetching}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Acknowledge Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}