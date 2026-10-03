import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  GraduationCap, MoreHorizontal, Send, Play, Pause, Trash2, Copy, Loader2,
  Search, Users, Plus, Globe, Clock, Calendar, Layers, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CourseBuilderDialog from "./CourseBuilderDialog";
import AssignCourseModal from "./AssignCourseModal";

const STATUS_BADGES = {
  draft: { className: "bg-gray-100 text-gray-700", label: "Draft" },
  published: { className: "bg-green-100 text-green-700", label: "Live" },
  archived: { className: "bg-slate-100 text-slate-600", label: "Archived" },
};

const PACING_LABELS = {
  self_paced: { label: "Self-paced", icon: Clock },
  cohort: { label: "Cohort-paced", icon: Calendar },
};

function countLessons(course) {
  return (course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);
}

export default function CoursesTab({ user }) {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState({ open: false, course: null });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesData, usersData, cohortsData] = await Promise.all([
        base44.entities.Course.list("-created_date"),
        base44.entities.User.list(),
        base44.entities.Cohort.list(),
      ]);
      setCourses(coursesData || []);
      setUsers(usersData || []);
      setCohorts(cohortsData || []);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const filteredCourses = courses.filter(c =>
    !search ||
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = courses.filter(c => c.status === "published").length;
  const draftCount = courses.filter(c => c.status === "draft").length;

  const handleStatusChange = async (course, newStatus) => {
    try {
      await base44.entities.Course.update(course.id, { status: newStatus });
      toast.success(`Course ${newStatus === "published" ? "published" : newStatus === "archived" ? "archived" : "updated"}`);
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDuplicate = async (course) => {
    try {
      const { id, created_date, updated_date, created_by, ...data } = course;
      await base44.entities.Course.create({ ...data, title: `${course.title} (Copy)`, status: "draft" });
      toast.success("Course duplicated");
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Error duplicating:", error);
      toast.error("Failed to duplicate course");
    }
  };

  const handleDelete = async (course) => {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Course.delete(course.id);
      toast.success("Course deleted");
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete course");
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setBuilderOpen(true);
  };

  const handleCreate = () => {
    setEditingCourse(null);
    setBuilderOpen(true);
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setEditingCourse(null);
    setRefreshKey(k => k + 1);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Courses', value: courses.length, color: 'text-[#0202ff]', icon: GraduationCap },
          { label: 'Published', value: publishedCount, color: 'text-green-600', icon: Play },
          { label: 'Drafts', value: draftCount, color: 'text-amber-600', icon: BookOpen },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters + Create */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Button onClick={handleCreate} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
          <Plus className="w-4 h-4 mr-1" /> Create Course
        </Button>
      </div>

      {/* Course list */}
      {filteredCourses.length === 0 ? (
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">{search ? "No courses match your search" : "No courses yet"}</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {search ? "Try a different search term." : "Assemble structured learning experiences from your existing resources, classes, signals, and conversational modules."}
            </p>
            {!search && (
              <Button onClick={handleCreate} className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs">
                <Plus className="w-4 h-4 mr-1" /> Create your first course
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCourses.map((course, i) => {
            const badge = STATUS_BADGES[course.status] || STATUS_BADGES.draft;
            const pacingMeta = PACING_LABELS[course.pacing] || PACING_LABELS.self_paced;
            const PacingIcon = pacingMeta.icon;
            const lessonCount = countLessons(course);
            const moduleCount = (course.modules || []).length;
            const assigneeCount = course.assigned_to_emails?.length || 0;
            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0202ff]/10">
                          <GraduationCap className="w-4.5 h-4.5 text-[#0202ff]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{course.title}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1 w-fit">
                            <Layers className="w-3 h-3" />{moduleCount} modules · {lessonCount} lessons
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(course)}>
                            <BookOpen className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAssignModal({ open: true, course })}>
                            <Send className="w-3.5 h-3.5 mr-2" /> Assign
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(course)}>
                            <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {course.status === "draft" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(course, "published")}>
                              <Play className="w-3.5 h-3.5 mr-2" /> Publish
                            </DropdownMenuItem>
                          )}
                          {course.status === "published" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(course, "archived")}>
                              <Pause className="w-3.5 h-3.5 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          {course.status === "archived" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(course, "published")}>
                              <Play className="w-3.5 h-3.5 mr-2" /> Re-publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(course)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {course.description && <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                        <PacingIcon className="w-3 h-3" />{pacingMeta.label}
                      </span>
                      {course.access_mode === "open" && course.status === "published" && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 flex items-center gap-1">
                          <Globe className="w-3 h-3" />Enterprise
                        </span>
                      )}
                      {assigneeCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                          <Users className="w-3 h-3" />{assigneeCount}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Course Builder Dialog */}
      <CourseBuilderDialog
        open={builderOpen}
        onClose={handleBuilderClose}
        editingCourse={editingCourse}
        clientId={user?.client_id}
        onSaved={handleBuilderClose}
      />

      {/* Assign modal */}
      {assignModal.open && assignModal.course && (
        <AssignCourseModal
          open={assignModal.open}
          onClose={() => setAssignModal({ open: false, course: null })}
          course={assignModal.course}
          users={users}
          cohorts={cohorts}
          clientId={user?.client_id}
          onAssigned={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}