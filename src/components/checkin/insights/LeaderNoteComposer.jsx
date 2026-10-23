import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Lock, Users, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

/**
 * Writes and edits one leader note: the running note about a person, or the
 * note on a single check-in. Private to the leader until they share it.
 */
export default function LeaderNoteComposer({
  note,
  scope,
  subject,
  checkInDate,
  checkInType,
  viewer,
  onSaved,
  placeholder,
}) {
  const [editing, setEditing] = useState(!note);
  const [text, setText] = useState(note?.note || "");
  const [shared, setShared] = useState(note?.shared_with_subject || false);
  const [saving, setSaving] = useState(false);

  const firstName = (subject?.name || subject?.email || "them").split(" ")[0].split("@")[0];

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const fields = {
        note: text.trim(),
        shared_with_subject: shared,
        shared_at: shared ? note?.shared_at || new Date().toISOString() : null,
      };

      if (note) {
        await base44.entities.CheckInLeaderNote.update(note.id, fields);
      } else {
        await base44.entities.CheckInLeaderNote.create({
          client_id: viewer?.data?.client_id || viewer?.client_id || "",
          leader_email: viewer?.email || "",
          leader_name: viewer?.data?.display_name || viewer?.full_name || viewer?.email || "",
          subject_email: subject.email,
          subject_name: subject.name,
          scope,
          check_in_date: scope === "check_in" ? checkInDate : undefined,
          check_in_type: scope === "check_in" ? checkInType || undefined : undefined,
          ...fields,
        });
      }

      toast.success(note ? "Note updated" : "Note added");
      setEditing(false);
      onSaved?.();
    } catch (e) {
      toast.error("Could not save the note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    setSaving(true);
    try {
      await base44.entities.CheckInLeaderNote.delete(note.id);
      toast.success("Note removed");
      onSaved?.();
    } catch (e) {
      toast.error("Could not remove the note");
    } finally {
      setSaving(false);
    }
  };

  if (note && !editing) {
    return (
      <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5 mb-1">
              {note.shared_with_subject
                ? <><Users className="w-3 h-3" /> Shared with {firstName}</>
                : <><Lock className="w-3 h-3" /> Your private note</>}
            </p>
            <p className="text-sm text-purple-900 whitespace-pre-wrap">{note.note}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(true)} title="Edit note">
              <Pencil className="w-3.5 h-3.5 text-purple-600" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleDelete} disabled={saving} title="Delete note">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-purple-600" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder || "Add a note…"}
        className="text-sm min-h-[70px] resize-y"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <Checkbox
            checked={shared}
            onCheckedChange={(checked) => setShared(checked === true)}
            className="h-3.5 w-3.5"
          />
          Share with {firstName}
        </label>
        <div className="flex items-center gap-2">
          {note && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white"
            onClick={handleSave}
            disabled={saving || !text.trim()}
          >
            {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {note ? "Update note" : "Save note"}
          </Button>
        </div>
      </div>
    </div>
  );
}