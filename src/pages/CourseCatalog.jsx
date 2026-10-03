import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Loader2, Search, Clock, Calendar, Globe,
  CheckCircle2, Play, Lock, Layers, Trophy, ArrowRight, BookOpen
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

const PACING_LABELS = {
  self_paced: { label: "Self-paced", icon: Clock },
  cohort: { label: "Cohort-paced", icon: Calendar },
};

function countLessons(course) {
  return (course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);
}

export default function CourseCatalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [enrolling, setEnrolling] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [courseData, progressData] = await Promise.all([
        base44.entities.Course.list("-updated_date", 100),
        base44.entities.CourseProgress.filter({ learner_email: user.email }),
      ]);
      setCourses(courseData || []);
      setProgressRecords(progressData || []);
    } catch (err) {
      console.error("Error loading catalog:", err);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { loadData(); }, [loadData]);

  const progressMap = new Map((progressRecords || []).map(p => [p.course_id, p]));

  // Only show published courses
  const availableCourses = (courses || []).filter(c => c.status === "published");

  const inProgress = availableCourses.filter(c => {
    const p = progressMap.get(c.id);
    return p && p.status === "in_progress";
  });
  const assigned = availableCourses.filter(c => {
    const p = progressMap.get(c.id);
    return !p && (c.assigned_to_emails || []).includes(user?.email);
  });
  const openCourses = availableCourses.filter(c => {
    const p = progressMap.get(c.id);
    return !p && c.access_mode === "open" && !(c.assigned_to_emails || []).includes(user?.email);
  });
  const completed = availableCourses.filter(c => {
    const p = progressMap.get(c.id);
    return p && p.status === "completed";
  });

  const filteredOpen = openCourses.filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEnroll = async (course) => {
    setEnrolling(course.id);
    try {
      // Check if already enrolled
      const existing = await base44.entities.CourseProgress.filter({
        course_id: course.id,
        learner_email: user.email,
      });
      if (existing && existing.length > 0) {
        toast.info("You're already enrolled in this course.");
        navigate(`/course-player?id=${course.id}`);
        return;
      }
      await base44.entities.CourseProgress.create({
        course_id: course.id,
        course_title: course.title,
        learner_email: user.email,
        client_id: course.client_id || user?.data?.client_id || null,
        status: "not_started",
        completed_lessons: [],
        overall_percentage: 0,
        enrolled_at: new Date().toISOString(),
        certificate_issued: false,
        cohort_id: course.cohort_id || null,
      });
      toast.success(`Enrolled in "${course.title}"`);
      navigate(`/course-player?id=${course.id}`);
    } catch (err) {
      console.error("Enrollment error:", err);
      toast.error("Failed to enroll. Please try again.");
    } finally {
      setEnrolling(null);
    }
  };

  const handleStart = (course) => {
    navigate(`/course-player?id=${course.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-[#0202ff]" />
          Learning Library
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse courses, track your progress, and earn certificates.
        </p>
      </div>

      {/* Continue Learning */}
      {inProgress.length > 0 && (
        <Section title="Continue Learning" icon={Play}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgress.map(course => (
              <CourseProgressCard key={course.id} course={course} progress={progressMap.get(course.id)} onStart={handleStart} />
            ))}
          </div>
        </Section>
      )}

      {/* Assigned */}
      {assigned.length > 0 && (
        <Section title="Assigned to You" icon={BookOpen}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assigned.map(course => (
              <CourseCard key={course.id} course={course} onAction={handleStart} actionLabel="Start" actionIcon={Play} />
            ))}
          </div>
        </Section>
      )}

      {/* Available / Open Enrollment */}
      <Section title="Available Courses" icon={Globe}>
        {openCourses.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 rounded-2xl">
            <CardContent className="p-8 text-center">
              <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-700">No open enrollment courses available</p>
              <p className="text-sm text-gray-500 mt-1">
                Courses available to everyone in your organization will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
          {openCourses.length > 3 && (
            <div className="relative mb-4 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search available courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOpen.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onAction={handleEnroll}
                actionLabel="Enroll"
                actionIcon={ArrowRight}
                loading={enrolling === course.id}
              />
            ))}
          </div>
          </>
        )}
      </Section>

      {/* Completed */}
      {completed.length > 0 && (
        <Section title="Completed" icon={Trophy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.map(course => (
              <CourseProgressCard key={course.id} course={course} progress={progressMap.get(course.id)} onStart={handleStart} completed />
            ))}
          </div>
        </Section>
      )}

      {inProgress.length === 0 && assigned.length === 0 && openCourses.length === 0 && completed.length === 0 && (
        <Card className="shadow-sm border border-gray-100 rounded-2xl">
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-semibold text-gray-700">No courses available yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Courses assigned to you or open for enrollment will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
        <Icon className="w-4 h-4 text-gray-400" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function CourseCard({ course, onAction, actionLabel, actionIcon: ActionIcon, loading }) {
  const lessonCount = countLessons(course);
  const moduleCount = (course.modules || []).length;
  const pacingMeta = PACING_LABELS[course.pacing] || PACING_LABELS.self_paced;
  const PacingIcon = pacingMeta.icon;
  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow h-full flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0202ff]/10">
            <GraduationCap className="w-5 h-5 text-[#0202ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 line-clamp-2">{course.title}</p>
            {course.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{course.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
            <Layers className="w-3 h-3" />{moduleCount} modules · {lessonCount} lessons
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
            <PacingIcon className="w-3 h-3" />{pacingMeta.label}
          </span>
          {course.access_mode === "open" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1">
              <Globe className="w-3 h-3" />Enterprise
            </span>
          )}
        </div>
        <Button
          onClick={() => onAction(course)}
          disabled={loading}
          className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ActionIcon className="w-4 h-4 mr-2" />}
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function CourseProgressCard({ course, progress, onStart, completed }) {
  const lessonCount = countLessons(course);
  const pct = progress?.overall_percentage || 0;
  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${completed ? "bg-green-50" : "bg-[#0202ff]/10"}`}>
            {completed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <GraduationCap className="w-5 h-5 text-[#0202ff]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 line-clamp-2">{course.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {lessonCount} lessons · {completed ? "Completed" : `${pct}% complete`}
            </p>
          </div>
        </div>
        {!completed && (
          <div className="space-y-1">
            <Progress value={pct} className="h-2" />
          </div>
        )}
        <Button
          onClick={() => onStart(course)}
          variant={completed ? "outline" : "default"}
          className={`w-full h-9 text-xs ${!completed ? "bg-[#0202ff] hover:bg-[#0101dd] text-white" : ""}`}
        >
          {completed ? (
            <><Trophy className="w-4 h-4 mr-2" />Review Course</>
          ) : pct > 0 ? (
            <><Play className="w-4 h-4 mr-2" />Continue</>
          ) : (
            <><Play className="w-4 h-4 mr-2" />Start</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}