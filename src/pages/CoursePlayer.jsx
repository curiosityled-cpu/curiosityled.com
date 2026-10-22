import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import CourseOutline from "@/components/learning/course/CourseOutline";
import LessonViewer from "@/components/learning/course/LessonViewer";
import CourseCelebration from "@/components/learning/course/CourseCelebration";
import { computeCourseProgress, dueMeta, nextLesson } from "@/lib/learning";

/** Full-screen learner player for one course: outline, lesson content, progress, certificate. */
export default function CoursePlayer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [loading, setLoading] = useState(true);
  const syncedRef = useRef(false);

  const computed = useMemo(
    () => (course ? computeCourseProgress(course, progress) : { lessons: [], done: new Set(), completedCount: 0, total: 0, percent: 0, isComplete: false }),
    [course, progress]
  );

  const issueCertificate = useCallback(async (recordId) => {
    setIssuing(true);
    try {
      const response = await base44.functions.invoke("issueCourseCertificate", {
        course_progress_id: recordId,
      });
      setCertificate(response?.data?.certificate || null);
      const rewards = response?.data?.rewards;
      if (rewards?.points) toast.success(`+${rewards.points} points earned`);
      if (rewards?.badges_awarded?.length) {
        toast.success(`New badge unlocked: ${rewards.badges_awarded.join(", ")}`);
      }
    } catch (error) {
      console.error("Certificate issuance failed:", error);
    } finally {
      setIssuing(false);
    }
  }, []);

  // Lessons and course definition arrive as arguments, never read from render state:
  // a captured value here changes identity on every load, which would change load()
  // itself and re-trigger the load effect in a loop.
  const applyCompletion = useCallback(
    async (ids, record, lessons, courseDef) => {
      const rule = courseDef?.completion_rule || { type: "all_lessons" };
      const percent = lessons.length ? Math.round((ids.length / lessons.length) * 100) : 0;
      const isComplete =
        lessons.length > 0 &&
        (rule.type === "minimum_lessons"
          ? ids.length >= Math.max(1, rule.minimum_count || 1)
          : ids.length === lessons.length);

      const existing = new Map(
        (record?.completed_lessons || []).map((entry) => [entry.lesson_id, entry.completed_at])
      );
      const wasComplete = record?.status === "completed";

      const updated = await base44.entities.CourseProgress.update(record.id, {
        completed_lessons: ids.map((id) => ({
          lesson_id: id,
          completed_at: existing.get(id) || new Date().toISOString(),
        })),
        overall_percentage: percent,
        status: isComplete ? "completed" : "in_progress",
        last_lesson_id: ids.includes(record.last_lesson_id) ? record.last_lesson_id : ids[ids.length - 1],
        ...(isComplete ? { completed_at: record.completed_at || new Date().toISOString() } : {}),
      });
      setProgress(updated);

      if (isComplete && !wasComplete) {
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } });
        toast.success("Course complete");
        await issueCertificate(updated.id);
      }
      return updated;
    },
    [issueCertificate]
  );

  const load = useCallback(async () => {
    if (!courseId || !email) return;
    setLoading(true);
    try {
      const [courses, rows] = await Promise.all([
        base44.entities.Course.filter({ id: courseId }),
        base44.entities.CourseProgress.filter({ learner_email: email, course_id: courseId }),
      ]);
      const found = courses?.[0] || null;
      setCourse(found);

      let record = rows?.[0] || null;
      if (!record && found) {
        record = await base44.entities.CourseProgress.create({
          course_id: courseId,
          course_title: found.title,
          learner_email: email,
          client_id: found.client_id,
          status: "not_started",
          overall_percentage: 0,
          enrolled_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        });
      }
      setProgress(record);
      if (!record || !found) return;

      const { lessons, done } = computeCourseProgress(found, record);
      const resume =
        lessons.find((lesson) => lesson.id === record.last_lesson_id) || nextLesson(lessons, done);
      setCurrentId(resume?.id || null);

      if (record.status === "completed") {
        await issueCertificate(record.id);
      } else if (record.status === "not_started") {
        const touched = await base44.entities.CourseProgress.update(record.id, {
          status: "in_progress",
          last_accessed_at: new Date().toISOString(),
          last_lesson_id: resume?.id,
        });
        setProgress(touched);
      } else {
        base44.entities.CourseProgress.update(record.id, {
          last_accessed_at: new Date().toISOString(),
          last_lesson_id: resume?.id,
        });
      }

      // Sync lessons backed by conversational modules the learner already finished.
      if (!syncedRef.current && lessons.some((lesson) => lesson.content_type === "conversational_module")) {
        syncedRef.current = true;
        const moduleProgress = await base44.entities.LearnerProgress.filter({
          user_email: email,
          status: "completed",
        });
        const completedModuleIds = new Set(
          (moduleProgress || []).map((row) => row.conversational_learning_module_id)
        );
        const autoIds = lessons
          .filter(
            (lesson) =>
              lesson.content_type === "conversational_module" &&
              completedModuleIds.has(lesson.reference_id) &&
              !done.has(lesson.id)
          )
          .map((lesson) => lesson.id);
        if (autoIds.length) {
          await applyCompletion([...done, ...autoIds], record, lessons, found);
        }
      }
    } catch (error) {
      console.error("Course load error:", error);
      toast.error("Could not load this course");
    } finally {
      setLoading(false);
    }
  }, [courseId, email, applyCompletion, issueCertificate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (lesson) => {
    const ids = new Set(progress?.completed_lessons?.map((entry) => entry.lesson_id) || []);
    if (ids.has(lesson.id)) return;
    ids.add(lesson.id);
    const next = computed.lessons.find((item) => !ids.has(item.id));
    if (next) setCurrentId(next.id);
    try {
      await applyCompletion([...ids], progress, computed.lessons, course);
    } catch (error) {
      console.error(error);
      toast.error("Could not save your progress. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading course…
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <p className="text-foreground font-medium">This course is not available.</p>
        <Link
          to="/my-development"
          className="mt-3 inline-flex items-center gap-2 text-sm text-[#0202ff] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to my development
        </Link>
      </div>
    );
  }

  const currentLesson = computed.lessons.find((lesson) => lesson.id === currentId) || null;
  const due = dueMeta(progress?.due_date);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link
        to="/my-development"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        My development
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
        {course.description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl">{course.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            {computed.completedCount} of {computed.total} lessons complete
          </span>
          {due && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              {due.label}
            </span>
          )}
          {progress?.assigned_by && <span>Assigned by {progress.assigned_by}</span>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CourseOutline
            lessons={computed.lessons}
            done={computed.done}
            completedCount={computed.completedCount}
            total={computed.total}
            currentId={currentId}
            onSelect={(lesson) => setCurrentId(lesson.id)}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {computed.isComplete ? (
            <CourseCelebration
              course={course}
              certificate={certificate}
              issuing={issuing}
              onBack={() => navigate("/my-development")}
            />
          ) : currentLesson ? (
            <LessonViewer
              lesson={{ ...currentLesson, moduleTitle: currentLesson.moduleTitle }}
              complete={computed.done.has(currentLesson.id)}
              onComplete={handleComplete}
              onAdvance={() => {
                const next = computed.lessons.find(
                  (lesson) => !computed.done.has(lesson.id) && lesson.id !== currentLesson.id
                );
                if (next) setCurrentId(next.id);
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              This course has no lessons yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}