import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileQuestion, Loader2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

/**
 * Restricted place to record context that changes how a period should be read:
 * evidence that was never captured, responsibilities that changed, or approved
 * leave / accommodation. Admin-only, written to the append-only cycle history.
 */
const CONTEXT_TYPES = {
  missing_evidence: "Missing evidence",
  changed_responsibilities: "Changed responsibilities",
  leave_accommodation: "Leave or accommodation",
  other: "Other context",
};

const EMPTY = {
  subject_email: "",
  context_type: "missing_evidence",
  summary: "",
  effective_from: "",
  effective_to: "",
};

export default function RestrictedContextCard({ cycle, audit = [], onRefresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const notes = (audit || []).filter((e) => e.event_type === "context_recorded");
  const people = cycle?.progress_rows || [];
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.summary.trim()) {
      toast.error("A written summary is required");
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke("reviewCycleCommand", {
        action: "record_context",
        review_cycle_id: cycle.id,
        subject_email: form.subject_email || null,
        context_type: form.context_type,
        summary: form.summary,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
      });
      toast.success("Context recorded");
      setForm(EMPTY);
      setOpen(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not record context");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-gray-900">Restricted context</p>
            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700">
              Admin only
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Record context
          </Button>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Use this when evidence was not captured, responsibilities changed mid-period, or approved
          leave or an accommodation affected what could be delivered. Notes are kept in the cycle
          history and are not shown to the employee or their manager.
        </p>

        {notes.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-3">
            <FileQuestion className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <p className="text-[11px] text-gray-400">No restricted context recorded for this cycle.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => {
              const after = note.after || {};
              return (
                <div key={note.id} className="rounded-xl border border-gray-100 p-2.5 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {CONTEXT_TYPES[after.context_type] || "Context"}
                    </Badge>
                    <span className="text-[11px] font-medium text-gray-700">
                      {note.subject_email || "Cycle-wide"}
                    </span>
                    {(after.effective_from || after.effective_to) && (
                      <span className="text-[10px] text-gray-400">
                        {after.effective_from || "—"} to {after.effective_to || "—"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                    {after.summary || note.reason}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {note.actor_name || note.actor_email} ·{" "}
                    {note.occurred_at ? new Date(note.occurred_at).toLocaleString() : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Record restricted context</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type of context</Label>
              <Select value={form.context_type} onValueChange={set("context_type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTEXT_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Applies to</Label>
              <Select
                value={form.subject_email || "cycle_wide"}
                onValueChange={(v) => set("subject_email")(v === "cycle_wide" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cycle_wide">Whole cycle</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.participant_id} value={p.employee_email}>
                      {p.employee_name || p.employee_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From (optional)</Label>
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => set("effective_from")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To (optional)</Label>
                <Input
                  type="date"
                  value={form.effective_to}
                  onChange={(e) => set("effective_to")(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">What should be recorded *</Label>
              <Textarea
                rows={4}
                className="text-xs"
                value={form.summary}
                onChange={(e) => set("summary")(e.target.value)}
                placeholder="What happened, over what period, and how it should affect the reading of this review."
              />
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed">
              This note is kept with the cycle record and is visible only to administrators. It does
              not change any submitted rating — an amendment or calibration is the way to do that.
            </p>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Record"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}