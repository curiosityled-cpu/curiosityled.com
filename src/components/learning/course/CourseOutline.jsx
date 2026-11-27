import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Lock, Circle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupLessonsByModule, isLessonLocked, lessonTitle, LESSON_TYPE_LABEL } from "@/lib/learning";

/**
 * Learner-facing course outline. Modules collapse so a long course stays legible,
 * each shows its own progress, and the module the learner is in opens itself.
 */
export default function CourseOutline({ lessons, done, completedCount, total, currentId, onSelect }) {
  const groups = useMemo(() => groupLessonsByModule(lessons), [lessons]);
  const percent = total ? Math.round((completedCount / total) * 100) : 0;

  const currentGroupIndex = groups.findIndex((group) =>
    group.lessons.some((lesson) => lesson.id === currentId)
  );

  const [openModules, setOpenModules] = useState(() =>
    new Set(currentGroupIndex >= 0 ? [currentGroupIndex] : [0])
  );

  useEffect(() => {
    if (currentGroupIndex < 0) return;
    setOpenModules((prev) => (prev.has(currentGroupIndex) ? prev : new Set([...prev, currentGroupIndex])));
  }, [currentGroupIndex, currentId]);

  const toggleModule = (index) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Your progress</span>
          <span className="text-sm font-semibold text-foreground">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#0202ff] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {completedCount} of {total} {total === 1 ? "lesson" : "lessons"} complete
        </p>
      </div>

      {groups.map((group, groupIndex) => {
        const groupDone = group.lessons.filter((lesson) => done.has(lesson.id)).length;
        const open = openModules.has(groupIndex);
        const holdsCurrent = groupIndex === currentGroupIndex;

        return (
          <div key={group.moduleId || groupIndex} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleModule(groupIndex)}
              aria-expanded={open}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-xs font-semibold uppercase tracking-wide",
                    holdsCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {group.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {groupDone} of {group.lessons.length} complete
                </span>
              </span>
              <ChevronDown
                className={cn("h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
              />
            </button>

            {open && (
              <div className="space-y-1.5 border-t border-border p-2">
                {group.lessons.map((lesson) => {
                  const index = lessons.findIndex((item) => item.id === lesson.id);
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
                        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                        active
                          ? "border-[#0202ff]/40 bg-[#0202ff]/5 shadow-sm"
                          : "border-border bg-card hover:border-[#0202ff]/25 hover:bg-muted/40",
                        locked && "cursor-not-allowed opacity-50 hover:border-border hover:bg-card"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {locked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : complete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : active ? (
                          <PlayCircle className="h-4 w-4 text-[#0202ff]" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
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
            )}
          </div>
        );
      })}
    </div>
  );
}