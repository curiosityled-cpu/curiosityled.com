import React, { useState, useImperativeHandle, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Layers, BookOpen, ChevronRight,
  GripVertical, Loader2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import LessonContentPicker from "./LessonContentPicker";
import ThumbnailPicker from "./ThumbnailPicker";

const genId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const LEADERSHIP_LEVELS = [
  "Individual Contributor to First-Time Manager (entry-level leaders, frontline managers, new supervisors)",
  "Mid-Level Manager (managers of managers, experienced team leads, functional leads)",
  "Senior Manager / Business Unit Leader (leads larger teams, cross-functional groups, or business units)",
  "Director / Senior Director (enterprise-level strategic oversight, multiple functions, major initiatives)",
  "Executive / C-Suite (enterprise leadership, board-level strategy, organizational transformation)",
];

const emptyCourse = () => ({
  title: "",
  description: "",
  thumbnail_url: "",
  status: "draft",
  access_mode: "closed",
  pacing: "self_paced",
  leadership_level: "",
  completion_rule: { type: "all_lessons", minimum_count: 0 },
  modules: [],
  assigned_to_emails: [],
  tags: [],
});

const CourseBuilder = forwardRef(({ editingCourse, clientId, onClose }, ref) => {
  const [course, setCourse] = useState(editingCourse ? {
    ...emptyCourse(),
    ...editingCourse,
    modules: (editingCourse.modules || []).map(m => ({ ...m, lessons: m.lessons || [] })),
  } : emptyCourse());
  const [selectedLessonKey, setSelectedLessonKey] = useState(null); // "moduleId:lessonId"
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  const update = (patch) => setCourse(prev => ({ ...prev, ...patch }));

  // ── Module helpers ──
  const addModule = () => {
    const newMod = { id: genId("mod"), title: `Module ${(course.modules || []).length + 1}`, lessons: [] };
    update({ modules: [...(course.modules || []), newMod] });
  };

  const deleteModule = (modId) => {
    update({ modules: (course.modules || []).filter(m => m.id !== modId) });
    if (selectedLessonKey?.startsWith(modId)) setSelectedLessonKey(null);
  };

  const renameModule = (modId, title) => {
    update({ modules: (course.modules || []).map(m => m.id === modId ? { ...m, title } : m) });
  };

  const moveModule = (modId, dir) => {
    const mods = [...(course.modules || [])];
    const idx = mods.findIndex(m => m.id === modId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= mods.length) return;
    [mods[idx], mods[newIdx]] = [mods[newIdx], mods[idx]];
    update({ modules: mods });
  };

  // ── Lesson helpers ──
  const addLesson = (modId) => {
    const newLesson = { id: genId("les"), content_type: null, reference_id: null, reference_title: null, gate: false };
    update({
      modules: (course.modules || []).map(m =>
        m.id === modId ? { ...m, lessons: [...m.lessons, newLesson] } : m
      ),
    });
    setSelectedLessonKey(`${modId}:${newLesson.id}`);
  };

  const deleteLesson = (modId, lessonId) => {
    update({
      modules: (course.modules || []).map(m =>
        m.id === modId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m
      ),
    });
    if (selectedLessonKey === `${modId}:${lessonId}`) setSelectedLessonKey(null);
  };

  const moveLesson = (modId, lessonId, dir) => {
    update({
      modules: (course.modules || []).map(m => {
        if (m.id !== modId) return m;
        const lessons = [...m.lessons];
        const idx = lessons.findIndex(l => l.id === lessonId);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= lessons.length) return m;
        [lessons[idx], lessons[newIdx]] = [lessons[newIdx], lessons[idx]];
        return { ...m, lessons };
      }),
    });
  };

  const updateLesson = (modId, lessonId, patch) => {
    update({
      modules: (course.modules || []).map(m =>
        m.id === modId
          ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...patch } : l) }
          : m
      ),
    });
  };

  // ── Save ──
  const handleSave = async () => {
    if (!course.title?.trim()) {
      toast.error("Please enter a course title");
      return;
    }
    // Validate lessons have content
    const allLessons = (course.modules || []).flatMap(m => m.lessons || []);
    const incomplete = allLessons.find(l => !l.reference_id);
    if (incomplete) {
      toast.error("All lessons must have a content reference. Remove or complete empty lessons before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...course,
        client_id: course.client_id || clientId,
        completion_rule: course.completion_rule || { type: "all_lessons", minimum_count: 0 },
        modules: (course.modules || []).map(m => ({
          ...m,
          lessons: (m.lessons || []).map(l => {
            const { ...rest } = l;
            return rest;
          }),
        })),
      };

      if (editingCourse?.id) {
        await base44.entities.Course.update(editingCourse.id, payload);
        toast.success("Course updated");
      } else {
        await base44.entities.Course.create(payload);
        toast.success("Course created");
      }
      onClose?.();
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  // ── Selected lesson for the right panel ──
  const selectedParts = selectedLessonKey ? selectedLessonKey.split(":") : null;
  const selectedMod = selectedParts ? (course.modules || []).find(m => m.id === selectedParts[0]) : null;
  const selectedLesson = selectedMod ? (selectedMod.lessons || []).find(l => l.id === selectedParts[1]) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Settings form ── */}
      <div className="border-b border-gray-100 p-4 space-y-3 bg-white flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Course Title *</Label>
            <Input
              placeholder="e.g. First-Time Manager Foundations"
              value={course.title}
              onChange={(e) => update({ title: e.target.value })}
              className="mt-1 h-9 text-sm"
            />
          </div>
          <div>
            <ThumbnailPicker
              value={course.thumbnail_url || ""}
              onChange={(url) => update({ thumbnail_url: url })}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            placeholder="What will learners gain from this course?"
            value={course.description || ""}
            onChange={(e) => update({ description: e.target.value })}
            className="mt-1 text-sm min-h-[60px]"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Pacing</Label>
            <Select value={course.pacing} onValueChange={(v) => update({ pacing: v })}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self_paced">Self-paced</SelectItem>
                <SelectItem value="cohort">Cohort-paced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Access</Label>
            <Select value={course.access_mode} onValueChange={(v) => update({ access_mode: v })}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="closed">Closed (assigned)</SelectItem>
                <SelectItem value="open">Open (enterprise)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Leadership Level</Label>
            <Select value={course.leadership_level || ""} onValueChange={(v) => update({ leadership_level: v })}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                {LEADERSHIP_LEVELS.map(lvl => <SelectItem key={lvl} value={lvl}>{lvl.split(" (")[0]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Completion</Label>
            <Select
              value={course.completion_rule?.type || "all_lessons"}
              onValueChange={(v) => update({ completion_rule: { ...(course.completion_rule || {}), type: v } })}
            >
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_lessons">All lessons</SelectItem>
                <SelectItem value="minimum_lessons">Minimum lessons</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {course.completion_rule?.type === "minimum_lessons" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Minimum lessons required:</Label>
            <Input
              type="number"
              min="1"
              value={course.completion_rule.minimum_count || 0}
              onChange={(e) => update({ completion_rule: { ...course.completion_rule, minimum_count: Number(e.target.value) } })}
              className="h-8 w-24 text-sm"
            />
          </div>
        )}
      </div>

      {/* ── Two-panel: module tree | lesson editor ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Module tree */}
        <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Course Structure</h3>
            <Button size="sm" variant="outline" onClick={addModule} className="h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Module
            </Button>
          </div>

          {(course.modules || []).length === 0 ? (
            <div className="text-center py-8">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No modules yet</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">Add a module to start building your course.</p>
              <Button size="sm" onClick={addModule} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Module
              </Button>
            </div>
          ) : (
            (course.modules || []).map((mod, modIdx) => (
              <div key={mod.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Module header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <Input
                    value={mod.title}
                    onChange={(e) => renameModule(mod.id, e.target.value)}
                    className="h-7 text-sm font-medium border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                  />
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveModule(mod.id, -1)} disabled={modIdx === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveModule(mod.id, 1)} disabled={modIdx === (course.modules || []).length - 1}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteModule(mod.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Lessons */}
                <div className="p-2 space-y-1">
                  {(mod.lessons || []).map((lesson, lesIdx) => {
                    const isSelected = selectedLessonKey === `${mod.id}:${lesson.id}`;
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-[#0202ff]/5 ring-1 ring-[#0202ff]/20" : "hover:bg-gray-50"}`}
                        onClick={() => setSelectedLessonKey(`${mod.id}:${lesson.id}`)}
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {lesson.title || lesson.reference_title || "Untitled lesson"}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {lesson.content_type ? lesson.content_type.replace(/_/g, " ") : "No content selected"}
                          </p>
                        </div>
                        {lesson.gate && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 flex-shrink-0">Gate</span>}
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveLesson(mod.id, lesson.id, -1)} disabled={lesIdx === 0}>
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveLesson(mod.id, lesson.id, 1)} disabled={lesIdx === (mod.lessons || []).length - 1}>
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteLesson(mod.id, lesson.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" onClick={() => addLesson(mod.id)} className="w-full h-8 text-xs text-gray-500 hover:text-[#0202ff]">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Lesson
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Lesson editor */}
        <div className="w-1/2 overflow-y-auto p-4">
          {selectedLesson ? (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lesson Content</h3>
              <LessonContentPicker
                lesson={selectedLesson}
                pacing={course.pacing}
                onChange={(updated) => updateLesson(selectedMod.id, selectedLesson.id, updated)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookOpen className="w-10 h-10 text-gray-200 mb-3" />
              <p className="font-medium text-sm text-gray-600">Select a lesson to edit</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Click any lesson in the course structure to choose its content and settings. Add a lesson to a module to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {saving && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
        </div>
      )}
    </div>
  );
});

export default CourseBuilder;