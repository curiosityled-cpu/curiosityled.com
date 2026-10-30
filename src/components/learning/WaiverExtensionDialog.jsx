import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarClock, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const DAY_OPTIONS = [7, 14, 30, 60];

const STATUS_LABEL = {
  none: "No waiver on this assignment",
  requested: "Waiver requested by the learner",
  granted: "Requirement waived",
  declined: "Waiver declined",
};

const previewDate = (row, days) => {
  const base = row?.due_date ? new Date(`${row.due_date}T00:00:00Z`) : new Date();
  return new Date(base.getTime() + days * 86400000).toISOString().slice(0, 10);
};

/**
 * Two administrative decisions, each recorded with its reason and the approver:
 * move a due date, or waive the requirement. Both are written to the append-only
 * learning record by the server, so the learner sees the decision on their own record.
 */
export default function WaiverExtensionDialog({ open, onClose, courseId, row, onDone }) {
  const [mode, setMode] = useState("extension");
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(row?.waiver_status === "requested" ? "waiver" : "extension");
    setDays(14);
    setReason("");
    setNote("");
  }, [open, row?.id, row?.waiver_status]);

  if (!row) return null;

  const submit = async (action) => {
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    setBusy(true);
    try {
      await base44.functions.invoke("learningRecordCommand", {
        action,
        course_id: courseId,
        learner_email: row.email,
        reason: reason.trim(),
        note: note.trim() || null,
        ...(action === "grant_extension" ? { days } : {}),
      });
      toast.success(
        action === "grant_extension"
          ? `Due date moved to ${previewDate(row, days)}`
          : action === "grant_waiver"
          ? "Requirement waived"
          : "Waiver declined"
      );
      onDone?.();
      onClose();
    } catch (error) {
      console.error("Waiver/extension error:", error);
      toast.error("That decision could not be recorded");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Waiver or extension</DialogTitle>
          <DialogDescription>
            {row.name} · {row.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-xs text-muted-foreground">
            {STATUS_LABEL[row.waiver_status || "none"]}
            {row.due_date ? ` · due ${row.due_date}` : " · no due date"}
            {row.extension_granted_days > 0 ? ` · already extended ${row.extension_granted_days} days` : ""}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("extension")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                mode === "extension"
                  ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff] font-medium"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarClock className="w-4 h-4" /> Extend due date
            </button>
            <button
              type="button"
              onClick={() => setMode("waiver")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                mode === "waiver"
                  ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff] font-medium"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Waive requirement
            </button>
          </div>

          {mode === "extension" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Extend by</label>
              <div className="flex flex-wrap items-center gap-2">
                {DAY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDays(option)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      days === option
                        ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0202ff] font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option} days
                  </button>
                ))}
                <Input
                  type="number"
                  min="1"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="h-9 w-20"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                New due date: <span className="font-medium text-foreground">{previewDate(row, days || 0)}</span>
                {row.due_date_original ? ` · originally ${row.due_date_original}` : ""}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Reason (required)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                mode === "extension"
                  ? "e.g. Extended sick leave through the due date"
                  : "e.g. Completed equivalent training in the previous system"
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Note (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else to keep with the decision" />
          </div>

          <p className="text-[11px] text-gray-500">
            The reason, your name and the date are written to the learner's record and cannot be edited afterwards.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {mode === "waiver" && row.waiver_status === "requested" && (
            <Button variant="outline" className="text-red-600" disabled={busy} onClick={() => submit("decline_waiver")}>
              Decline request
            </Button>
          )}
          <Button
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            disabled={busy}
            onClick={() => submit(mode === "extension" ? "grant_extension" : "grant_waiver")}
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "extension" ? "Extend due date" : "Grant waiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}