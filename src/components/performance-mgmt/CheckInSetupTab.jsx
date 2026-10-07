/**
 * CheckInSetupTab — admin surface for defining custom KPI questions that
 * appear in daily check-ins (morning/evening). Tenant-scoped, with optional
 * role targeting, response types (number, text, scale 1-5, yes/no), ordering,
 * required toggle, and active toggle.
 *
 * Lives in Performance Manager as the "Check-In Setup" tab.
 */
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Hash,
  Type,
  BarChart3,
  ToggleLeft,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import CheckInLookbackSetting from "@/components/performance-mgmt/CheckInLookbackSetting";

const RESPONSE_TYPES = [
  { value: "number", label: "Number", icon: Hash, hint: "Numeric entry (e.g. 42)" },
  { value: "text", label: "Short text", icon: Type, hint: "Free-text answer" },
  { value: "scale_1_5", label: "Scale 1–5", icon: BarChart3, hint: "Same 1–5 picker as the measures" },
  { value: "yes_no", label: "Yes / No", icon: ToggleLeft, hint: "Binary toggle" },
];

const ROLE_OPTIONS = [
  { value: "__all__", label: "All roles" },
  { value: "User Level 1", label: "User Level 1" },
  { value: "User Level 2", label: "User Level 2" },
  { value: "Admin Level 1", label: "Admin Level 1" },
  { value: "Admin Level 2", label: "Admin Level 2" },
  { value: "Super Administrator", label: "Super Administrator" },
  { value: "Partner Business Administrator", label: "Partner Business Administrator" },
  { value: "Platform Admin", label: "Platform Admin" },
  { value: "Analyst", label: "Analyst" },
  { value: "Leadership Coach", label: "Leadership Coach" },
  { value: "Consultant", label: "Consultant" },
];

const APPLIES_OPTIONS = [
  { value: "both", label: "Both morning & evening" },
  { value: "morning", label: "Morning only" },
  { value: "evening", label: "Evening only" },
];

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const emptyForm = {
  title: "",
  question_key: "",
  response_type: "number",
  unit_label: "",
  target_role: "",
  applies_to: "both",
  is_required: false,
  display_order: 0,
  is_active: true,
  is_ai_generated: false,
  ai_topic: "",
};

