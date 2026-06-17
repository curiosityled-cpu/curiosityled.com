/**
 * LeadershipNarrativeCard — Merged story card for Patterns page.
 * Replaces three standalone cards:
 *   - "What we've noticed — last 28 days" (MemoryNarrativeCard)
 *   - "What Atreus is noticing" (TrendSummaryCard)
 *   - "What we're noticing" assessment card (PatternCard)
 *
 * Three collapsible layers:
 *   A. 28-day summary (always visible)
 *   B. Atreus interpretation (collapsed by default)
 *   C. Strengths & development areas (collapsed by default)
 */
import React, { useState } from "react";
import { Brain, TrendingUp, AlertCircle, BarChart3, Info, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LeadershipNarrativeCard({ trends, insight, goals, onOpenAtreus }) {
  const [showAtreus, setShowAtreus] = useState(false);
  const [showStrengths, setShowStrengths] = useState(false);

  const narrative = trends?.trend_narrative || trends?.summary_28d;
  const computedAt = trends?.last_trend_computed_at;
  const dataPoints = trends?.data_points_28d;

  const timeLabel = computedAt
    ? new Date(computedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })
    : null;

  // Build strengths/development items from insight + goals
  const strengthItems = [];
  const devItems = [];
  if (insight?.top_strengths?.[0]) {
    strengthItems.push({ text: `${insight.top_strengths[0].split(' (')[0]} appears to be a current strength you can lean on.`, icon: TrendingUp, color: "text-emerald-500", tag: "Assessment-based" });
  }
  if (insight?.development_areas?.[0]) {
    devItems.push({ text: `${insight.development_areas[0].split(' (')[0]} may benefit from more intentional focus — this pattern has appeared in recent signals.`, icon: AlertCircle, color: "text-amber-500", tag: "AI-interpreted" });
  }
  const stalled = (goals || []).filter(g => g.status === 'active' && (g.progress || 0) < 20);
  if (stalled.length > 0) {
    devItems.push({ text: `${stalled.length === 1 ? 'One active goal has' : `${stalled.length} active goals have`} made little progress. A momentum check may help.`, icon: BarChart3, color: "text-blue-400", tag: "Goal tracker" });
  }
  const hasStrengthDev = strengthItems.length > 0 || devItems.length > 0;

  // If no data at all, show empty state
  if (!narrative && !hasStrengthDev && dataPoints < 3) {
    return (
      <Card className="shadow-sm border border-dashed border-border bg-card rounded-2xl">
        <CardContent className="py-8 px-6 text-center">
          <Brain className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">Your narrative is building</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Pattern memory develops with regular check-ins. After a few more days, a leadership narrative will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-[#0202ff]/15 bg-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Your Leadership Narrative</p>
            {dataPoints > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Based on {dataPoints} check-in{dataPoints !== 1 ? 's' : ''}{timeLabel ? ` · Updated ${timeLabel}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {/* Layer A: 28-day summary — always visible */}
        {narrative && (
          <div className="bg-[#0202ff]/5 border border-[#0202ff]/10 rounded-xl p-3.5 space-y-2">
            <p className="text-sm text-foreground leading-relaxed italic">"{narrative}"</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0202ff]/10 text-[#0202ff]">
              <Brain className="w-2.5 h-2.5" />
              Atreus interpretation
            </span>
          </div>
        )}

        {/* Layer B: What Atreus sees — collapsible */}
        {narrative && (
          <div>
            <button
              onClick={() => setShowAtreus(!showAtreus)}
              className="w-full flex items-center justify-between py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                What Atreus sees
              </span>
              {showAtreus ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAtreus && (
              <div className="bg-muted/50 rounded-xl p-3.5 space-y-2 mt-1">
                <p className="text-xs text-muted-foreground leading-relaxed">"{narrative}"</p>
                {onOpenAtreus && (
                  <button
                    onClick={() => onOpenAtreus("I want to understand the patterns Atreus has noticed about my leadership rhythm lately.")}
                    className="text-[10px] text-[#0202ff] font-medium hover:underline"
                  >
                    Talk through this with Atreus →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Layer C: Strengths & development areas — collapsible */}
        {hasStrengthDev && (
          <div>
            <button
              onClick={() => setShowStrengths(!showStrengths)}
              className="w-full flex items-center justify-between py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Strengths & development areas
              </span>
              {showStrengths ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showStrengths && (
              <div className="space-y-2 mt-1">
                {strengthItems.map((item, i) => (
                  <div key={`s-${i}`} className="flex items-start gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <item.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
                      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 bg-emerald-50 text-emerald-700">{item.tag}</span>
                    </div>
                  </div>
                ))}
                {devItems.map((item, i) => (
                  <div key={`d-${i}`} className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                    <item.icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
                      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 bg-amber-50 text-amber-700">{item.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground pt-1">Private to you · <button onClick={() => onOpenAtreus?.("How is my leadership narrative generated?")} className="hover:underline">How this is generated</button></p>
      </CardContent>
    </Card>
  );
}