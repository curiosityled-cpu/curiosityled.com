import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Award, MessageSquare, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const NOTE_TYPES = [
  { value: "accomplishment", label: "Accomplishment", icon: Award, color: "#00C875" },
  { value: "feedback", label: "Feedback", icon: MessageSquare, color: "#0202ff" },
  { value: "context", label: "Context", icon: FileText, color: "#FFCB00" },
  { value: "concern", label: "Concern", icon: AlertCircle, color: "#E2445C" },
];

const VISIBILITY_LEVELS = [
  { value: "private_reflection", label: "Private Reflection" },
  { value: "employee_and_manager", label: "Employee & Manager" },
  { value: "hr_only", label: "HR Only" },
  { value: "formal_record", label: "Formal Record" },
];

export default function EvidenceModal({ isOpen, onClose, targetType, targetId, targetTitle, user, onSaved }) {
  const [noteType, setNoteType] = useState("accomplishment");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [visibility, setVisibility] = useState("employee_and_manager");
  const [tags, setTags] = useState("");
  const [kpiValue, setKpiValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNoteType("accomplishment");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setVisibility("employee_and_manager");
      setTags("");
      setKpiValue("");
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!description.trim() || !date) return;
    setSubmitting(true);
    try {
      if (targetType === "goal") {
        // Append evidence entry to the goal's evidence_entries array
        const goal = await base44.entities.Goal.get(targetId);
        const entries = goal.evidence_entries || [];
        const newEntry = {
          id: crypto.randomUUID(),
          note_type: noteType,
          description: description.trim(),
          source: "manual",
          date: date,
          added_by_email: user.email,
          visibility: visibility,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          linked_kpi_ids: [],
          added_at: new Date().toISOString(),
        };
        await base44.entities.Goal.update(targetId, {
          evidence_entries: [...entries, newEntry],
        });
        toast.success("Evidence added to goal");
      } else if (targetType === "kpi") {
        // Add a value_history entry to the KPI
        const kpi = await base44.entities.KPI.get(targetId);
        const history = kpi.value_history || [];
        const numValue = parseFloat(kpiValue);
        if (isNaN(numValue)) {
          toast.error("Please enter a valid numeric value");
          setSubmitting(false);
          return;
        }
        history.push({
          date: date,
          value: numValue,
          source: "manual",
          recorded_by_email: user.email,
        });
        await base44.entities.KPI.update(targetId, {
          current_value: numValue,
          value_history: history,
        });
        toast.success("KPI value recorded");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {targetType === "kpi" ? "Record KPI Value" : "Add Evidence"}
            {targetTitle && <span className="text-gray-500 font-normal ml-2">— {targetTitle}</span>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {targetType === "kpi" ? (
            <div className="space-y-1.5">
              <Label>Value *</Label>
              <Input
                type="number"
                placeholder="Enter the current value"
                value={kpiValue}
                onChange={(e) => setKpiValue(e.target.value)}
              />
              <p className="text-xs text-gray-400">This will update the KPI's current value and add a history entry.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {NOTE_TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = noteType === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setNoteType(t.value)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all"
                        style={{
                          borderColor: active ? t.color : "hsl(var(--border))",
                          backgroundColor: active ? `${t.color}10` : "transparent",
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: t.color }} />
                        <span className="text-[10px] font-medium" style={{ color: active ? t.color : "hsl(var(--muted-foreground))" }}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the accomplishment, feedback, context, or concern..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_LEVELS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="e.g., Q2, client-facing, leadership"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={submitting || (targetType === "kpi" ? !kpiValue : !description.trim() || !date)}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : targetType === "kpi" ? "Record Value" : "Add Evidence"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}