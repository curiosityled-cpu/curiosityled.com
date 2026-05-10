import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { toast } from "sonner";

function CommitmentRow({ commitment, onChange, onRemove }) {
  const isOverdue = commitment.status === "open" && commitment.due_date && isPast(parseISO(commitment.due_date));
  return (
    <div className={`flex gap-2 items-start p-3 rounded-lg border ${isOverdue ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
      <button
        type="button"
        onClick={() => onChange({ ...commitment, status: commitment.status === "complete" ? "open" : "complete" })}
        className="mt-0.5 flex-shrink-0"
      >
        {commitment.status === "complete"
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Clock className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-gray-400"}`} />}
      </button>
      <div className="flex-1 grid grid-cols-1 gap-1.5 min-w-0">
        <Input
          placeholder="Action item..."
          value={commitment.action}
          onChange={e => onChange({ ...commitment, action: e.target.value })}
          className={`text-sm h-8 ${commitment.status === "complete" ? "line-through text-gray-400" : ""}`}
        />
        <div className="flex gap-2">
          <Select value={commitment.owner} onValueChange={v => onChange({ ...commitment, owner: v })}>
            <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="Owner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={commitment.due_date || ""} onChange={e => onChange({ ...commitment, due_date: e.target.value })} className="h-7 text-xs flex-1" />
          {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />}
        </div>
      </div>
      <button type="button" onClick={onRemove} className="flex-shrink-0 mt-0.5">
        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
}

export default function MeetingRecordModal({ isOpen, onClose, session, user, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState(null);
  const [discussionInput, setDiscussionInput] = useState("");
  const [form, setForm] = useState({
    discussion_points: [],
    decisions: "",
    commitments: []
  });

  useEffect(() => {
    if (isOpen && session) loadRecord();
  }, [isOpen, session]);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const records = await base44.entities.MeetingRecord.filter({ coaching_session_id: session.id });
      if (records.length > 0) {
        const r = records[0];
        setExisting(r);
        setForm({
          discussion_points: r.discussion_points || [],
          decisions: r.decisions || "",
          commitments: r.commitments || []
        });
      } else {
        // Auto-load last meeting's open commitments
        const empEmail = session.coachee_email || session.participant_email;
        const past = await base44.entities.MeetingRecord.filter({ employee_email: empEmail, manager_email: session.coach_email }, "-meeting_date", 1);
        const carryOver = past.length > 0
          ? (past[0].commitments || []).filter(c => c.status === "open").map(c => ({ ...c, id: crypto.randomUUID() }))
          : [];
        setExisting(null);
        setForm({ discussion_points: [], decisions: "", commitments: carryOver });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addDiscussionPoint = () => {
    if (!discussionInput.trim()) return;
    setForm(p => ({ ...p, discussion_points: [...p.discussion_points, discussionInput.trim()] }));
    setDiscussionInput("");
  };

  const removeDiscussionPoint = (i) => {
    setForm(p => ({ ...p, discussion_points: p.discussion_points.filter((_, idx) => idx !== i) }));
  };

  const addCommitment = () => {
    setForm(p => ({
      ...p,
      commitments: [...p.commitments, { id: crypto.randomUUID(), action: "", owner: "employee", due_date: "", status: "open" }]
    }));
  };

  const updateCommitment = (id, updated) => {
    setForm(p => ({ ...p, commitments: p.commitments.map(c => c.id === id ? updated : c) }));
  };

  const removeCommitment = (id) => {
    setForm(p => ({ ...p, commitments: p.commitments.filter(c => c.id !== id) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const empEmail = session.coachee_email || session.participant_email;
    try {
      const payload = {
        client_id: user.client_id,
        manager_email: session.coach_email || user.email,
        employee_email: empEmail,
        meeting_date: format(new Date(session.session_date), "yyyy-MM-dd"),
        coaching_session_id: session.id,
        ...form,
        commitments: form.commitments.filter(c => c.action.trim())
      };
      if (existing) {
        await base44.entities.MeetingRecord.update(existing.id, payload);
      } else {
        await base44.entities.MeetingRecord.create(payload);
      }
      toast.success("Meeting record saved");
      onSaved?.();
      onClose();
    } catch {
      toast.error("Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const openCommitments = form.commitments.filter(c => c.status === "open").length;
  const doneCommitments = form.commitments.filter(c => c.status === "complete").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>1:1 Meeting Record</DialogTitle>
          {session?.session_date && (
            <p className="text-xs text-gray-500">{format(new Date(session.session_date), "MMMM d, yyyy")}</p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" /></div>
        ) : (
          <div className="space-y-5">
            {/* Discussion Points */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Discussion Points</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add topic..."
                  value={discussionInput}
                  onChange={e => setDiscussionInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDiscussionPoint())}
                  className="text-sm h-8"
                />
                <Button type="button" size="sm" variant="outline" onClick={addDiscussionPoint} className="h-8">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {form.discussion_points.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.discussion_points.map((pt, i) => (
                    <Badge key={i} variant="outline" className="gap-1 pr-1 text-xs">
                      {pt}
                      <button onClick={() => removeDiscussionPoint(i)} className="hover:text-red-500">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Decisions */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Decisions Made</Label>
              <Textarea
                rows={2}
                placeholder="Key decisions from this meeting..."
                value={form.decisions}
                onChange={e => setForm(p => ({ ...p, decisions: e.target.value }))}
                className="text-sm resize-none"
              />
            </div>

            {/* Commitments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">
                  Commitments
                  {form.commitments.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">{doneCommitments}/{form.commitments.length} done</span>
                  )}
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addCommitment} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
              {form.commitments.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No commitments yet. Add action items.</p>
              ) : (
                <div className="space-y-2">
                  {form.commitments.map(c => (
                    <CommitmentRow
                      key={c.id}
                      commitment={c}
                      onChange={updated => updateCommitment(c.id, updated)}
                      onRemove={() => removeCommitment(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Carry-over notice */}
            {!existing && openCommitments > 0 && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ↪ {openCommitments} open commitment(s) carried over from last meeting
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Save Record
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}