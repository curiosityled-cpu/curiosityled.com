import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ExternalLink, MessageSquare, ClipboardList, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import ResourceFileViewer from "@/components/learning/ResourceFileViewer";
import { LESSON_TYPE_LABEL, formatMinutes, lessonTitle } from "@/lib/learning";

/** Renders one lesson of a course and offers the single next action for it. */
export default function LessonViewer({ lesson, complete, onComplete, onAdvance }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!lesson) return;
      setState({ loading: true });
      try {
        if (lesson.content_type === "resource") {
          const rows = await base44.entities.LearningResource.filter({ id: lesson.reference_id });
          if (!cancelled) setState({ loading: false, resource: rows?.[0] || null });
          return;
        }
        if (lesson.content_type === "conversational_module") {
          const [rows, progress] = await Promise.all([
            base44.entities.ConversationalLearningModule.filter({ id: lesson.reference_id }),
            user?.email
              ? base44.entities.LearnerProgress.filter({
                  user_email: user.email,
                  conversational_learning_module_id: lesson.reference_id,
                })
              : Promise.resolve([]),
          ]);
          if (!cancelled)
            setState({ loading: false, module: rows?.[0] || null, progress: progress?.[0] || null });
          return;
        }
        if (lesson.content_type === "form" || lesson.content_type === "assessment") {
          const rows = await base44.entities.CustomForm
            .filter({ id: lesson.reference_id })
            .catch(() => []);
          if (!cancelled) setState({ loading: false, form: rows?.[0] || null });
          return;
        }
        if (!cancelled) setState({ loading: false });
      } catch (error) {
        console.error("Lesson load error:", error);
        if (!cancelled) setState({ loading: false });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [lesson?.id, user?.email]);

  // The conversational module runs in the Atreus panel. When it finishes there,
  // this lesson is ticked off so the learner never has to mark it by hand.
  useEffect(() => {
    if (lesson?.content_type !== "conversational_module") return undefined;
    const handler = (event) => {
      if (event.detail?.moduleId !== lesson.reference_id) return;
      setState((prev) => ({ ...prev, progress: { ...(prev.progress || {}), status: "completed" } }));
      if (!complete) onComplete?.(lesson);
    };
    window.addEventListener("learning-module-completed", handler);
    return () => window.removeEventListener("learning-module-completed", handler);
  }, [lesson?.id, lesson?.content_type, lesson?.reference_id, complete, onComplete]);

  if (!lesson) return null;

  const title = lessonTitle(lesson);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {LESSON_TYPE_LABEL[lesson.content_type] || "Lesson"}
          {lesson.moduleTitle ? ` · ${lesson.moduleTitle}` : ""}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
      </div>

      <div className="px-5 py-5">
        {state.loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading lesson…
          </div>
        )}

        {!state.loading && lesson.content_type === "resource" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {state.resource?.description || "Open this resource to work through the material."}
            </p>
            <p className="text-xs text-muted-foreground">
              {[state.resource?.provider, state.resource?.type, state.resource?.duration_string]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {state.resource && (
              <ResourceFileViewer
                resource={state.resource}
                onEnded={() => {
                  if (!complete) onComplete?.(lesson);
                }}
              />
            )}
            {state.resource?.url && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(state.resource.url, "_blank", "noopener")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open resource
              </Button>
            )}
            {!state.resource && (
              <p className="text-sm text-muted-foreground">
                This content is no longer available. Ask your program team to check the lesson link.
              </p>
            )}
          </div>
        )}

        {!state.loading && lesson.content_type === "conversational_module" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {state.module?.description ||
                "A guided conversation with Atreus. Work through it at your own pace."}
            </p>
            <p className="text-xs text-muted-foreground">
              {[
                state.module?.conversation_structure?.length
                  ? `${state.module.conversation_structure.length} steps`
                  : null,
                formatMinutes(state.module?.estimated_duration_minutes),
                state.progress?.status === "completed" ? "Completed" : "Not yet complete",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Button
              type="button"
              disabled={!state.module}
              onClick={() =>
                openWithContext({
                  context: {
                    pageType: "conversational_module",
                    module_id: lesson.reference_id,
                    learning_module_mode: true,
                    module_data: state.module,
                  },
                })
              }
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {state.progress?.status === "completed" ? "Revisit with Atreus" : "Start with Atreus"}
            </Button>
          </div>
        )}

        {!state.loading && (lesson.content_type === "form" || lesson.content_type === "assessment") && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {state.form?.description || "Complete this activity, then mark the lesson done."}
            </p>
            <Button
              type="button"
              onClick={() => navigate(`/FormSubmission?formId=${lesson.reference_id}`)}
              className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Open activity
            </Button>
          </div>
        )}

        {!state.loading && lesson.content_type === "live_class" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CalendarDays className="w-4 h-4 text-[#0202ff]" />
              {lesson.reference_title || title}
            </div>
            <p className="text-sm text-muted-foreground">
              Session details are shared by your program team. Mark this lesson done once you have
              attended.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
        {complete ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Check className="w-4 h-4" />
              Lesson complete
            </span>
            {onAdvance && (
              <Button type="button" variant="outline" size="sm" onClick={onAdvance}>
                Next lesson
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            onClick={() => onComplete?.(lesson)}
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark lesson complete
          </Button>
        )}
      </div>
    </div>
  );
}