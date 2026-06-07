/**
 * GrowthPlanTab — Tab 3: Longitudinal growth progress, goals, and assessment.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Target, TrendingUp, ArrowRight, Eye, Archive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import GrowProgressCard from "@/components/patterns/GrowProgressCard";
import GrowExperiencesCard from "@/components/patterns/GrowExperiencesCard";
import ResultsArchive from "@/components/you/ResultsArchive";

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">{children}</p>;
}

export default function GrowthPlanTab({ goals, assignments, pulses, trends, onOpenAtreus }) {
  const { user } = useAuth();
  const [showArchive, setShowArchive] = useState(false);

  const { data: latestAssessment } = useQuery({
    queryKey: ['growth-assessment', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 10 * 60 * 1000,
  });

  const assessmentDate = latestAssessment?.created_date
    ? new Date(latestAssessment.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="space-y-5 pb-6">

      {/* Goals */}
      <div className="space-y-2.5">
        <SectionLabel>Goals & Commitments</SectionLabel>
        <Link to="/my-goals">
          <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-card-foreground">My Goals</p>
              <p className="text-xs text-muted-foreground">
                {goals.filter(g => g.status === 'active').length > 0
                  ? `${goals.filter(g => g.status === 'active').length} active goal${goals.filter(g => g.status === 'active').length > 1 ? 's' : ''} in progress`
                  : 'Active goals, progress, and commitments'}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Progress snapshot */}
      <div className="space-y-2.5">
        <SectionLabel>Progress</SectionLabel>
        <GrowProgressCard goals={goals} pulses={pulses} assignments={assignments} />
      </div>

      {/* Experiences */}
      <div className="space-y-2.5">
        <SectionLabel>Experiences</SectionLabel>
        <GrowExperiencesCard goals={goals} trends={trends} onOpenAtreus={onOpenAtreus} />
      </div>

      {/* Assessment */}
      <div className="space-y-2.5">
        <SectionLabel>Assessment</SectionLabel>

        <Link to="/LeadershipAssessment">
          <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-card-foreground">Leadership Index</p>
              <p className="text-xs text-muted-foreground">
                {assessmentDate ? `Last taken ${assessmentDate}` : 'Not yet taken'}
              </p>
            </div>
            {latestAssessment && (
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                {Math.round(latestAssessment.overall_pct || 0)}%
              </span>
            )}
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {latestAssessment && (
          <Link to="/AssessmentResults">
            <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-card-foreground">View my results</p>
                <p className="text-xs text-muted-foreground">
                  {latestAssessment.archetype_label ? `Archetype: ${latestAssessment.archetype_label}` : 'See full report'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}

        <button
          className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group text-left"
          onClick={() => setShowArchive(a => !a)}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
            <Archive className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-card-foreground">Results archive</p>
            <p className="text-xs text-muted-foreground">History, change over time, development themes</p>
          </div>
          <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${showArchive ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
        </button>

        {showArchive && (
          <div className="px-1">
            <ResultsArchive />
          </div>
        )}
      </div>

    </div>
  );
}