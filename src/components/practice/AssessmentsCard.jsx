import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { ClipboardList, ChevronRight, ChevronDown, ChevronUp, Loader2, Inbox, CheckCircle, Clock, Brain, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AssessmentResultsDrawer from "./AssessmentResultsDrawer";

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AssessmentsCard() {
  const { user } = useAuth();
  const [drawer, setDrawer] = useState({ open: false, result: null });
  const [expanded, setExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_assessments"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });

  // Leadership Index results (Assessment entity)
  const { data: leadershipResults = [], isLoading: loadingLI } = useQuery({
    queryKey: ["practice-assessments-li", user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.Assessment.filter({ email: user.email }, "-created_date", 10);
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  // Custom assessments (published, assigned to user)
  const { data: customAssigned = [], isLoading: loadingCA } = useQuery({
    queryKey: ["practice-assessments-custom", user?.email],
    queryFn: async () => {
      try {
        const all = await base44.entities.CustomAssessment.filter({ status: "published" });
        return (all || []).filter((a) => (a.assigned_user_emails || []).includes(user.email));
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  // Custom assessment submissions (completed)
  const { data: customSubs = [] } = useQuery({
    queryKey: ["practice-assessment-subs", user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.AssessmentSubmission.filter({ user_email: user.email }, "-created_date", 10);
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const completedSubs = useMemo(
    () => (customSubs || []).filter((s) => s.status === "completed" || s.status === "graded"),
    [customSubs]
  );

  // Live = Leadership Index not yet taken + assigned custom assessments without submission
  const liveItems = useMemo(() => {
    const items = [];
    if (leadershipResults.length === 0) {
      items.push({
        id: "li-live",
        title: "Leadership Index Assessment",
        subtitle: "20–30 min · 6 core competencies",
        kind: "Validated",
        action: { label: "Start", to: "/LeadershipAssessment" },
      });
    }
    for (const a of customAssigned) {
      const hasSub = (customSubs || []).some((s) => s.assessment_id === a.id && (s.status === "completed" || s.status === "graded"));
      if (!hasSub) {
        items.push({
          id: `ca-${a.id}`,
          title: a.title,
          subtitle: a.type?.replace(/_/g, " ") || "Custom",
          kind: "Custom",
        });
      }
    }
    return items;
  }, [leadershipResults, customAssigned, customSubs]);

  // Completed = Leadership Index results + custom submissions
  const completedItems = useMemo(() => {
    const items = [];
    for (const a of leadershipResults) {
      items.push({
        id: `li-${a.id}`,
        title: "Leadership Index",
        subtitle: `${a.overall_pct || 0}% overall · ${formatWhen(a.submission_ts || a.created_date)}`,
        score: a.overall_pct || 0,
        type: "leadership_index",
        assessment: a,
      });
    }
    for (const s of completedSubs) {
      items.push({
        id: `sub-${s.id}`,
        title: s.assessment_title || "Custom Assessment",
        subtitle: `${s.percentage || 0}% · ${formatWhen(s.submission_date || s.created_date)}`,
        score: s.percentage || 0,
        type: "custom",
        submission: s,
      });
    }
    return items;
  }, [leadershipResults, completedSubs]);

  const isLoading = loadingLI || loadingCA;

  const openResult = (item) => {
    setDrawer({ open: true, result: { type: item.type, assessment: item.assessment, submission: item.submission } });
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <button
            onClick={() => { const v = !expanded; setExpanded(v); try { localStorage.setItem("cl_collapse_assessments", JSON.stringify(v)); } catch {} }}
            className="flex items-center gap-2.5 flex-1 text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex-1">
              Assessments
            </p>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </button>
          <Link to="/assessment-library" className="text-[10px] font-medium text-[#0202ff] hover:underline flex items-center gap-0.5">
            Library <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Body */}
        {expanded && (
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ) : liveItems.length === 0 && completedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Inbox className="w-7 h-7 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No assessments yet</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed max-w-[220px]">
                Browse the assessment library to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Live assessments */}
              {liveItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Live
                  </p>
                  {liveItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-card-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                      </div>
                      {item.action ? (
                        <Link to={item.action.to} className="text-[10px] font-medium text-[#0202ff] hover:underline flex items-center gap-0.5 flex-shrink-0">
                          {item.action.label} <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-[9px] flex-shrink-0">{item.kind}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed assessments */}
              {completedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Completed
                  </p>
                  {completedItems.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openResult(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-card-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                      </div>
                      <span className="text-xs font-bold text-[#0202ff] flex-shrink-0">{item.score}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <AssessmentResultsDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, result: null })}
        result={drawer.result}
      />
    </>
  );
}