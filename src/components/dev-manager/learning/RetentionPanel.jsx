import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Loader2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const asArray = (result) => (Array.isArray(result) ? result : result?.items || []);
const RETENTION_YEARS = 7;

/**
 * Retention and legal hold — the two administrative acts that decide how long a
 * training record stands as it is. Both are reasoned, timestamped and written to the
 * learner's append-only record; nothing here deletes anything.
 */
export default function RetentionPanel() {
  const [counts, setCounts] = useState({ completed: 0, held: 0, archived: 0 });
  const [held, setHeld] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [dialog, setDialog] = useState(null); // 'hold' | 'release'
  const [releaseRow, setReleaseRow] = useState(null);
  const [form, setForm] = useState({ course_id: "", learner_email: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [completed, onHold, archived, heldRows, courseRows] = await Promise.all([
        base44.entities.CourseProgress.count({ status: "completed" }).catch(() => 0),
        base44.entities.CourseProgress.count({ legal_hold: true }).catch(() => 0),
        base44.entities.CourseProgress.count({ retention_state: "archived" }).catch(() => 0),
        base44.entities.CourseProgress
          .filter({ legal_hold: true }, { sort: "-legal_hold_set_at", limit: 20 })
          .catch(() => []),
        base44.entities.Course.list({ sort: "-created_date", limit: 100 }).catch(() => []),
      ]);
      setCounts({ completed, held: onHold, archived });
      setHeld(asArray(heldRows));
      setCourses(asArray(courseRows));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSweep = async () => {
    setRunning(true);
    try {
      const response = await base44.functions.invoke("learningRecordCommand", {
        action: "apply_retention",
      });
      const data = response?.data || {};
      if (data.error) throw new Error(data.error);
      toast.success(
        data.archived > 0
          ? `${data.archived} record${data.archived === 1 ? "" : "s"} archived. Nothing was deleted.`
          : "Nothing has passed the retention window yet."
      );
      setConfirming(false);
      await load();
    } catch (error) {
      toast.error(error.message || "The retention sweep could not run");
    } finally {
      setRunning(false);
    }
  };

  const openHold = () => {
    setForm({ course_id: courses[0]?.id || "", learner_email: "", reason: "" });
    setDialog("hold");
  };

  const openRelease = (row) => {
    setReleaseRow(row);
    setForm({ course_id: row.course_id, learner_email: row.learner_email, reason: "" });
    setDialog("release");
  };

  const submitHold = async () => {
    const reason = form.reason.trim();
    if (!form.course_id || !form.learner_email.trim()) {
      toast.error("Choose the course and the learner");
      return;
    }
    if (!reason) {
      toast.error("A reason is required");
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke("learningRecordCommand", {
        action: dialog === "release" ? "clear_legal_hold" : "set_legal_hold",
        course_id: form.course_id,
        learner_email: form.learner_email.trim(),
        reason,
      });
      toast.success(dialog === "release" ? "Legal hold released" : "Legal hold placed");
      setDialog(null);
      await load();
    } catch (error) {
      toast.error(error.message || "The hold could not be updated");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Retention & legal hold
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500 max-w-2xl">
            Training records are kept for {RETENTION_YEARS} years. Nothing is deleted: once a record passes
            the window it is archived and stays readable in the transcript and its CSV export. A legal hold
            preserves a record regardless of the window.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={openHold}>
            <Lock className="w-3.5 h-3.5" /> Place a hold
          </Button>
          {confirming ? (
            <>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={running}
                onClick={runSweep}
              >
                {running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Confirm sweep
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setConfirming(true)}
            >
              <Archive className="w-3.5 h-3.5" /> Run retention sweep
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Completed records", counts.completed],
          ["On legal hold", counts.held],
          ["Archived", counts.archived],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-100 px-3 py-2">
            <p className="text-[10px] text-gray-400">{label}</p>
            <p className="font-mono text-sm tabular-nums text-gray-900">
              {loading ? "—" : value}
            </p>
          </div>
        ))}
      </div>

      {held.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Held records</p>
          {held.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-900">{row.learner_email}</span>
              <span className="text-xs text-gray-500">· {row.course_title || row.course_id}</span>
              <span className="text-[11px] text-amber-800">· {row.legal_hold_reason}</span>
              {row.legal_hold_set_at && (
                <span className="text-[11px] text-gray-400">
                  since {format(new Date(row.legal_hold_set_at), "MMM d, yyyy")}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-[11px] gap-1 text-gray-600"
                onClick={() => openRelease(row)}
              >
                <Unlock className="w-3 h-3" /> Release
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {dialog === "release" ? "Release legal hold" : "Place a legal hold"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {dialog === "release"
                ? "The record returns to the normal retention schedule. The release is recorded with your reason."
                : "The record is preserved regardless of the retention schedule until the hold is released."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {dialog === "hold" ? (
              <>
                <div>
                  <Label className="text-xs">Course</Label>
                  <Select
                    value={form.course_id}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, course_id: value }))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-sm">
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Learner email</Label>
                  <Input
                    value={form.learner_email}
                    onChange={(event) => setForm((prev) => ({ ...prev, learner_email: event.target.value }))}
                    placeholder="learner@company.com"
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-gray-100 px-3 py-2">
                <p className="text-xs font-medium text-gray-900">{releaseRow?.learner_email}</p>
                <p className="text-[11px] text-gray-500">{releaseRow?.course_title || releaseRow?.course_id}</p>
              </div>
            )}

            <div>
              <Label className="text-xs">Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder={
                  dialog === "release"
                    ? "e.g. Matter closed, no longer required"
                    : "e.g. Litigation hold, matter #2214"
                }
                className="mt-1 text-sm min-h-[70px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitHold} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {dialog === "release" ? "Release hold" : "Place hold"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}