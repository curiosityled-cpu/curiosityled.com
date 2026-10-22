import React from "react";
import { CheckCircle2, Lock, Circle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupLessonsByModule, isLessonLocked, lessonTitle, LESSON_TYPE_LABEL } from "@/lib/learning";

/** Learner-facing course outline: modules, lessons, completion and lock state. */
export default function CourseOutline({ lessons, done, completedCount, total, currentId, onSelect }) {
  const groups = groupLessonsByModule(lessons);
  const percent = total ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Your progress</span>
          <span className="text-sm font-semibold text-foreground">{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0202ff] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {completedCount} of {total} {total === 1 ? "lesson" : "lessons"} complete
        </p>
      </div>

      {groups.map((group, groupIndex) => (
        <div key={group.moduleId || groupIndex} className="space-y-1.5">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </p>
          {group.lessons.map((lesson) => {
            const index = lessons.findIndex((l) => l.id === lesson.id);
            const complete = done.has(lesson.id);
            const locked = isLessonLocked(lessons, done, index);
            const active = lesson.id === currentId;
            return (
              <button
                key={lesson.id}
                type="button"
                disabled={locked}
                onClick={() => onSelect(lesson)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                  active
                    ? "border-[#0202ff]/40 bg-[#0202ff]/5 shadow-sm"
                    : "border-border bg-card hover:border-[#0202ff]/25 hover:bg-muted/40",
                  locked && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card"
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {locked ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : complete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : active ? (
                    <PlayCircle className="w-4 h-4 text-[#0202ff]" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/60" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground truncate">
                    {lessonTitle(lesson)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {LESSON_TYPE_LABEL[lesson.content_type] || "Lesson"}
                    {locked && " · Locked"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}