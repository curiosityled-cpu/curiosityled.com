import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BehaviorDemonstrationDialog({ open, onClose, goal, userEmail, onSaved }) {
  const [situation, setSituation] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const canSubmit = situation.trim().length >= 10 && date && !!goal?.id;

  const handleSubmit = async () => {
    if (!canSubmit || !goal?.id) return;
    setSaving(true);
    try {
      const existing = goal.evidence_entries || [];
      const newEntry = {
        id: crypto.randomUUID(),
        note_type: "behavior_demonstration",
        description: situation.trim(),
        date,
        source: "manual",
        added_by_email: userEmail,
        added_at: new Date().toISOString(),
        visibility: "employee_and_manager",
      };
      await base44.entities.Goal.update(goal.id, {
        evidence_entries: [...existing, newEntry],
      });
      setSituation("");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to log demonstration:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSituation("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Log behavior demonstration
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {goal?.title && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Commitment</p>
              <p className="text-sm font-medium text-slate-900">{goal.title}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="situation" className="text-xs font-semibold">
              Describe the situation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="situation"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="What was the situation? What did you do differently? Be specific — this raises it above casual self-report."
              className="min-h-[100px] text-sm"
            />
            {situation.length > 0 && situation.length < 10 && (
              <p className="text-[10px] text-amber-600">Add more detail (min 10 characters)</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-date" className="text-xs font-semibold">
              When did this happen? <span className="text-red-500">*</span>
            </Label>
            <Input
              id="demo-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Log demonstration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}