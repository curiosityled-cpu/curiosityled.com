/**
 * GrowthPlanTab — Tab 3: Longitudinal growth progress, goals, and assessment.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Target, TrendingUp, ArrowRight } from "lucide-react";
import GrowProgressCard from "@/components/patterns/GrowProgressCard";
import GrowExperiencesCard from "@/components/patterns/GrowExperiencesCard";

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">{children}</p>;
}

export default function GrowthPlanTab({ goals, assignments, pulses, trends, onOpenAtreus }) {
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

      {/* Leadership Index */}
      <div className="space-y-2.5">
        <SectionLabel>Assessment</SectionLabel>
        <Link to="/LeadershipAssessment">
          <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-card-foreground">Leadership Index</p>
              <p className="text-xs text-muted-foreground">Take or retake your leadership assessment</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

    </div>
  );
}