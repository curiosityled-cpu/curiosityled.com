import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_REVIEW_FORM_CONFIG } from "./ReviewFormRenderer";

export default function QuarterlyCheckpoint({ cycle, user, onClose, onSaved }) {
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [concerns, setConcerns] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!employeeEmail.trim()) return;
    setSubmitting(true);
    try {
      let forms = await base44.entities.CustomForm.filter({
        form_type: "review_form",
        client_id: user.client_id || user.data?.client_id,
      });
      let form = forms[0];
      if (!form) {
        form = await base44.entities.CustomForm.create({
          title: "Performance Review Form",
          form_type: "review_form",
          form_category: "evaluation",
          client_id: user.client_id || user.data?.client_id,
          status: "published",
          config: DEFAULT_REVIEW_FORM_CONFIG,
        });
      }

      await base44.entities.CustomFormSubmission.create({
        form_id: form.id,
        client_id: user.client_id || user.data?.client_id,
        submitter_email: user.email,
        submitter_name: user.full_name || user.email,
        submitter_role: "manager",
        linked_employee_email: employeeEmail.trim().toLowerCase(),
        review_cycle_id: cycle.id,
        responses: {
          checkpoint: true,
          progress_notes: progressNotes,
          concerns: concerns,
        },
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submission_source: "direct",
        metadata: { checkpoint: true, checkpoint_date: new Date().toISOString() },
      });
      toast.success("Quarterly checkpoint saved");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Failed to save checkpoint: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quarterly Checkpoint — {cycle?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            A lightweight progress check to keep the annual review from being a surprise. This does not replace the formal review.
          </p>
          <div className="space-y-1.5">
            <Label>Employee Email *</Label>
            <Input
              placeholder="employee@company.com"
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Progress Notes</Label>
            <Textarea
              placeholder="What progress has the employee made since the last check-in?"
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Concerns or Issues</Label>
            <Textarea
              placeholder="Any concerns or issues to document?"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !employeeEmail.trim()} className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Save Checkpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}