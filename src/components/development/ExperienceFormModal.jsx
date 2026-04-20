import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, X, Check } from "lucide-react";

const EXPERIENCE_TYPES = [
  { value: "leadership_coaching", label: "Leadership Coaching", emoji: "🎯" },
  { value: "stretch_project", label: "Stretch Project", emoji: "🚀" },
  { value: "leadership_opportunity", label: "Leadership Opportunity", emoji: "⭐" },
  { value: "mentorship", label: "Mentorship", emoji: "🤝" },
  { value: "conference_event", label: "Conference / Event", emoji: "🎤" },
  { value: "volunteer_leadership", label: "Volunteer Leadership", emoji: "🌱" },
  { value: "cross_functional_project", label: "Cross-Functional Project", emoji: "🔗" },
  { value: "speaking_opportunity", label: "Speaking Opportunity", emoji: "📢" },
  { value: "other", label: "Other", emoji: "💡" },
];

const COMPETENCIES = [
  "Situational Intelligence",
  "Decision Making",
  "Communication",
  "Resource Management",
  "Stakeholder Management",
  "Performance Management",
];

export default function ExperienceFormModal({ open, onClose, onSaved, experience, userEmail }) {
  const editing = !!experience?.id;
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "stretch_project",
    competencies: [],
    expected_impact: 5,
    planned_month: "",
    start_date: "",
    end_date: "",
    provider_or_sponsor: "",
    status: "planned",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (experience) {
      setForm({
        title: experience.title || "",
        description: experience.description || "",
        type: experience.type || "stretch_project",
        competencies: experience.competencies || [],
        expected_impact: experience.expected_impact ?? 5,
        planned_month: experience.planned_month || "",
        start_date: experience.start_date || "",
        end_date: experience.end_date || "",
        provider_or_sponsor: experience.provider_or_sponsor || "",
        status: experience.status || "planned",
      });
    } else {
      setForm({
        title: "", description: "", type: "stretch_project", competencies: [],
        expected_impact: 5, planned_month: "", start_date: "", end_date: "",
        provider_or_sponsor: "", status: "planned",
      });
    }
  }, [experience, open]);

  const toggleCompetency = (c) => {
    setForm((f) => ({
      ...f,
      competencies: f.competencies.includes(c)
        ? f.competencies.filter((x) => x !== c)
        : [...f.competencies, c],
    }));
  };

  const handleSave = async () => {
    if (!form.title || form.competencies.length === 0) return;
    setSaving(true);
    const data = { ...form, user_email: userEmail };
    if (editing) {
      await base44.entities.DevelopmentExperience.update(experience.id, data);
    } else {
      await base44.entities.DevelopmentExperience.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Experience" : "Add Development Experience"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {field("Title *", "title", "text", "e.g. Executive Coaching with Jane Smith")}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {EXPERIENCE_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all
                    ${form.type === t.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                      : "border-gray-200 text-gray-600 hover:border-indigo-200"}`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className="leading-tight text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the experience, goals, and expected outcomes..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Target Competencies * <span className="text-gray-400 font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMPETENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCompetency(c)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all
                    ${form.competencies.includes(c)
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-gray-200 text-gray-600 hover:border-indigo-300"}`}
                >
                  {form.competencies.includes(c) && <Check className="w-3 h-3" />}
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Planned Month</label>
              <input
                type="month"
                value={form.planned_month}
                onChange={(e) => setForm((f) => ({ ...f, planned_month: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Start Date", "start_date", "date")}
            {field("End Date", "end_date", "date")}
          </div>

          {field("Provider / Sponsor", "provider_or_sponsor", "text", "e.g. BetterUp, Internal Manager")}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Expected Impact <span className="text-gray-400 font-normal">(competency boost %)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="20"
                value={form.expected_impact}
                onChange={(e) => setForm((f) => ({ ...f, expected_impact: Number(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-sm font-bold text-indigo-600 w-10 text-right">+{form.expected_impact}%</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!form.title || form.competencies.length === 0 || saving}
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editing ? "Save Changes" : "Add Experience"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}