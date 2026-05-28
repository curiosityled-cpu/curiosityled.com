/**
 * IntentLoopCard — in-platform closed loop summary.
 *
 * Shows the week's morning intentions, what actually happened,
 * repeated patterns, and a suggested next move.
 * Manager-private. Evidence-labelled throughout.
 */
import React, { useState } from "react";
import { Target, CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronUp, Brain, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CATEGORY_LABELS = {
  delegation: "Delegation",
  strategic_work: "Strategic work",
  team_support: "Team support",
  personal_development: "Personal development",
  other: "Other",
};

const GAP_LABELS = {
  declared_delegation_operator_mode_detected: "Operator mode signals detected",
  declared_strategic_tactical_overload_detected: "Meeting load blocked strategic time",
  declared_team_support_low_1on1_detected: "No 1:1 contact despite team support intent",
  no_gap_detected: "Intent appeared to match",
  insufficient_data: "Not enough signal to compare",
};

function IntentRow({ pulse, actuals }) {
  const gap = actuals?.intent_actuals_gap;
  const matched = gap === 'no_gap_detected';
  const insufficient = gap === 'insufficient_data' || !actuals;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        {insufficient ? (
          <Circle className="w-4 h-4 text-gray-300" />
        ) : matched ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">
            {CATEGORY_LABELS[pulse.focus_category] || pulse.focus_category}
          </span>
          <span className="text-[10px] text-gray-400">
            {pulse.created_date ? new Date(pulse.created_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
          </span>
        </div>
        {pulse.focus_intention && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed italic">"{pulse.focus_intention}"</p>
        )}
        {actuals && !insufficient && (
          <p className={`text-xs mt-1 ${matched ? 'text-emerald-600' : 'text-amber-600'}`}>
            {GAP_LABELS[gap] || gap}
          </p>
        )}
        {insufficient && (
          <p className="text-xs text-gray-400 mt-1">Not enough signal to compare</p>
        )}
      </div>
    </div>
  );
}

export default function IntentLoopCard({ morningIntents = [], eveningActuals = [], onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);

  if (morningIntents.length === 0) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Daily intentions</p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            When you name your leadership focus each morning, Atreus can check back in at the end of the day
            to see how it actually went. Start tomorrow with a morning intention.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Match intents with their actuals
  const paired = morningIntents.map(intent => {
    const intentDate = intent.created_date?.toString().split('T')[0];
    const actuals = eveningActuals.find(a => a.created_date?.toString().split('T')[0] === intentDate);
    return { intent, actuals };
  });

  const gapCount = paired.filter(p => p.actuals?.intent_actuals_gap && !['no_gap_detected', 'insufficient_data'].includes(p.actuals.intent_actuals_gap)).length;
  const matchCount = paired.filter(p => p.actuals?.intent_actuals_gap === 'no_gap_detected').length;
  const displayPairs = expanded ? paired : paired.slice(0, 3);

  // Find dominant category for pattern insight
  const categoryCounts = morningIntents.reduce((acc, p) => {
    acc[p.focus_category] = (acc[p.focus_category] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCounts).sort(([,a],[,b]) => b - a)[0];

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">This week's intentions</p>
            <p className="text-[10px] text-gray-400">From your morning check-ins · Private to you</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {matchCount > 0 && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {matchCount} matched
            </span>
          )}
          {gapCount > 0 && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {gapCount} gap{gapCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <CardContent className="px-5 pt-2 pb-4 space-y-3">
        {/* Pattern insight when delegation keeps appearing with gaps */}
        {topCategory && categoryCounts[topCategory[0]] >= 3 && gapCount >= 2 && topCategory[0] === 'delegation' && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
            <p className="text-xs text-gray-700 leading-relaxed">
              You've named <strong>delegation</strong> as your focus {topCategory[1]}x this week.
              On most of those days, your work patterns suggested operator mode instead.
              This is worth sitting with — not as a failure, but as a pattern worth understanding.
            </p>
            <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1.5">
              From your morning intentions + work rhythm
            </span>
          </div>
        )}

        {/* Intent rows */}
        <div className="divide-y divide-gray-50">
          {displayPairs.map(({ intent, actuals }, i) => (
            <IntentRow key={i} pulse={intent} actuals={actuals} />
          ))}
        </div>

        {/* Expand/collapse */}
        {paired.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Show less</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Show {paired.length - 3} more</>
            )}
          </button>
        )}

        {/* Atreus CTA when gaps exist */}
        {gapCount >= 2 && onOpenAtreus && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8 border-[#0202ff]/20 text-[#0202ff] hover:bg-blue-50"
            onClick={() => onOpenAtreus("I'd like to understand why delegation keeps not happening despite my intentions.")}
          >
            <Brain className="w-3 h-3 mr-1.5" />
            Explore the pattern with Atreus
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}