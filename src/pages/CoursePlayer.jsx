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

  // Completion is decided by the learning server, never written from the browser: the
  // learner reports the lesson they finished and the server derives the result against
  // the course's published version, then records it in the learner's permanent record.
  const command = useCallback(
    async (action, lessonId) => {
      const response = await base44.functions.invoke("learningRecordCommand", {
        action,
        course_id: courseId,
        ...(lessonId ? { lesson_id: lessonId } : {}),
      });
      const updated = response?.data?.progress;
      if (updated) setProgress(updated);
      if (response?.data?.completed_now && updated) {
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 } });
        toast.success("Course complete");
        await issueCertificate(updated.id);
      }
      return updated;
    },
    [courseId, issueCertificate]
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

      if (!found) return;

      // Opening a course enrols the learner and resumes where they left off — done by the
      // server so the record is never a browser claim.
      const record = (await command("ensure_enrollment")) || rows?.[0] || null;
      if (!record) return;

      const { lessons, done } = computeCourseProgress(found, record);
      const resume =
        lessons.find((lesson) => lesson.id === record.last_lesson_id) || nextLesson(lessons, done);
      setCurrentId(resume?.id || null);

      if (record.status === "completed") {
        await issueCertificate(record.id);
      }

      // Lessons backed by conversational modules the learner already finished are
      // completed by the server from that module's own progress record.
      if (!syncedRef.current && lessons.some((lesson) => lesson.content_type === "conversational_module")) {
        syncedRef.current = true;
        await command("sync_modules");
      }
    } catch (error) {
      console.error("Course load error:", error);
      toast.error("Could not load this course");
    } finally {
      setLoading(false);
    }
  }, [courseId, email, command, issueCertificate]);

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
      await command("complete_lesson", lesson.id);
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