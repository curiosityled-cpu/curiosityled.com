import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Check, BookOpen, Briefcase, ChevronDown, ChevronUp } from "lucide-react";

const COMPETENCIES = [
  "Situational Intelligence", "Decision Making", "Communication",
  "Resource Management", "Stakeholder Management", "Performance Management",
];

const EXPERIENCE_TYPES = [
  { value: "leadership_coaching", label: "Leadership Coaching", emoji: "🎯" },
  { value: "stretch_project", label: "Stretch Project", emoji: "🚀" },
  { value: "mentorship", label: "Mentorship", emoji: "🤝" },
  { value: "conference_event", label: "Conference / Event", emoji: "🎤" },
  { value: "leadership_opportunity", label: "Leadership Opportunity", emoji: "⭐" },
  { value: "cross_functional_project", label: "Cross-Functional Project", emoji: "🔗" },
  { value: "speaking_opportunity", label: "Speaking Opportunity", emoji: "📢" },
  { value: "volunteer_leadership", label: "Volunteer Leadership", emoji: "🌱" },
  { value: "other", label: "Other", emoji: "💡" },
];

const BLANK_EXPERIENCE = { title: "", type: "stretch_project", description: "", provider_or_sponsor: "", start_date: "", end_date: "", expected_impact: 5, status: "planned" };
const BLANK_LEARNING = { title: "", provider: "", url: "", status: "not_started" };