export default function CheckInSetupTab({ user }) {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [aiAssistTopic, setAiAssistTopic] = useState("");
  const [aiAssistLoading, setAiAssistLoading] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await base44.entities.CheckInCustomQuestion.list(
        "display_order",
        200
      );
      setQuestions(all || []);
    } catch (e) {
      setError(e.message || "Could not load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      display_order: questions.length,
    });
    setAiAssistTopic("");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleAiAssist = async () => {
    if (!aiAssistTopic.trim()) return;
    setAiAssistLoading(true);
    setFormError(null);
    try {
      const res = await base44.functions.invoke("aiCheckInQuestion", {
        action: "suggest",
        topic: aiAssistTopic.trim(),
        response_type: form.response_type,
      });
      const s = res.data?.suggestion;
      if (s?.title) {
        setForm((f) => ({
          ...f,
          title: s.title,
          response_type: s.response_type || f.response_type,
          unit_label:
            s.response_type === "number"
              ? s.unit_label || f.unit_label
              : "",
          question_key: f.question_key || slugify(s.title),
        }));
      }
    } catch (e) {
      setFormError(e.message || "AI assist failed");
    } finally {
      setAiAssistLoading(false);
    }
  };

  const openEdit = (q) => {
    setEditingId(q.id);
    setForm({
      title: q.title || "",
      question_key: q.question_key || "",
      response_type: q.response_type || "number",
      unit_label: q.unit_label || "",
      target_role: q.target_role || "",
      applies_to: q.applies_to || "both",
      is_required: !!q.is_required,
      display_order: q.display_order ?? 0,
      is_active: q.is_active !== false,
      is_ai_generated: !!q.is_ai_generated,
      ai_topic: q.ai_topic || "",
    });
    setAiAssistTopic("");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError("Question text is required.");
      return;
    }
    if (form.is_ai_generated && !form.ai_topic.trim()) {
      setFormError("Enter a daily topic for AI-generated questions.");
      return;
    }
    const key = form.question_key.trim() || slugify(form.title);
    if (!key) {
      setFormError("Could not generate a question key from the title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title: form.title.trim(),
      question_key: key,
      response_type: form.response_type,
      unit_label: form.response_type === "number" ? (form.unit_label || "").trim() : "",
      target_role: form.target_role || "",
      applies_to: form.applies_to,
      is_required: form.is_required,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
      is_ai_generated: form.is_ai_generated,
      ai_topic: form.is_ai_generated ? form.ai_topic.trim() : "",
    };
    try {
      if (editingId) {
        await base44.entities.CheckInCustomQuestion.update(editingId, payload);
      } else {
        await base44.entities.CheckInCustomQuestion.create({
          ...payload,
          created_by_email: currentUser?.email || "",
        });
      }
      setDialogOpen(false);
      await loadQuestions();
    } catch (e) {
      setFormError(e.message || "Could not save question");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete "${q.title}"?`)) return;
    try {
      await base44.entities.CheckInCustomQuestion.delete(q.id);
      await loadQuestions();
    } catch (e) {
      setError(e.message || "Could not delete question");
    }
  };

  const toggleActive = async (q) => {
    try {
      await base44.entities.CheckInCustomQuestion.update(q.id, {
        is_active: !q.is_active,
      });
      setQuestions((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, is_active: !q.is_active } : x))
      );
    } catch (e) {
      setError(e.message || "Could not update question");
    }
  };

  const move = async (q, dir) => {
    const sorted = [...questions].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const idx = sorted.findIndex((x) => x.id === q.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const aOrder = a.display_order ?? idx;
    const bOrder = b.display_order ?? swapIdx;
    try {
      await base44.entities.CheckInCustomQuestion.bulkUpdate([
        { id: a.id, display_order: bOrder },
        { id: b.id, display_order: aOrder },
      ]);
      await loadQuestions();
    } catch (e) {
      setError(e.message || "Could not reorder");
    }
  };

  const responseTypeMeta = (t) =>
    RESPONSE_TYPES.find((r) => r.value === t) || RESPONSE_TYPES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CheckInLookbackSetting />
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Custom check-in questions</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Add KPI or operational questions to your daily check-ins. Questions appear
            after the standard measures for everyone in your organization, optionally
            filtered by role.
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#0202ff] hover:bg-[#0101dd] text-xs"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add question
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No custom questions yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Add questions like “How many loads did you complete today?” to capture
              operational KPIs alongside the wellbeing check-in.
            </p>
            <Button
              onClick={openAdd}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-xs mt-4"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add your first question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...questions]
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map((q, idx, arr) => {
              const meta = responseTypeMeta(q.response_type);
              const Icon = meta.icon;
              return (
                <Card
                  key={q.id}
                  className={!q.is_active ? "opacity-60" : ""}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            {q.title}
                          </p>
                          {q.is_required && (
                            <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                              Required
                            </span>
                          )}
                          {!q.is_active && (
                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                              Inactive
                            </span>
                          )}
                          {q.is_ai_generated && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0202ff] bg-[#0202ff]/10 border border-[#0202ff]/20 rounded px-1.5 py-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI daily
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          {q.unit_label && q.response_type === "number" && (
                            <span className="text-[10px] text-gray-500">
                              unit: {q.unit_label}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {q.applies_to === "both"
                              ? "Morning & evening"
                              : q.applies_to === "morning"
                              ? "Morning only"
                              : "Evening only"}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            · {q.target_role || "All roles"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => move(q, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => move(q, 1)}
                          disabled={idx === arr.length - 1}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(q)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                          title={q.is_active ? "Deactivate" : "Activate"}
                        >
                          <ToggleLeft
                            className={`w-4 h-4 ${q.is_active ? "text-[#0202ff]" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => openEdit(q)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(q)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit question" : "Add a custom check-in question"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* AI Assist */}
            <div className="rounded-lg border border-[#0202ff]/20 bg-[#0202ff]/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
                <p className="text-xs font-medium text-foreground">AI Assist</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Describe what you want to ask about, and AI will draft the question, pick a response type, and suggest a unit.
              </p>
              <div className="flex gap-2">
                <Input
                  value={aiAssistTopic}
                  onChange={(e) => setAiAssistTopic(e.target.value)}
                  placeholder="e.g. warehouse loads completed per shift"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAiAssist}
                  disabled={aiAssistLoading || !aiAssistTopic.trim()}
                  className="flex-shrink-0"
                >
                  {aiAssistLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                  )}
                  Draft
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {form.is_ai_generated ? "Question label (setup)" : "Question text"}
              </Label>
              <Textarea
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    question_key: f.question_key || slugify(e.target.value),
                  }))
                }
                placeholder={
                  form.is_ai_generated
                    ? "Daily safety check (shown in setup)"
                    : "How many loads did you complete today?"
                }
                rows={2}
                className="text-sm resize-none"
              />
              {form.is_ai_generated && (
                <p className="text-[11px] text-muted-foreground">
                  Users see a fresh AI-generated question each day from the topic below. This label is for the setup list and fallback.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
                  Regenerate daily with AI
                </p>
                <p className="text-[11px] text-muted-foreground">
                  AI writes a fresh question each day from a topic, just like the standard check-in measures.
                </p>
              </div>
              <Switch
                checked={form.is_ai_generated}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_ai_generated: v }))
                }
              />
            </div>

            {form.is_ai_generated && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Daily topic</Label>
                <Textarea
                  value={form.ai_topic}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ai_topic: e.target.value }))
                  }
                  placeholder="e.g. safety near-misses observed on the warehouse floor"
                  rows={2}
                  className="text-sm resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  The AI generates a new question each day from this topic, varied day to day.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Response type</Label>
                <Select
                  value={form.response_type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, response_type: v }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSE_TYPES.map((r) => {
                      const Icon = r.icon;
                      return (
                        <SelectItem key={r.value} value={r.value}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            {r.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Applies to</Label>
                <Select
                  value={form.applies_to}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, applies_to: v }))
                  }
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLIES_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.response_type === "number" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Unit label (optional)
                </Label>
                <Input
                  value={form.unit_label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unit_label: e.target.value }))
                  }
                  placeholder="loads, calls, tickets…"
                  className="text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Target role</Label>
              <Select
                value={form.target_role || "__all__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    target_role: v === "__all__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Only users with this role will see the question. Leave on “All
                roles” for everyone in the organization.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Required</p>
                <p className="text-[11px] text-muted-foreground">
                  User must answer to complete the check-in
                </p>
              </div>
              <Switch
                checked={form.is_required}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_required: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-[11px] text-muted-foreground">
                  Show this question in check-ins now
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_active: v }))
                }
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0202ff] hover:bg-[#0101dd]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? (
                "Save changes"
              ) : (
                "Add question"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}