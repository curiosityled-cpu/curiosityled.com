import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function RecordConversationDialog({ open, onClose, cycle, row, onSaved }) {
  const [notes, setNotes] = useState("");
  const [released, setReleased] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("reviewCycleCommand", {
        action: "record_conversation",
        review_cycle_id: cycle.id,
        participant_id: row.participant_id,
        notes,
      });
      if (released) {
        await base44.functions.invoke("reviewCycleCommand", {
          action: "release",
          review_cycle_id: cycle.id,
          participant_id: row.participant_id,
        });
      }
      toast.success(released ? "Conversation recorded and review released" : "Conversation recorded");
      onSaved?.();
      onClose?.();
      setNotes("");
      setReleased(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not record the conversation");
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-[#0202ff]" />
            Review conversation — {row.employee_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500">
            Recording the conversation confirms it took place. Your notes stay with the manager and
            authorized reviewers; they are not released to the employee.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Conversation notes (optional)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed, how it landed, anything agreed."
              className="text-xs"
            />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={released}
              onChange={(e) => setReleased(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff]"
            />
            <div>
              <span className="text-xs font-medium text-gray-700">Release the review now</span>
              <p className="text-[10px] text-gray-400">
                The employee will be able to read the outcome and acknowledge it. This only works once
                every required step is complete.
              </p>
            </div>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}