/**
 * PlaybookInsights — the read that closes Today's Playbook.
 * Top 3 Patterns (with best next move) followed by the leadership narrative.
 */
import React from "react";
import TopPatternsMoveCard from "@/components/lead/TopPatternsMoveCard";
import LeadershipNarrativeCard from "@/components/patterns/LeadershipNarrativeCard";

export default function PlaybookInsights({
  crossToolData,
  hasInAppPatterns,
  trends,
  insight,
  goals,
  pulses = [],
  pendingDecisions = [],
  onOpenAtreus,
  onDecisionCommitted,
}) {
  return (
    <div className="space-y-3">
      <div className="h-px bg-slate-100" />

      {crossToolData ? (
        <TopPatternsMoveCard
          crossToolData={crossToolData}
          onOpenAtreus={onOpenAtreus}
          onDecisionCommitted={onDecisionCommitted}
          pendingDecisions={pendingDecisions}
        />
      ) : !hasInAppPatterns ? (
        <div className="bg-card border border-border rounded-2xl px-5 py-6 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Top 3 Patterns</p>
          <p className="text-sm font-medium text-foreground">Nothing to read yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 max-w-xs mx-auto">
            Patterns come from your check-ins and the work you log. A few days of rhythm and this fills in on its own.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl px-5 py-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Top 3 Patterns</p>
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0202ff] rounded-full animate-spin" />
          </div>
        </div>
      )}

      <LeadershipNarrativeCard
        trends={trends}
        insight={insight}
        goals={goals}
        pulses={pulses}
        onOpenAtreus={onOpenAtreus}
      />
    </div>
  );
}