export default function CreateDevelopmentPlanModal({ open, onClose, onSaved, userEmail, plan }) {
  const editing = !!plan?.id;

  const [form, setForm] = useState(() => ({
    title: plan?.title || "",
    description: plan?.description || "",
    target_competencies: plan?.target_competencies || [],
    status: plan?.status || "active",
    target_date: plan?.target_date || "",
    experiences: plan?.experiences?.length ? plan.experiences : [],
    learning_items: plan?.learning_items?.length ? plan.learning_items : [],
  }));

  const [saving, setSaving] = useState(false);
  const [expandedExp, setExpandedExp] = useState(null);
  const [expandedLearn, setExpandedLearn] = useState(null);

  const toggleCompetency = (c) => setForm(f => ({
    ...f,
    target_competencies: f.target_competencies.includes(c)
      ? f.target_competencies.filter(x => x !== c)
      : [...f.target_competencies, c],
  }));

  const addExperience = () => {
    const idx = form.experiences.length;
    setForm(f => ({ ...f, experiences: [...f.experiences, { ...BLANK_EXPERIENCE }] }));
    setExpandedExp(idx);
  };

  const updateExp = (i, key, value) => setForm(f => {
    const exps = [...f.experiences];
    exps[i] = { ...exps[i], [key]: value };
    return { ...f, experiences: exps };
  });

  const removeExp = (i) => setForm(f => ({ ...f, experiences: f.experiences.filter((_, idx) => idx !== i) }));

  const addLearning = () => {
    const idx = form.learning_items.length;
    setForm(f => ({ ...f, learning_items: [...f.learning_items, { ...BLANK_LEARNING }] }));
    setExpandedLearn(idx);
  };

  const updateLearn = (i, key, value) => setForm(f => {
    const items = [...f.learning_items];
    items[i] = { ...items[i], [key]: value };
    return { ...f, learning_items: items };
  });

  const removeLearn = (i) => setForm(f => ({ ...f, learning_items: f.learning_items.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.title || form.target_competencies.length === 0) return;
    setSaving(true);
    const data = { ...form, user_email: userEmail };
    if (editing) {
      await base44.entities.DevelopmentPlan.update(plan.id, data);
    } else {
      await base44.entities.DevelopmentPlan.create(data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Development Plan" : "Create Development Plan"}</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">Combine off-platform experiences and learning resources into one focused plan.</p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Plan basics */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Executive Presence & Communication Q3 2026"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What do you want to achieve with this plan?"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Date</label>
                <input
                  type="date"
                  value={form.target_date}
                  onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Target Competencies */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Target Competencies *</label>
            <div className="flex flex-wrap gap-2">
              {COMPETENCIES.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCompetency(c)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-all
                    ${form.target_competencies.includes(c)
                      ? "border-[#0202ff] bg-[#0202ff] text-white"
                      : "border-gray-200 text-gray-600 hover:border-[#0202ff]/40"}`}
                >
                  {form.target_competencies.includes(c) && <Check className="w-3 h-3" />}
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Development Experiences */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-500" /> Development Experiences ({form.experiences.length})
              </label>
              <Button variant="outline" size="sm" className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50" onClick={addExperience}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {form.experiences.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2 text-center">No experiences added yet. Add coaching sessions, stretch projects, mentorships, etc.</p>
            )}
            <div className="space-y-2">
              {form.experiences.map((exp, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedExp(expandedExp === i ? null : i)}
                  >
                    <span className="text-sm">{EXPERIENCE_TYPES.find(t => t.value === exp.type)?.emoji || "💡"}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{exp.title || <span className="text-gray-400 italic">Untitled experience</span>}</span>
                    <Badge variant="outline" className="text-xs capitalize">{exp.status}</Badge>
                    <button onClick={(e) => { e.stopPropagation(); removeExp(i); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedExp === i ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  {expandedExp === i && (
                    <div className="p-3 space-y-3 bg-white">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Title *</label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={e => updateExp(i, "title", e.target.value)}
                          placeholder="e.g. Executive coaching with Jane Smith"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {EXPERIENCE_TYPES.map(t => (
                            <button
                              key={t.value}
                              onClick={() => updateExp(i, "type", t.value)}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all
                                ${exp.type === t.value ? "border-purple-500 bg-purple-50 text-purple-700 font-semibold" : "border-gray-200 text-gray-600 hover:border-purple-200"}`}
                            >
                              <span>{t.emoji}</span><span className="truncate">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <textarea
                          value={exp.description}
                          onChange={e => updateExp(i, "description", e.target.value)}
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Provider / Sponsor</label>
                          <input type="text" value={exp.provider_or_sponsor} onChange={e => updateExp(i, "provider_or_sponsor", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" placeholder="e.g. BetterUp" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Status</label>
                          <select value={exp.status} onChange={e => updateExp(i, "status", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30">
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                          <input type="date" value={exp.start_date} onChange={e => updateExp(i, "start_date", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">End Date</label>
                          <input type="date" value={exp.end_date} onChange={e => updateExp(i, "end_date", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Expected Impact <span className="text-gray-400">(competency boost %)</span></label>
                        <div className="flex items-center gap-3">
                          <input type="range" min="1" max="20" value={exp.expected_impact} onChange={e => updateExp(i, "expected_impact", Number(e.target.value))} className="flex-1" />
                          <span className="text-sm font-bold text-purple-600 w-10 text-right">+{exp.expected_impact}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Learning Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Learning Resources ({form.learning_items.length})
              </label>
              <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={addLearning}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {form.learning_items.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2 text-center">No learning items added yet. Add courses, books, or any online resources.</p>
            )}
            <div className="space-y-2">
              {form.learning_items.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedLearn(expandedLearn === i ? null : i)}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{item.title || <span className="text-gray-400 italic">Untitled resource</span>}</span>
                    {item.provider && <span className="text-xs text-gray-400">{item.provider}</span>}
                    <button onClick={(e) => { e.stopPropagation(); removeLearn(i); }} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedLearn === i ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  {expandedLearn === i && (
                    <div className="p-3 space-y-2 bg-white">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Title *</label>
                        <input type="text" value={item.title} onChange={e => updateLearn(i, "title", e.target.value)} placeholder="e.g. Executive Communication on LinkedIn Learning" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Provider</label>
                          <input type="text" value={item.provider} onChange={e => updateLearn(i, "provider", e.target.value)} placeholder="e.g. LinkedIn Learning" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Status</label>
                          <select value={item.status} onChange={e => updateLearn(i, "status", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30">
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">URL</label>
                        <input type="url" value={item.url} onChange={e => updateLearn(i, "url", e.target.value)} placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!form.title || form.target_competencies.length === 0 || saving}
              onClick={handleSave}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editing ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}