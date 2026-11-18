/**
 * DevelopmentSnapshotCard — compact action-first development card for the
 * Practice page's right column.
 *
 * Leads with the items a manager can act on now: overdue first, then due
 * within two weeks, then the ones already most of the way done. The progress
 * snapshot sits under them as a one-line summary.
 */
import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Compass, GraduationCap, BookOpen, MessageSquare, Map, ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import useMyLearning from "@/hooks/useMyLearning";
import { DUE_TONE_CLASSES, KIND_META, dueMeta } from "@/lib/learning";
import { openResource } from "@/lib/openResource";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const KIND_ICON = {
  course: GraduationCap,
  resource: BookOpen,
  module: MessageSquare,
  journey: Map,
};

const MAX_ROWS = 5;
const DUE_WINDOW_DAYS = 14;
const NEARLY_DONE = 60;
const DAY_MS = 86400000;

/** Days until a due date (negative when overdue, null when undated). */
function daysUntil(dueDate) {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`).getTime();
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / DAY_MS);
}

/** Urgency score: overdue > due soon > nearly finished. */
function focusRank(item) {
  const days = daysUntil(item.due_date);
  if (days !== null && days < 0) return 1000 + Math.abs(days);
  if (days !== null && days <= DUE_WINDOW_DAYS) return 500 + (DUE_WINDOW_DAYS - days);
  if (typeof item.percent === "number" && item.percent >= NEARLY_DONE) return 100 + item.percent;
  return 0;
}

export default function DevelopmentSnapshotCard() {
  const navigate = useNavigate();
  const { openWithContext } = useAtreusChat();
  const { items, loading, reload } = useMyLearning();
  const [busyId, setBusyId] = useState(null);

  const openItems = useMemo(
    () => items.filter((item) => item.status !== "completed"),
    [items]
  );

  const focus = useMemo(() => {
    const scored = openItems
      .map((item) => ({ item, score: focusRank(item) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length) return scored.slice(0, MAX_ROWS).map((entry) => entry.item);

    // Nothing dated or nearly done — still surface what is in flight.
    return openItems
      .filter((item) => item.status === "in_progress")
      .sort((a, b) => (b.percent || 0) - (a.percent || 0))
      .slice(0, MAX_ROWS);
  }, [openItems]);

  const snapshot = useMemo(() => {
    const total = items.length;
    const done = items.filter((item) => item.status === "completed").length;
    const overdue = openItems.filter((item) => {
      const days = daysUntil(item.due_date);
      return days !== null && days < 0;
    }).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, percent };
  }, [items, openItems]);

  const open = async (item) => {
    if (item.launch?.module) {
      openWithContext({
        context: {
          pageType: "conversational_module",
          module_id: item.launch.module.id,
          learning_module_mode: true,
          module_data: item.launch.module,
        },
      });
      return;
    }
    if (item.launch?.to) {
      navigate(item.launch.to);
      return;
    }
    if (item.launch?.resource) {
      setBusyId(item.id);
      try {
        const opened = await openResource(item.launch.resource);
        if (!opened) {
          toast.info("This resource has no link or file attached yet.");
        } else if (item.kind === "resource" && item.refId) {
          await base44.entities.AssignedLearning.update(item.refId, { status: "in_progress" });
          reload();
        }
      } finally {
        setBusyId(null);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/5 border border-[#0202ff]/15 flex items-center justify-center flex-shrink-0">
            <Compass className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <p className="text-xs font-semibold text-card-foreground truncate">Your development</p>
        </div>
        <Link
          to="/my-development"
          className="text-[11px] font-medium text-[#0202ff] hover:underline flex-shrink-0"
        >
          View all
        </Link>
      </div>

      {/* Action list */}
      {loading ? (
        <div className="px-3 pb-3 space-y-2">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : focus.length === 0 ? (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground">
            Nothing due right now.
          </p>
          <Link
            to="/my-development"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0202ff] hover:underline"
          >
            Explore development <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {focus.map((item) => {
            const meta = KIND_META[item.kind] || KIND_META.resource;
            const Icon = KIND_ICON[item.kind] || BookOpen;
            const due = dueMeta(item.due_date);
            const percent = typeof item.percent === "number" ? item.percent : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors active:bg-muted/60 group"
              >
                <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0", meta.chipClass)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-card-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {due ? (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border", DUE_TONE_CLASSES[due.tone])}>
                        {due.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{meta.label}</span>
                    )}
                    {percent > 0 && (
                      <span className="text-[10px] text-muted-foreground">{percent}%</span>
                    )}
                  </div>
                  {percent > 0 && (
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", meta.barClass)}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  )}
                </div>

                {busyId === item.id ? (
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Progress snapshot */}
      {!loading && snapshot.total > 0 && (
        <div className="border-t border-border px-3 py-2.5 bg-muted/30">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-card-foreground">{snapshot.percent}%</p>
            <p className="text-[10px] text-muted-foreground">
              {snapshot.done} of {snapshot.total} complete
            </p>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0202ff] transition-all duration-500"
              style={{ width: `${snapshot.percent}%` }}
            />
          </div>
          {snapshot.overdue > 0 && (
            <p className="mt-1.5 text-[10px] font-medium text-red-600">
              {snapshot.overdue} overdue
            </p>
          )}
        </div>
      )}
    </div>
  );
}