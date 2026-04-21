import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Loader2, Plus, Trash2, Check, BookOpen, Briefcase,
  ChevronDown, ChevronUp, Search, GripVertical, ExternalLink, X
} from "lucide-react";

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

const BLANK_EXPERIENCE = {
  title: "", type: "stretch_project", description: "",
  provider_or_sponsor: "", start_date: "", end_date: "",
  expected_impact: 5, status: "planned",
};

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

  // Course search state
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Load courses when modal opens
  useEffect(() => {
    if (!open) return;
    setCoursesLoading(true);
    base44.entities.LearningResource.filter({ is_active: true }, "-created_date", 200)
      .then(setAllCourses)
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
  }, [open]);

  // Reset form when plan changes
  useEffect(() => {
    setForm({
      title: plan?.title || "",
      description: plan?.description || "",
      target_competencies: plan?.target_competencies || [],
      status: plan?.status || "active",
      target_date: plan?.target_date || "",
      experiences: plan?.experiences?.length ? plan.experiences : [],
      learning_items: plan?.learning_items?.length ? plan.learning_items : [],
    });
    setExpandedExp(null);
    setSearchQuery("");
    setShowSearch(false);
  }, [plan, open]);

  const filteredCourses = allCourses.filter(c => {
    const alreadyAdded = form.learning_items.some(item => item.resource_id === c.id);
    if (alreadyAdded) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.provider?.toLowerCase().includes(q) ||
      c.competencies?.some(comp => comp.toLowerCase().includes(q))
    );
  });

  const toggleCompetency = (c) => setForm(f => ({
    ...f,
    target_competencies: f.target_competencies.includes(c)
      ? f.target_competencies.filter(x => x !== c)
      : [...f.target_competencies, c],
  }));

  // Experiences
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

  // Learning items
  const addCourseToplan = (course) => {
    setForm(f => ({
      ...f,
      learning_items: [...f.learning_items, {
        resource_id: course.id,
        title: course.title,
        provider: course.provider || "",
        url: course.url || "",
        status: "not_started",
      }],
    }));
  };

  const removeLearn = (i) => setForm(f => ({ ...f, learning_items: f.learning_items.filter((_, idx) => idx !== i) }));

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Dragged from search results to the plan list
    if (source.droppableId === "search-results" && destination.droppableId === "plan-learning") {
      const course = allCourses.find(c => c.id === draggableId);
      if (course) addCourseToplan(course);
      return;
    }

    // Reorder within plan list
    if (source.droppableId === "plan-learning" && destination.droppableId === "plan-learning") {
      const items = Array.from(form.learning_items);
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);
      setForm(f => ({ ...f, learning_items: items }));
    }
  };

  const handleSave = async () => {
    if (!form.title || form.target_competencies.length === 0) return;
    setSaving(true);
    try {
      let email = userEmail;
      if (!email) {
        const me = await base44.auth.me();
        email = me?.email;
      }
      const data = { ...form, user_email: email };
      if (editing) {
        await base44.entities.DevelopmentPlan.update(plan.id, data);
      } else {
        await base44.entities.DevelopmentPlan.create(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save journey:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Journey" : "Create Journey"}</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">Combine off-platform experiences and learning resources into one focused journey.</p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Plan basics */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Journey Title *</label>
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
                placeholder="What do you want to achieve with this journey?"
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
                        <input type="text" value={exp.title} onChange={e => updateExp(i, "title", e.target.value)} placeholder="e.g. Executive coaching with Jane Smith" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {EXPERIENCE_TYPES.map(t => (
                            <button key={t.value} onClick={() => updateExp(i, "type", t.value)}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all
                                ${exp.type === t.value ? "border-purple-500 bg-purple-50 text-purple-700 font-semibold" : "border-gray-200 text-gray-600 hover:border-purple-200"}`}>
                              <span>{t.emoji}</span><span className="truncate">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <textarea value={exp.description} onChange={e => updateExp(i, "description", e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 resize-none" />
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

          {/* Learning Resources — search + drag & drop */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Learning Resources ({form.learning_items.length})
              </label>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setShowSearch(s => !s)}
              >
                <Search className="w-3 h-3 mr-1" /> Browse Courses
              </Button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <div className={`grid gap-3 ${showSearch ? "grid-cols-2" : "grid-cols-1"}`}>

                {/* Search panel */}
                {showSearch && (
                  <div className="border border-dashed border-blue-200 rounded-xl bg-blue-50/40 flex flex-col h-72">
                    <div className="p-2 border-b border-blue-100">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          autoFocus
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search courses, books, competencies…"
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 bg-white"
                        />
                      </div>
                    </div>
                    <Droppable droppableId="search-results" isDropDisabled={true}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto p-2 space-y-1.5">
                          {coursesLoading && <p className="text-xs text-gray-400 text-center py-4">Loading courses…</p>}
                          {!coursesLoading && filteredCourses.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">
                              {searchQuery ? "No courses match your search." : "All courses already added."}
                            </p>
                          )}
                          {filteredCourses.slice(0, 30).map((course, index) => (
                            <Draggable key={course.id} draggableId={course.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white border transition-all cursor-grab active:cursor-grabbing group
                                    ${snapshot.isDragging ? "shadow-lg border-[#0202ff]/40 rotate-1" : "border-gray-100 hover:border-blue-200 hover:shadow-sm"}`}
                                >
                                  <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{course.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {course.provider && <span className="text-[10px] text-gray-400">{course.provider}</span>}
                                      {course.competencies?.[0] && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{course.competencies[0]}</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => addCourseToplan(course)}
                                    className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0202ff]/10 hover:bg-[#0202ff] text-[#0202ff] hover:text-white flex items-center justify-center transition-all"
                                    title="Add to plan"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}

                {/* Plan learning list */}
                <Droppable droppableId="plan-learning">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[80px] rounded-xl transition-all border-2 ${
                        snapshot.isDraggingOver
                          ? "border-[#0202ff]/40 bg-[#0202ff]/5"
                          : form.learning_items.length === 0 ? "border-dashed border-gray-200" : "border-transparent"
                      }`}
                    >
                      {form.learning_items.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <BookOpen className="w-6 h-6 text-gray-300 mb-2" />
                          <p className="text-xs text-gray-400">
                            {showSearch ? "Drag courses here or click +" : "Click 'Browse Courses' to search and add resources."}
                          </p>
                        </div>
                      )}
                      {snapshot.isDraggingOver && form.learning_items.length === 0 && (
                        <div className="flex items-center justify-center py-6">
                          <p className="text-xs text-[#0202ff] font-medium">Drop to add</p>
                        </div>
                      )}
                      <div className="space-y-1.5 p-0.5">
                        {form.learning_items.map((item, i) => (
                          <Draggable key={`plan-${i}`} draggableId={`plan-item-${i}`} index={i}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white transition-all
                                  ${snapshot.isDragging ? "shadow-lg border-[#0202ff]/30" : "border-gray-100 hover:border-gray-200"}`}
                              >
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing flex-shrink-0">
                                  <GripVertical className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                                </div>
                                <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 leading-snug truncate">{item.title}</p>
                                  {item.provider && <p className="text-[10px] text-gray-400">{item.provider}</p>}
                                </div>
                                <select
                                  value={item.status}
                                  onChange={e => {
                                    const items = [...form.learning_items];
                                    items[i] = { ...items[i], status: e.target.value };
                                    setForm(f => ({ ...f, learning_items: items }));
                                  }}
                                  className="text-[10px] border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30 bg-gray-50"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button onClick={() => removeLearn(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </DragDropContext>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={!form.title || form.target_competencies.length === 0 || saving}
              onClick={handleSave}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editing ? "Save Changes" : "Create Journey"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}