/**
 * LinkedInLearningCard
 * Displays LinkedIn Learning courses mapped to a competency.
 * Users can self-report progress: Not Started → In Progress → Completed.
 * Stored in AssignedLearning entity (status field).
 */
import React, { useState, useEffect } from "react";
import { ExternalLink, BookOpen, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const STATUS_CONFIG = {
  assigned:    { label: "Not Started", icon: Circle,       color: "text-gray-400",   bg: "bg-gray-50 border-gray-200",   next: "started",   nextLabel: "Mark In Progress" },
  started:     { label: "In Progress", icon: Clock,        color: "text-amber-500",  bg: "bg-amber-50 border-amber-200", next: "completed", nextLabel: "Mark Complete" },
  in_progress: { label: "In Progress", icon: Clock,        color: "text-amber-500",  bg: "bg-amber-50 border-amber-200", next: "completed", nextLabel: "Mark Complete" },
  completed:   { label: "Completed",   icon: CheckCircle2, color: "text-emerald-500",bg: "bg-emerald-50 border-emerald-200", next: "assigned", nextLabel: "Reset" },
};

export default function LinkedInLearningCard({ courses, userEmail, competencyName, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [statusMap, setStatusMap] = useState({});   // resourceId → AssignedLearning record
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (!userEmail || !courses?.length) return;
    loadStatuses();
  }, [userEmail, courses]);

  const loadStatuses = async () => {
    try {
      const ids = courses.map(c => c.id).filter(Boolean);
      if (!ids.length) return;
      // Fetch any existing assignments for these courses
      const existing = await base44.entities.AssignedLearning.filter({ user_email: userEmail });
      const map = {};
      existing.forEach(a => {
        if (ids.includes(a.learning_resource_id)) map[a.learning_resource_id] = a;
      });
      setStatusMap(map);
    } catch (e) {
      console.warn("[LinkedInLearningCard] Could not load statuses:", e.message);
    }
  };

  const getStatus = (courseId) => statusMap[courseId]?.status || "assigned";

  const cycleStatus = async (course) => {
    const current = getStatus(course.id);
    const cfg = STATUS_CONFIG[current] || STATUS_CONFIG.assigned;
    const nextStatus = cfg.next;

    setUpdating(u => ({ ...u, [course.id]: true }));
    try {
      const existing = statusMap[course.id];
      if (existing) {
        const updated = await base44.entities.AssignedLearning.update(existing.id, { status: nextStatus });
        setStatusMap(m => ({ ...m, [course.id]: updated }));
      } else {
        const created = await base44.entities.AssignedLearning.create({
          user_email: userEmail,
          learning_resource_id: course.id,
          assigned_by: userEmail,
          title: course.title,
          description: `LinkedIn Learning: ${competencyName}`,
          status: nextStatus,
          priority: "medium",
        });
        setStatusMap(m => ({ ...m, [course.id]: created }));
      }
    } catch (e) {
      console.error("[LinkedInLearningCard] Status update failed:", e.message);
    } finally {
      setUpdating(u => ({ ...u, [course.id]: false }));
    }
  };

  const completedCount = courses.filter(c => getStatus(c.id) === "completed").length;

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-[#0077b5]/10 rounded-lg shrink-0">
            <Linkedin className="w-4 h-4 text-[#0077b5]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{competencyName}</p>
            <p className="text-xs text-gray-500">{courses.length} courses · {completedCount} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {completedCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">{completedCount}/{courses.length}</Badge>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t divide-y divide-gray-50">
          {courses.map((course) => {
            const status = getStatus(course.id);
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.assigned;
            const StatusIcon = cfg.icon;

            return (
              <div key={course.id} className="px-5 py-4 bg-gray-50/50">
                <div className="flex items-start gap-3">
                  <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{course.title}</p>
                    {course.author && <p className="text-xs text-gray-500 mt-0.5">{course.author}</p>}
                    {course.duration_string && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{course.duration_string}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#0077b5] font-medium hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open on LinkedIn Learning
                      </a>
                      <span className="text-gray-300">·</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-6 text-xs px-2 border ${cfg.bg} ${cfg.color} hover:opacity-80`}
                        disabled={updating[course.id]}
                        onClick={() => cycleStatus(course)}
                      >
                        {cfg.nextLabel}
                      </Button>
                    </div>
                  </div>
                  <Badge className={`text-xs shrink-0 ${cfg.bg} ${cfg.color} border`}>{cfg.label}</Badge>
                </div>
              </div>
            );
          })}
          <div className="px-5 py-3 bg-blue-50/50">
            <p className="text-xs text-gray-500">
              ⓘ Requires a LinkedIn Learning license. Completions are self-reported — mark progress manually after completing a course.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}