/**
 * PracticeSessionsLog — recent + all-time practice session history.
 *
 * Reads ManagerPulse records that represent practice sessions (workouts + flows).
 * Shows the last 3 by default; "View all" lazy-loads the full history in pages.
 * Styled to match the Lead page's bordered, uppercase-tracked section headers.
 */
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dumbbell, ChevronRight, Loader2, Inbox } from "lucide-react";

const PAGE_SIZE = 10;

function isPracticeSession(p) {
  const focus = (p.focus_intention || "").toLowerCase();
  return (
    focus.startsWith("workout completed") ||
    focus.startsWith("practice session") ||
    focus.startsWith("flow completed") ||
    p.prompt_type === "practice_session"
  );
}

function sessionMeta(p) {
  const focus = p.focus_intention || "";
  // "Workout completed: Delegation audit" → title after the colon
  const colonIdx = focus.indexOf(":");
  const title = colonIdx >= 0 ? focus.slice(colonIdx + 1).trim() : focus.trim();
  const lower = focus.toLowerCase();
  let kind = "Workout";
  if (lower.startsWith("flow") || lower.includes("coaching flow")) kind = "Coaching flow";
  else if (lower.startsWith("practice session")) kind = "Practice";
  return { title: title || "Practice session", kind };
}

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PracticeSessionsLog() {
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);

  const { data: allPulses = [], isLoading } = useQuery({
    queryKey: ["practice-sessions", user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.ManagerPulse.filter(
          { user_email: user.email },
          "-created_date",
          100
        );
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const sessions = useMemo(() => allPulses.filter(isPracticeSession), [allPulses]);
  const recent = sessions.slice(0, 3);
  const paged = showAll ? sessions.slice(0, (page + 1) * PAGE_SIZE) : [];
  const hasMore = showAll && paged.length < sessions.length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">
          Recent Sessions
        </p>
        <span className="text-[10px] text-muted-foreground">{sessions.length} total</span>
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox className="w-7 h-7 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-muted-foreground">No sessions yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed max-w-[220px]">
              Complete a workout or coaching flow and it'll show up here.
            </p>
          </div>
        ) : !showAll ? (
          <div className="space-y-2">
            {recent.map((s) => {
              const { title, kind } = sessionMeta(s);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-card-foreground truncate">{title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {kind} · {formatWhen(s.created_date)}
                    </p>
                  </div>
                </div>
              );
            })}
            {sessions.length > 3 && (
              <button
                onClick={() => {
                  setShowAll(true);
                  setPage(0);
                }}
                className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2.5 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                View all sessions <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {paged.map((s) => {
              const { title, kind } = sessionMeta(s);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-card-foreground truncate">{title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {kind} ·{" "}
                      {new Date(s.created_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 pt-1">
              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  Load more
                </button>
              )}
              <button
                onClick={() => {
                  setShowAll(false);
                  setPage(0);
                }}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                Show recent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}