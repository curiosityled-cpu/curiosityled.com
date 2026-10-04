import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Briefcase, BookOpen, Loader2, Library, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ThumbnailPicker from "@/components/dev-manager/ThumbnailPicker";
import CompetencyLibraryPicker from "@/components/learning/CompetencyLibraryPicker";

const STATUSES = ["active", "paused", "completed", "draft", "published", "archived", "cancelled"];
const TEMPLATE_CATEGORIES = ["technical", "leadership", "sales", "operations", "compliance", "onboarding", "general", "custom"];
const LIBRARY_ROLES = ["Admin Level 1", "Admin Level 2", "Super Administrator", "Platform Admin"];

function TagInput({ label, tags, onChange, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder || "Type and press Enter"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="h-9 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function ExperienceRow({ exp, onChange, onRemove }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600">Experience</span>
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
      </div>
      <Input placeholder="Title" value={exp.title || ""} onChange={(e) => onChange({ ...exp, title: e.target.value })} className="h-9 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Type (e.g. coaching, workshop)" value={exp.type || ""} onChange={(e) => onChange({ ...exp, type: e.target.value })} className="h-9 text-sm" />
        <Input placeholder="Provider / sponsor" value={exp.provider_or_sponsor || ""} onChange={(e) => onChange({ ...exp, provider_or_sponsor: e.target.value })} className="h-9 text-sm" />
      </div>
      <Textarea placeholder="Description" value={exp.description || ""} onChange={(e) => onChange({ ...exp, description: e.target.value })} className="text-sm min-h-[60px]" />
    </div>
  );
}

function LearningItemRow({ item, onChange, onRemove }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600">Learning Resource</span>
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
      </div>
      <Input placeholder="Title" value={item.title || ""} onChange={(e) => onChange({ ...item, title: e.target.value })} className="h-9 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Provider" value={item.provider || ""} onChange={(e) => onChange({ ...item, provider: e.target.value })} className="h-9 text-sm" />
        <Input placeholder="URL" value={item.url || ""} onChange={(e) => onChange({ ...item, url: e.target.value })} className="h-9 text-sm" />
      </div>
    </div>
  );
}

