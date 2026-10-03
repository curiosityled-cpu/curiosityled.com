import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, ArrowLeft, ArrowRight, CheckCircle2, Lock, Circle,
  ChevronDown, ChevronRight, GraduationCap, Trophy, Award,
  Layers, Menu, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LessonContent from "@/components/course/LessonContent";

export default function CoursePlayer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const courseId = searchParams.get("id");
  const initialLessonId = searchParams.get("lesson");

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);

  // Flatten lessons into ordered list with module context
  const flatLessons = useMemo(() => {
    if (!course?.modules) return [];
    const list = [];
    (course.modules || []).forEach((mod, modIdx) => {
      (mod.lessons || []).forEach((lesson, lesIdx) => {
        list.push({ ...lesson, moduleId: mod.id, moduleTitle: mod.title, moduleIndex: modIdx, lessonIndex: lesIdx });
      });
    });
    return list;
  }, [course]);

  // Build a map of lessonId -> lesson for quick lookup
  const lessonMap = useMemo(() => {
    const m = new Map();
    flatLessons.forEach(l => m.set(l.id, l));
    return m;
  }, [flatLessons]);

  const completedLessonIds = useMemo(() => {
    return new Set((progress?.completed_lessons || []).map(cl => cl.lesson_id));
  }, [progress]);

  // Determine which lessons are locked (gating)
  const lockedLessonIds = useMemo(() => {
    const locked = new Set();
    for (let i = 0; i < flatLessons.length; i++) {
      const lesson = flatLessons[i];
      if (i > 0) {
        const prevLesson = flatLessons[i - 1];
        // If previous lesson has gate=true and is not completed, this lesson is locked
        if (prevLesson.gate && !completedLessonIds.has(prevLesson.id)) {
          locked.add(lesson.id);
        }
      }
    }
    return locked;
  }, [flatLessons, completedLessonIds]);

  const loadData = useCallback(async () => {
    if (!courseId || !user?.email) return;
    setLoading(true);
    try {
      const courseData = await base44.entities.Course.get(courseId);
      setCourse(courseData);

      // Load or create progress
      let progressData = await base44.entities.CourseProgress.filter({
        course_id: courseId,
        learner_email: user.email,
      });
      if (progressData && progressData.length > 0) {
        setProgress(progressData[0]);
      } else {
        // Auto-enroll if no progress exists (e.g., open course)
        const newProgress = await base44.entities.CourseProgress.create({
          course_id: courseId,
          course_title: courseData.title,
          learner_email: user.email,
          client_id: courseData.client_id || user?.data?.client_id || null,
          status: "not_started",
          completed_lessons: [],
          overall_percentage: 0,
          enrolled_at: new Date().toISOString(),
          certificate_issued: false,
          cohort_id: courseData.cohort_id || null,
        });
        setProgress(newProgress);
      }

      // Expand first module by default
      if (courseData.modules?.length > 0) {
        setExpandedModules({ [courseData.modules[0].id]: true });
      }
    } catch (err) {
      console.error("Error loading course:", err);
      toast.error("Could not load this course.");
    } finally {
      setLoading(false);
    }
  }, [courseId, user?.email]);

  useEffect(() => { loadData(); }, [loadData]);

  // Set initial lesson
  useEffect(() => {
    if (flatLessons.length === 0) return;
    if (initialLessonId && lessonMap.has(initialLessonId)) {
      setCurrentLessonId(initialLessonId);
    } else if (!currentLessonId) {
      // First uncompleted lesson, or first lesson
      const firstUncompleted = flatLessons.find(l => !completedLessonIds.has(l.id));
      setCurrentLessonId((firstUncompleted || flatLessons[0]).id);
    }
  }, [flatLessons, initialLessonId, completedLessonIds, currentLessonId, lessonMap]);

  const currentLesson = currentLessonId ? lessonMap.get(currentLessonId) : null;
  const currentIndex = flatLessons.findIndex(l => l.id === currentLessonId);
  const isCurrentCompleted = currentLessonId && completedLessonIds.has(currentLessonId);
  const isCurrentLocked = currentLessonId && lockedLessonIds.has(currentLessonId);

  const totalLessons = flatLessons.length;
  const completedCount = completedLessonIds.size;
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleMarkComplete = async () => {
    if (!progress || !currentLesson || isCurrentCompleted) return;
    setSaving(true);
    try {
      const newCompleted = [
        ...(progress.completed_lessons || []),
        { lesson_id: currentLesson.id, completed_at: new Date().toISOString() },
      ];
      const newPct = totalLessons > 0 ? Math.round((newCompleted.length / totalLessons) * 100) : 100;

      // Check course completion
      const completionRule = course.completion_rule || { type: "all_lessons" };
      let isComplete = false;
      if (completionRule.type === "all_lessons") {
        isComplete = newCompleted.length >= totalLessons;
      } else if (completionRule.type === "minimum_lessons") {
        isComplete = newCompleted.length >= (completionRule.minimum_count || 0);
      }

      const updateData = {
        completed_lessons: newCompleted,
        overall_percentage: newPct,
        last_accessed_at: new Date().toISOString(),
        status: isComplete ? "completed" : "in_progress",
      };
      if (isComplete) {
        updateData.completed_at = new Date().toISOString();
      }

      const updated = await base44.entities.CourseProgress.update(progress.id, updateData);
      setProgress(updated);

      if (isComplete) {
        setCourseCompleted(true);
        // Issue certificate if template exists
        if (course.certificate_template_id) {
          try {
            await base44.entities.LearningCertificate.create({
              user_email: user.email,
              certificate_type: "module_completion",
              title: `${course.title} — Completion Certificate`,
              description: `Awarded for completing the course "${course.title}"`,
              issued_date: new Date().toISOString(),
              final_score: newPct,
              metadata: { course_id: course.id, course_title: course.title },
            });
            await base44.entities.CourseProgress.update(progress.id, {
              certificate_issued: true,
              certificate_id: "issued",
            });
          } catch (certErr) {
            console.warn("Certificate issuance failed:", certErr);
          }
        }
        toast.success("🎉 Course completed! Congratulations!");
      } else {
        toast.success("Lesson marked complete");
      }

      // Auto-advance to next unlocked lesson
      const nextLesson = flatLessons[currentIndex + 1];
      if (nextLesson && !lockedLessonIds.has(nextLesson.id)) {
        setTimeout(() => {
          setCurrentLessonId(nextLesson.id);
        }, isComplete ? 1500 : 300);
      }
    } catch (err) {
      console.error("Error marking complete:", err);
      toast.error("Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const handleLessonClick = (lessonId) => {
    if (lockedLessonIds.has(lessonId)) {
      toast.info("Complete the previous lesson to unlock this one.");
      return;
    }
    setCurrentLessonId(lessonId);
    setSidebarOpen(false);
  };

  const toggleModule = (modId) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <GraduationCap className="w-12 h-12 mb-4 text-gray-300" />
        <p className="font-medium text-gray-700">Course not found</p>
        <Link to="/courses" className="text-sm text-[#0202ff] mt-2">← Back to Learning Library</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/courses")} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" /> Library
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{course.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Progress value={overallPct} className="h-1.5 flex-1 max-w-xs" />
              <span className="text-xs text-gray-500 flex-shrink-0">{completedCount}/{totalLessons} lessons · {overallPct}%</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar — Module/Lesson tree */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside className={`
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
          w-80 bg-white border-r border-gray-100
          flex flex-col
          transition-transform duration-200
        `}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between lg:hidden">
            <p className="font-medium text-sm">Course Contents</p>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {(course.modules || []).map((mod, modIdx) => {
              const isExpanded = expandedModules[mod.id] ?? true;
              const modLessons = mod.lessons || [];
              const modCompleted = modLessons.filter(l => completedLessonIds.has(l.id)).length;
              return (
                <div key={mod.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                    <Layers className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{modIdx + 1}. {mod.title}</p>
                      <p className="text-[10px] text-gray-400">{modCompleted}/{modLessons.length} done</p>
                    </div>
                  </button>
                  {isExpanded && modLessons.map((lesson, lesIdx) => {
                    const isCompleted = completedLessonIds.has(lesson.id);
                    const isLocked = lockedLessonIds.has(lesson.id);
                    const isActive = currentLessonId === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson.id)}
                        className={`w-full flex items-center gap-2 pl-9 pr-2 py-2 rounded-lg text-left text-xs transition-colors
                          ${isActive ? "bg-[#0202ff]/10 text-[#0202ff] font-medium" : "hover:bg-gray-50 text-gray-600"}
                          ${isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        {isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1">{lesson.title || lesson.reference_title || `Lesson ${lesIdx + 1}`}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {currentLesson ? (
              <>
                {/* Lesson header */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    {currentLesson.moduleTitle} · Lesson {currentIndex + 1} of {totalLessons}
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentLesson.title || currentLesson.reference_title || "Untitled Lesson"}
                  </h1>
                </div>

                {/* Lesson content */}
                <Card className="shadow-sm border border-gray-100 rounded-2xl">
                  <CardContent className="p-6">
                    {isCurrentLocked ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <Lock className="w-12 h-12 mb-4 text-gray-300" />
                        <p className="font-medium text-gray-700">This lesson is locked</p>
                        <p className="text-sm mt-1">Complete the previous lesson to unlock it.</p>
                      </div>
                    ) : (
                      <LessonContent lesson={currentLesson} />
                    )}
                  </CardContent>
                </Card>

                {/* Action bar */}
                {!isCurrentLocked && (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentIndex > 0) setCurrentLessonId(flatLessons[currentIndex - 1].id);
                      }}
                      disabled={currentIndex <= 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                    <Button
                      onClick={handleMarkComplete}
                      disabled={saving || isCurrentCompleted}
                      className={isCurrentCompleted ? "bg-green-600 hover:bg-green-600 text-white" : "bg-[#0202ff] hover:bg-[#0101dd] text-white"}
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                       isCurrentCompleted ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {isCurrentCompleted ? "Completed" : "Mark Complete"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentIndex < flatLessons.length - 1) {
                          const next = flatLessons[currentIndex + 1];
                          if (!lockedLessonIds.has(next.id)) setCurrentLessonId(next.id);
                        }
                      }}
                      disabled={currentIndex >= flatLessons.length - 1}
                    >
                      Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <GraduationCap className="w-12 h-12 mb-4 text-gray-300" />
                <p className="font-medium text-gray-700">No lessons in this course yet</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Course completion celebration */}
      <AnimatePresence>
        {courseCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setCourseCompleted(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Course Complete!</h2>
              <p className="text-sm text-gray-500 mb-1">
                You've finished "{course.title}".
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {course.certificate_template_id ? "Your completion certificate has been issued." : "Great work completing all the lessons."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setCourseCompleted(false)}>Stay Here</Button>
                <Button onClick={() => navigate("/courses")} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
                  Back to Library
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}