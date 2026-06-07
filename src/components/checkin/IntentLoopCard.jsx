/**
 * IntentLoopCard — private in-platform closed loop surface.
 *
 * Shows the manager's current week of declared intentions vs observed actuals.
 * Manager-private only. Evidence-labeled. Non-diagnostic.
 *
 * Data sources:
 *   - ManagerPulse (prompt_type = morning_intent, evening_actuals)
 *   - ManagerTrends (delegation_gap_count_7d, delegation_intent_count_7d)
 */
import React, { useState } from "react";
import { Target, CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronUp, Calendar, Brain, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, isToday } from "date-fns";

const FOCUS_LABELS = {
  delegation: "Delegate something",
  strategic_work: "Strategic focus",
  team_support: "Team connection",
  personal_development: "Learning / growth",
  other: "Something else",
};

const GAP_LABELS = {
  declared_delegation_operator_mode_detected: { text: "Day looked reactive vs planned", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  declared_strategic_tactical_overload_detected: { text: "Tactical overload vs strategic intent", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  declared_team_support_low_1on1_detected: { text: "Team connection may have been limited", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  no_gap_detected: { text: "Intent and rhythm aligned", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  insufficient_data: { text: "Not enough signal to compare", color: "text-gray-500", bg: "bg-gray-50 border-gray-100" },
};

function IntentDayRow({ date, intent, actuals }) {
  // Parse YYYY-MM-DD without timezone shift to avoid UTC-offset day mismatch
  const [y, m, d] = date.split('-').map(Number);
  const isT = isToday(new Date(y, m - 1, d));
  const gap = actuals?.intent_actuals_gap;
  const gapInfo = gap ? (GAP_LABELS[gap] || GAP_LABELS.insufficient_data) : null;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${isT ? 'bg-[#0202ff]/4 border-[#0202ff]/15' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex-shrink-0 w-14 text-center">
        <p className="text-[10px] text-gray-400 font-medium">
          {format(new Date(date), 'EEE')}
        </p>
        <p className={`text-xs font-semibold ${isT ? 'text-[#0202ff]' : 'text-gray-600'}`}>
          {format(new Date(date), 'd MMM')}
        </p>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {intent ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-800">
                {FOCUS_LABELS[intent.focus_category] || intent.focus_category || 'Intention set'}
              </p>
            </div>
            {intent.focus_intention && (
              <p className="text-[11px] text-gray-500 italic leading-snug pl-5">
                "{intent.focus_intention}"
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No morning intention recorded</p>
        )}

        {actuals && gapInfo && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium ${gapInfo.bg} ${gapInfo.color}`}>
            {gap === 'no_gap_detected'
              ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              : gap === 'insufficient_data'
                ? <Circle className="w-3 h-3 flex-shrink-0" />
                : <AlertCircle className="w-3 h-3 flex-shrink-0" />
            }
            {gapInfo.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntentLoopCard({ pulses, trends, onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);

  // Build this week's intent/actuals map
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  }).filter(d => new Date(d) <= new Date());

  const intentsByDate = {};
  const actualsByDate = {};
  for (const p of (pulses || [])) {
    const dateStr = p.created_date?.toString().split('T')[0];
    if (!dateStr) continue;
    if (p.prompt_type === 'morning_intent') intentsByDate[dateStr] = p;
    if (p.prompt_type === 'evening_actuals') actualsByDate[dateStr] = p;
  }

  const daysWithData = weekDays.filter(d => intentsByDate[d] || actualsByDate[d]);
  const hasAnyData = daysWithData.length > 0;

  // Delegation pattern from trends
  const delegationGaps = trends?.delegation_gap_count_7d || 0;
  const delegationIntents = trends?.delegation_intent_count_7d || 0;
  const showDelegationPattern = delegationIntents >= 2;

  if (!hasAnyData && !showDelegationPattern) {
    return (
      <Card className="shadow-sm border border-dashed border-border bg-card rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground mb-0.5">Your intentions loop</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you start setting morning intentions via your daily check-in, this space will show how your planned focus compares to how your day actually unfolds.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleDays = expanded ? weekDays : weekDays.slice(-3);

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">This week's intentions</p>
            <p className="text-[10px] text-muted-foreground">Intentions vs what actually happened · Private</p>
          </div>
        </div>
        {weekDays.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Less' : 'All days'}
          </button>
        )}
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-2">

        {/* Day rows */}
        {visibleDays.map(d => (
          <IntentDayRow
            key={d}
            date={d}
            intent={intentsByDate[d] || null}
            actuals={actualsByDate[d] || null}
          />
        ))}

        {/* Delegation pattern observation */}
        {showDelegationPattern && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-800 leading-relaxed">
                  You've set a delegation intention {delegationIntents} time{delegationIntents > 1 ? 's' : ''} this week
                  {delegationGaps > 0 ? `, but the day's rhythm didn't quite match on ${delegationGaps} of those occasions.` : '.'}
                  {" "}That gap is worth a quick reflection.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <Brain className="w-2.5 h-2.5" />
              Atreus interpretation
            </span>
          </div>
        )}

        {/* CTA */}
        {onOpenAtreus && (
          <button
            onClick={() => onOpenAtreus("I want to look at this week's leadership intentions and what actually happened.")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
            Reflect on this with Atreus
          </button>
        )}
      </CardContent>
    </Card>
  );
}