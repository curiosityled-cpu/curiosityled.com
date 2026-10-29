import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Lock, Save, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import GuidedReviewFlow from "@/components/performance-mgmt/GuidedReviewFlow";
import { DEFAULT_REVIEW_FORM_CONFIG } from "@/components/performance-mgmt/ReviewFormRenderer";
import RatingRubricPanel from "./RatingRubricPanel";

const ROLE_TITLES = {
  self: "Self review",
  manager: "Manager review",
  peer: "Peer feedback",
};

function privacyNote(task, cycle) {
  if (task.role === "self") {
    return "Your self review goes to your manager and authorized reviewers. It is kept as a submitted record and cannot be edited afterwards without a recorded amendment.";
  }
  if (task.role === "manager") {
    return "Your manager review is preserved exactly as submitted. Calibration may adjust the final rating with a written reason, and the original remains visible to authorized reviewers.";
  }
  if (cycle?.config?.peer_attribution === "named") {
    return "Your feedback is shared with the employee with your name attached.";
  }
  return "Your feedback is shared with the employee without your name attached. Your identity is still recorded with the review for authorized reviewers only.";
}

export default function ReviewTaskDialog({ open, onClose, cycle, task, formConfig, onSaved }) {
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    setResponses(task.submitted ? task.submitted_responses || {} : task.draft_responses || {});
  }, [open, task?.task_id, task?.submitted]);

  if (!task || !cycle) return null;

  const send = async (action) => {
    if (action === "submit") setSubmitting(true);
    else setSaving(true);
    try {
      await base44.functions.invoke("submitReviewTask", {
        review_cycle_id: cycle.id,
        employee_email: task.employee_email,
        action,
        responses,
      });
      toast.success(action === "submit" ? "Review submitted" : "Draft saved");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save review");
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {ROLE_TITLES[task.role]}
            <span className="text-gray-400 font-normal">— {task.employee_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0202ff]" />
              How this review is handled
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">{privacyNote(task, cycle)}</p>
            <RatingRubricPanel
              anchors={cycle.config?.rating_anchors}
              criteria={cycle.config?.criteria}
              rubric={cycle.config?.rubric}
            />
            {task.due_date && (
              <p className="text-[11px] text-gray-500">
                Due {new Date(task.due_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {task.submitted && (
            <Badge variant="outline" className="text-[10px] border-green-200 bg-green-50 text-green-700">
              Submitted {task.submitted_at ? new Date(task.submitted_at).toLocaleString() : ""} — kept
              as submitted
            </Badge>
          )}
          {!task.submitted && task.draft_saved_at && (
            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
              Draft from {new Date(task.draft_saved_at).toLocaleString()}
            </Badge>
          )}

          <GuidedReviewFlow
            role={task.role}
            employeeEmail={task.employee_email}
            formConfig={formConfig || DEFAULT_REVIEW_FORM_CONFIG}
            responses={responses}
            onChange={setResponses}
            onSubmit={() => send("submit")}
            submitting={submitting}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> A submitted review is preserved as-is
            </p>
            {task.submitted ? (
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Close
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => send("save_draft")}
                  disabled={saving || submitting}
                  className="gap-1.5 text-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => send("submit")}
                  disabled={saving || submitting}
                  className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5 text-xs"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit final
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}