/**
 * Pure helpers for the learner-facing learning surfaces (inbox + course player).
 * Kept dependency-free so both the player and the cards can share them.
 */

/** Flattens a course's modules/lessons into one ordered list. */
export function flattenLessons(course) {
  const out = [];
  (course?.modules || []).forEach((module, moduleIndex) => {
    (module.lessons || []).forEach((lesson, lessonIndex) => {
      out.push({
        ...lesson,
        moduleId: module.id,
        moduleTitle: module.title,
        moduleIndex,
        lessonIndex,
        order: out.length,
      });
    });
  });
  return out;
}

/** Groups an ordered lesson list back into module chunks for the outline. */
export function groupLessonsByModule(lessons) {
  const groups = [];
  lessons.forEach((lesson) => {
    const last = groups[groups.length - 1];
    if (last && last.moduleId === lesson.moduleId) {
      last.lessons.push(lesson);
    } else {
      groups.push({ moduleId: lesson.moduleId, title: lesson.moduleTitle, lessons: [lesson] });
    }
  });
  return groups;
}

export function lessonTitle(lesson) {
  return lesson?.title || lesson?.reference_title || `Lesson ${(lesson?.order ?? 0) + 1}`;
}

export function completedLessonIds(progress) {
  return new Set((progress?.completed_lessons || []).map((entry) => entry.lesson_id));
}

/** Progress + completion state for one course, derived from the course definition. */
export function computeCourseProgress(course, progress) {
  const lessons = flattenLessons(course);
  const done = completedLessonIds(progress);
  const completedCount = lessons.filter((lesson) => done.has(lesson.id)).length;
  const total = lessons.length;
  const percent = total ? Math.round((completedCount / total) * 100) : 0;
  const rule = course?.completion_rule || { type: "all_lessons" };
  const isComplete =
    total > 0 &&
    (rule.type === "minimum_lessons"
      ? completedCount >= Math.max(1, rule.minimum_count || 1)
      : completedCount === total);
  return { lessons, done, completedCount, total, percent, isComplete };
}

/** A lesson is locked while any earlier gated lesson is still incomplete. */
export function isLessonLocked(lessons, done, index) {
  for (let i = 0; i < index; i += 1) {
    if (lessons[i].gate && !done.has(lessons[i].id)) return true;
  }
  return false;
}

/** The lesson to resume at: the first incomplete one, else the first lesson. */
export function nextLesson(lessons, done) {
  return lessons.find((lesson) => !done.has(lesson.id)) || lessons[0] || null;
}

const DAY_MS = 86400000;

/** Short due-date label + tone for chips. Tones map to literal classes below. */
export function dueMeta(dueDate) {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`);
  const days = Math.ceil((due.getTime() - Date.now()) / DAY_MS);
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, tone: "danger" };
  if (days === 0) return { label: "Due today", tone: "warn" };
  if (days <= 7) return { label: `Due in ${days}d`, tone: "warn" };
  return {
    label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    tone: "muted",
  };
}

export const DUE_TONE_CLASSES = {
  danger: "bg-red-50 text-red-700 border-red-100",
  warn: "bg-amber-50 text-amber-700 border-amber-100",
  muted: "bg-muted text-muted-foreground border-border",
};

/** Kinds of learner work items. Class strings are literal so they survive the build. */
export const KIND_META = {
  course: {
    label: "Course",
    cta: "Continue",
    ctaNew: "Start course",
    chipClass: "bg-[#0202ff]/5 text-[#0202ff] border-[#0202ff]/15",
    barClass: "bg-[#0202ff]",
  },
  resource: {
    label: "Resource",
    cta: "Open",
    ctaNew: "Open resource",
    chipClass: "bg-blue-50 text-blue-700 border-blue-100",
    barClass: "bg-blue-500",
  },
  module: {
    label: "Conversation",
    cta: "Continue",
    ctaNew: "Start conversation",
    chipClass: "bg-purple-50 text-purple-700 border-purple-100",
    barClass: "bg-purple-500",
  },
  journey: {
    label: "Journey",
    cta: "View journey",
    ctaNew: "View journey",
    chipClass: "bg-amber-50 text-amber-700 border-amber-100",
    barClass: "bg-amber-500",
  },
};

export const LESSON_TYPE_LABEL = {
  resource: "Content",
  live_class: "Live session",
  assessment: "Assessment",
  form: "Form",
  conversational_module: "Conversation",
};

export function formatMinutes(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}