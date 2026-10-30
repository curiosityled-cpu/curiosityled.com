import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Clock, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import useMyLearning from "@/hooks/useMyLearning";
import LearnerItemCard from "@/components/learning/LearnerItemCard";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { openResource } from "@/lib/openResource";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "course", label: "Courses" },
  { id: "resource", label: "Resources" },
  { id: "module", label: "Conversations" },
];

const statusRank = (item) =>
  item.status === "completed" ? 3 : item.status === "in_progress" ? 1 : 2;

const todayStamp = () => new Date().toISOString().slice(0, 10);
const weekStamp = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

/** The learner's assigned work: courses, resources and conversational modules. */
export default function LearningInbox({ status = "active" }) {
  const navigate = useNavigate();
  const { openWithContext } = useAtreusChat();
  const { items, loading, reload } = useMyLearning();
  const [filter, setFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const learningItems = useMemo(
    () =>
      items
        .filter((item) => item.kind !== "journey")
        .filter((item) =>
          status === "completed" ? item.status === "completed" : item.status !== "completed"
        ),
    [items, status]
  );

  // "What do I owe, and what is late" — answered before any list is read.
  const dueStats = useMemo(() => {
    const today = todayStamp();
    const week = weekStamp();
    const outstanding = learningItems.filter((item) => item.status !== "completed");
    return {
      outstanding: outstanding.length,
      overdue: outstanding.filter((item) => item.due_date && item.due_date < today).length,
      dueSoon: outstanding.filter(
        (item) => item.due_date && item.due_date >= today && item.due_date <= week
      ).length,
    };
  }, [learningItems]);

  const sorted = useMemo(() => {
    const scoped = filter === "all" ? learningItems : learningItems.filter((item) => item.kind === filter);
    const today = todayStamp();
    const list = overdueOnly
      ? scoped.filter((item) => item.due_date && item.due_date < today)
      : scoped;
    return [...list].sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return statusRank(a) - statusRank(b);
    });
  }, [learningItems, filter, overdueOnly]);

  const open = async (item) => {
    // Conversational modules run in the Atreus panel, same as a course lesson.
    if (item.launch?.module) {
      openWithContext({
        context: {
          pageType: "conversational_module",
          module_id: item.launch.module.id,
          learning_module_mode: true,
          module_data: item.launch.module,
        },
      });
      if (item.status !== "completed" && item.refId) {
        base44.entities.AssignedLearning.update(item.refId, { status: "in_progress" })
          .then(reload)
          .catch(() => {});
      }
      return;
    }
    if (item.launch?.to) {
      navigate(item.launch.to);
      return;
    }
    if (item.launch?.resource) {
      const opened = await openResource(item.launch.resource);
      if (!opened) toast.info("This resource has no link or file attached yet.");
      else if (item.status !== "completed" && item.refId) {
        await base44.entities.AssignedLearning.update(item.refId, { status: "in_progress" });
        reload();
      }
    }
  };

  const markComplete = async (item) => {
    setBusyId(item.id);
    try {
      await base44.entities.AssignedLearning.update(item.refId, {
        status: "completed",
        completion_date: new Date().toISOString(),
      });
      toast.success("Marked complete");
      await reload();
    } catch (error) {
      console.error(error);
      toast.error("Could not update this item");
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    all: learningItems.length,
    course: learningItems.filter((item) => item.kind === "course").length,
    resource: learningItems.filter((item) => item.kind === "resource").length,
    module: learningItems.filter((item) => item.kind === "module").length,
  };

  return (
    <div className="space-y-4">
      {status === "active" && !loading && dueStats.outstanding > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {dueStats.outstanding} to do
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              dueStats.overdue > 0 ? "font-medium text-red-600" : "text-muted-foreground"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {dueStats.overdue} overdue
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {dueStats.dueSoon} due in the next 7 days
          </span>
          {dueStats.overdue > 0 && (
            <button
              type="button"
              onClick={() => setOverdueOnly((prev) => !prev)}
              className={cn(
                "ml-auto rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                overdueOnly
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {overdueOnly ? "Show everything" : "Show overdue only"}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === entry.id
                ? "border-[#0202ff] bg-[#0202ff] text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {entry.label}
            <span className="ml-1.5 opacity-70">{counts[entry.id] || 0}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-32 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#0202ff]/5 border border-[#0202ff]/15 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-[#0202ff]" />
          </div>
          <p className="mt-3 font-medium text-foreground">Nothing assigned right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When your program team assigns a course, resource or conversation it lands here.
          </p>
          <Link
            to="/LearningLibrary"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0202ff] hover:underline"
          >
            <Sparkles className="w-4 h-4" />
            Browse the learning library
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((item) => (
          <LearnerItemCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onOpen={open}
            onMarkComplete={markComplete}
          />
        ))}
      </div>
    </div>
  );
}