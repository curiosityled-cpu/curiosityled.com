/**
 * AddToPlanModal
 * Small modal to add a learning resource to the user's development plan (AssignedLearning).
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, CheckCircle2 } from "lucide-react";

export default function AddToPlanModal({ isOpen, onClose, resource, userEmail }) {
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleAdd = async () => {
    setSaving(true);
    try {
      await base44.entities.AssignedLearning.create({
        user_email: userEmail,
        learning_resource_id: resource.id,
        assigned_by: userEmail,
        title: resource.title,
        description: resource.description || `${resource.provider || "Learning resource"} — ${resource.competencies?.[0] || ""}`,
        status: "assigned",
        priority,
        due_date: dueDate || undefined,
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setDueDate("");
        setPriority("medium");
        onClose(true); // true = refresh needed
      }, 1200);
    } catch (e) {
      console.error("[AddToPlanModal] Error:", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDueDate("");
    setPriority("medium");
    setDone(false);
    onClose(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-[#0202ff]" />
            Add to Development Plan
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-medium text-gray-800">Added to your plan!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-gray-900 leading-snug">{resource?.title}</p>
                {resource?.provider && <p className="text-xs text-gray-500 mt-0.5">{resource.provider}</p>}
                {resource?.duration_string && <p className="text-xs text-gray-400 mt-0.5">{resource.duration_string}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Target Completion Date (optional)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                Add to Plan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}