export default function JourneyEditor({ open, onClose, onSaved, journey, user, users }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const canManageLibrary = LIBRARY_ROLES.includes(user?.app_role);

  useEffect(() => {
    if (!open) return;
    if (journey) {
      setForm({ ...journey });
    } else {
      setForm({
        title: "",
        description: "",
        thumbnail_url: "",
        status: "active",
        tags: [],
        author_email: user.email,
        client_id: user.client_id,
        in_content_library: false,
        target_competencies: [],
        target_date: "",
        experiences: [],
        learning_items: [],
        assigned_to_emails: [],
        // library fields
        type: "curriculum",
        template_category: "",
        template_tags: [],
        estimated_duration_days: null,
        target_audiences: [],
        points_value: null,
      });
    }
  }, [open, journey, user]);

  if (!open || !form) return null;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isEdit = !!journey;

  const runAiAssist = async () => {
    if (!form.title.trim()) {
      toast.error("Enter a title first, then use AI Assist");
      return;
    }
    setAiLoading(true);
    try {
      const competencyNames = (await base44.entities.Competency.list("name")).map((c) => c.name);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a leadership development designer. Draft a complete development journey titled "${form.title}".
${form.description ? `Existing description: ${form.description}` : ""}
${form.target_competencies?.length ? `Already-selected competencies: ${form.target_competencies.join(", ")}` : ""}
Available competency library (pick from these only): ${competencyNames.join(", ")}

Return JSON with:
- description: 2-3 sentence overview of the journey
- target_competencies: array of 3-6 competency names from the library above
- experiences: array of 2-4 off-platform development experiences, each {title, type, description, provider_or_sponsor} — types can be leadership_coaching, workshop, stretch_project, mentorship, etc.
- learning_items: array of 2-4 learning resources, each {title, provider, url} — use realistic providers (LinkedIn Learning, Harvard ManageMentor, Coursera, MIT Sloan, etc.)
- estimated_duration_days: number
- target_audiences: array of 2-3 audience labels
Keep it practical and specific to the title.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            target_competencies: { type: "array", items: { type: "string" } },
            experiences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string" },
                  description: { type: "string" },
                  provider_or_sponsor: { type: "string" },
                },
              },
            },
            learning_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  provider: { type: "string" },
                  url: { type: "string" },
                },
              },
            },
            estimated_duration_days: { type: "number" },
            target_audiences: { type: "array", items: { type: "string" } },
          },
        },
      });
      const validComps = (res.target_competencies || []).filter((c) => competencyNames.includes(c));
      setForm((prev) => ({
        ...prev,
        description: res.description || prev.description,
        target_competencies: Array.from(new Set([...(prev.target_competencies || []), ...validComps])),
        experiences: res.experiences?.length ? res.experiences : prev.experiences,
        learning_items: res.learning_items?.length ? res.learning_items : prev.learning_items,
        estimated_duration_days: res.estimated_duration_days || prev.estimated_duration_days,
        target_audiences: res.target_audiences?.length ? res.target_audiences : prev.target_audiences,
      }));
      toast.success("AI draft applied — review and adjust");
    } catch (err) {
      console.error(err);
      toast.error("AI Assist failed — try again");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        thumbnail_url: form.thumbnail_url,
        status: form.status,
        tags: form.tags,
        client_id: form.client_id || user.client_id,
        author_email: form.author_email || user.email,
        last_modified_by: user.email,
        in_content_library: form.in_content_library || false,
        target_competencies: form.target_competencies,
        target_date: form.target_date || undefined,
        experiences: form.experiences,
        learning_items: form.learning_items,
        assigned_to_emails: form.assigned_to_emails,
      };
      if (form.in_content_library) {
        payload.type = form.type;
        payload.template_category = form.template_category || undefined;
        payload.template_tags = form.template_tags;
        payload.estimated_duration_days = form.estimated_duration_days || undefined;
        payload.target_audiences = form.target_audiences;
        payload.points_value = form.points_value || undefined;
      }

      if (isEdit) {
        await base44.entities.Journey.update(journey.id, payload);
        toast.success("Journey updated");
      } else {
        await base44.entities.Journey.create(payload);
        toast.success("Journey created");
      }
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? "Failed to update journey" : "Failed to create journey");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Journey" : "New Journey"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Title *</Label>
            <div className="flex gap-2">
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Journey title" className="h-9 text-sm flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runAiAssist}
                disabled={aiLoading || !form.title.trim()}
                className="border-[#0202ff]/30 text-[#0202ff] hover:bg-[#0202ff]/5"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {aiLoading ? "Drafting..." : "AI Assist"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">Enter a title, then click AI Assist to draft the description, competencies, experiences, and resources.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this journey covers" className="text-sm min-h-[70px]" />
          </div>

          {/* Thumbnail */}
          <ThumbnailPicker value={form.thumbnail_url} onChange={(url) => set("thumbnail_url", url)} />

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Status</Label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Content library checkbox (role-gated) */}
          {canManageLibrary && (
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.in_content_library ? "border-purple-300 bg-purple-50" : "border-gray-200 hover:bg-gray-50"}`}>
              <input
                type="checkbox"
                checked={form.in_content_library || false}
                onChange={(e) => set("in_content_library", e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <Library className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Save in content library</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Makes this journey reusable — program admins can assign it to many learners across the organization.</p>
              </div>
            </label>
          )}

          {/* Library-specific fields (only when in library) */}
          {form.in_content_library && (
            <div className="space-y-4 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Type</Label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
                    <option value="curriculum">Curriculum (any order)</option>
                    <option value="learning_path">Learning Path (sequence)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Est. Duration (days)</Label>
                  <Input type="number" value={form.estimated_duration_days || ""} onChange={(e) => set("estimated_duration_days", e.target.value ? Number(e.target.value) : null)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Template Category</Label>
                <select value={form.template_category || ""} onChange={(e) => set("template_category", e.target.value)} className="w-full h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30">
                  <option value="">None</option>
                  {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <TagInput label="Target Audiences" tags={form.target_audiences} onChange={(t) => set("target_audiences", t)} placeholder="e.g. new managers" />
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Points Value</Label>
                <Input type="number" value={form.points_value || ""} onChange={(e) => set("points_value", e.target.value ? Number(e.target.value) : null)} placeholder="Gamification points for completion" className="h-9 text-sm" />
              </div>
            </div>
          )}

          {/* Target date */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Target Date</Label>
            <Input type="date" value={form.target_date || ""} onChange={(e) => set("target_date", e.target.value)} className="h-9 text-sm" />
          </div>

          {/* Target competencies — from the competency library */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Target Competencies</Label>
            <p className="text-xs text-gray-500 -mt-1">Select from the competency library.</p>
            <CompetencyLibraryPicker selected={form.target_competencies} onChange={(t) => set("target_competencies", t)} />
          </div>

          {/* Assigned to */}
          <TagInput label="Assigned To (emails)" tags={form.assigned_to_emails} onChange={(t) => set("assigned_to_emails", t)} placeholder="email@example.com" />

          {/* Experiences */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> Off-Platform Experiences</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => set("experiences", [...form.experiences, { title: "", type: "", description: "", provider_or_sponsor: "" }])}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            {form.experiences.map((exp, i) => (
              <ExperienceRow
                key={i}
                exp={exp}
                onChange={(updated) => set("experiences", form.experiences.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => set("experiences", form.experiences.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>

          {/* Learning items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Learning Resources</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => set("learning_items", [...form.learning_items, { title: "", provider: "", url: "" }])}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            {form.learning_items.map((item, i) => (
              <LearningItemRow
                key={i}
                item={item}
                onChange={(updated) => set("learning_items", form.learning_items.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => set("learning_items", form.learning_items.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>

          <TagInput label="Tags" tags={form.tags} onChange={(t) => set("tags", t)} placeholder="categorization tags" />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-[#0202ff] hover:bg-[#0101dd] text-white flex-1">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            {saving ? "Saving..." : isEdit ? "Update Journey" : "Create Journey"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}