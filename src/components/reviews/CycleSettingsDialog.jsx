import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
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
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_RATING_ANCHORS, normalizeAnchors, rubricToText } from "@/lib/reviewRubric";

const PHASES = [
  { value: "self_review", label: "Self + manager review" },
  { value: "peer_review", label: "Self + manager + peer" },
  { value: "360", label: "360 review" },
];

const LENGTHS = [
  { value: "annual", label: "Annual (12 months)", months: 12 },
  { value: "semi_annual", label: "Mid-year (6 months)", months: 6 },
  { value: "quarterly", label: "Quarterly (3 months)", months: 3 },
];

const freshAnchors = () => DEFAULT_RATING_ANCHORS.map((a) => ({ ...a }));

const EMPTY = {
  name: "",
  description: "",
  review_type: "self_review",
  cycle_length: "annual",
  period_start: "",
  period_end: "",
  self_assessment_due: "",
  manager_review_due: "",
  peer_attribution: "named",
  peer_feedback_visibility: "employee_only",
  release_policy: "after_calibration",
  require_conversation: true,
  skip_level_review_enabled: false,
  criteria: "",
  rating_anchors: [],
};

export default function CycleSettingsDialog({ open, onClose, cycle, clientId, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const locked = !!cycle && cycle.status !== "draft";

  useEffect(() => {
    if (!open) return;
    if (!cycle) {
      setForm({ ...EMPTY, rating_anchors: freshAnchors() });
      return;
    }
    const s = cycle.settings || {};
    setForm({
      name: cycle.title || "",
      description: cycle.description || "",
      review_type: s.review_type || "self_review",
      cycle_length: s.cycle_length || "annual",
      period_start: s.period_start || "",
      period_end: s.period_end || "",
      self_assessment_due: s.self_assessment_due || "",
      manager_review_due: s.manager_review_due || "",
      peer_attribution: s.peer_attribution || "named",
      peer_feedback_visibility: s.peer_feedback_visibility || "employee_only",
      release_policy: s.release_policy || "after_calibration",
      require_conversation: s.require_conversation !== false,
      skip_level_review_enabled: !!s.skip_level_review_enabled,
      criteria: s.criteria || "",
      rating_anchors:
        Array.isArray(s.rating_anchors) && s.rating_anchors.length
          ? normalizeAnchors(s.rating_anchors)
          : freshAnchors(),
    });
  }, [open, cycle?.id]);

  // Suggest period and deadline dates from the chosen length.
  useEffect(() => {
    if (!form.period_start || locked) return;
    const start = new Date(form.period_start);
    if (Number.isNaN(start.getTime())) return;
    const months = LENGTHS.find((l) => l.value === form.cycle_length)?.months || 12;
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    const selfDue = new Date(end);
    selfDue.setDate(selfDue.getDate() - 14);
    const mgrDue = new Date(end);
    mgrDue.setDate(mgrDue.getDate() - 7);
    setForm((prev) => ({
      ...prev,
      period_end: prev.period_end || end.toISOString().slice(0, 10),
      self_assessment_due: prev.self_assessment_due || selfDue.toISOString().slice(0, 10),
      manager_review_due: prev.manager_review_due || mgrDue.toISOString().slice(0, 10),
    }));
  }, [form.period_start, form.cycle_length, locked]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setAnchor = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      rating_anchors: prev.rating_anchors.map((a, i) =>
        i === index ? { ...a, [key]: value } : a
      ),
    }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.period_start || !form.period_end) {
      toast.error("Name and review period are required");
      return;
    }
    setSaving(true);
    const settings = {
      review_type: form.review_type,
      cycle_length: form.cycle_length,
      period_start: form.period_start,
      period_end: form.period_end,
      self_assessment_due: form.self_assessment_due || null,
      manager_review_due: form.manager_review_due || null,
      peer_enabled: form.review_type !== "self_review",
      peer_attribution: form.peer_attribution,
      peer_feedback_visibility: form.peer_feedback_visibility,
      release_policy: form.release_policy,
      require_conversation: form.require_conversation,
      skip_level_review_enabled: form.skip_level_review_enabled,
      rubric: rubricToText(form.rating_anchors),
      criteria: form.criteria,
      rating_anchors: form.rating_anchors,
    };
    try {
      if (cycle) {
        await base44.functions.invoke("reviewCycleCommand", {
          action: "update_cycle",
          review_cycle_id: cycle.id,
          title: form.name,
          description: form.description,
          settings,
        });
        toast.success(locked ? "Saved — the launch snapshot still governs this cycle" : "Cycle updated");
      } else {
        await base44.entities.CustomForm.create({
          title: form.name,
          description: form.description,
          form_type: "review_cycle",
          form_category: "operational",
          client_id: clientId,
          status: "draft",
          settings,
        });
        toast.success("Cycle created as draft");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save cycle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cycle ? "Review cycle settings" : "New review cycle"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {locked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
              <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              This cycle has launched. The rules captured at launch continue to govern it; changes
              here apply to future cycles and are recorded in the history.
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Cycle name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. December 2026 year-end review"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Review type *</Label>
              <Select value={form.review_type} onValueChange={set("review_type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cycle length *</Label>
              <Select value={form.cycle_length} onValueChange={set("cycle_length")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Period start *</Label>
              <Input
                type="date"
                value={form.period_start}
                onChange={(e) => set("period_start")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Period end *</Label>
              <Input
                type="date"
                value={form.period_end}
                onChange={(e) => set("period_end")(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Self review due</Label>
              <Input
                type="date"
                value={form.self_assessment_due}
                onChange={(e) => set("self_assessment_due")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Manager review due</Label>
              <Input
                type="date"
                value={form.manager_review_due}
                onChange={(e) => set("manager_review_due")(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Peer feedback shown as</Label>
              <Select value={form.peer_attribution} onValueChange={set("peer_attribution")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="named">Named to the employee</SelectItem>
                  <SelectItem value="anonymous">Anonymous to the employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employee sees the outcome</Label>
              <Select value={form.release_policy} onValueChange={set("release_policy")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="after_calibration">After calibration</SelectItem>
                  <SelectItem value="after_manager_submit">After manager submits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Manager can read peer feedback</Label>
            <Select
              value={form.peer_feedback_visibility}
              onValueChange={set("peer_feedback_visibility")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee_only">
                  No — employee at release, admins and calibrators only
                </SelectItem>
                <SelectItem value="manager_included">
                  Yes — manager sees it while writing their review
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Applies to peer text and peer ratings. Attribution above still decides whether names
              are attached; administrators always keep access for calibration.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Rating scale and definitions</Label>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Reviewers see these definitions next to the rating controls. Edit a definition so each
              level describes what it means for this role.
            </p>
            <div className="space-y-1.5">
              {form.rating_anchors.map((anchor, i) => (
                <div
                  key={anchor.value}
                  className="flex items-start gap-2 rounded-lg border border-gray-100 p-2"
                >
                  <span className="w-6 h-6 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-600 flex items-center justify-center flex-shrink-0 mt-1">
                    {anchor.value}
                  </span>
                  <div className="flex-1 space-y-1">
                    <Input
                      value={anchor.label}
                      onChange={(e) => setAnchor(i, "label", e.target.value)}
                      placeholder="Label"
                      className="h-8 text-xs"
                    />
                    <Textarea
                      rows={2}
                      value={anchor.definition}
                      onChange={(e) => setAnchor(i, "definition", e.target.value)}
                      placeholder="What this rating means for this role"
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Job-related criteria</Label>
            <Textarea
              rows={2}
              value={form.criteria}
              onChange={(e) => set("criteria")(e.target.value)}
              placeholder="The expectations this cycle assesses, so ratings stay tied to the role."
              className="text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.require_conversation}
                onChange={(e) => set("require_conversation")(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff]"
              />
              <div>
                <span className="text-xs font-medium text-gray-700">Require the review conversation</span>
                <p className="text-[10px] text-gray-400">
                  The manager must record that the conversation happened before the outcome can be
                  released.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.skip_level_review_enabled}
                onChange={(e) => set("skip_level_review_enabled")(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0202ff] focus:ring-[#0202ff]"
              />
              <div>
                <span className="text-xs font-medium text-gray-700">Include skip-level review</span>
                <p className="text-[10px] text-gray-400">
                  The manager's manager reviews before calibration.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : cycle ? "Save changes" : "Create cycle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}