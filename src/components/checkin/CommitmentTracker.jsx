/**
 * CommitmentTracker — closed-loop view of declared intentions vs follow-through.
 * Shows recent morning intents, evening actuals gaps, and delegation commitments.
 * Speaks to the person, not the role.
 */
import React from "react";
import { CheckCircle2, Circle, AlertCircle, ArrowRight, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const GAP_LABELS = {
  declared_delegation_operator_mode_detected: { label: "Said delegation, but day went tactical", color: "text-amber-700 bg-amber-50 border-amber-200" },
  declared_strategic_tactical_overload_detected: { label: "Said strategic focus, but got pulled into ops", color: "text-orange-700 bg-orange-50 border-orange-200" },
  declared_team_support_low_1on1_detected: { label: "Said team first, but 1:1s were missed", color: "text-rose-700 bg-rose-50 border-rose-200" },
  no_gap_detected: { label: "Intention matched what happened", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  insufficient_data: null,
};

const FOCUS_ICONS = {
  delegation: "👥",
  strategic_work: "🎯",
  team_support: "🤝",
  personal_development: "📚",
  other: "⭐",
};

function CommitmentRow({ pulse, index }) {
  const date = new Date(pulse.created_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const icon = FOCUS_ICONS[pulse.focus_category] || "⭐";
  const gap = pulse.intent_actuals_gap;
  const gapConfig = gap ? GAP_LABELS[gap] : null;
  const hasGap = gap && gap !== 'no_gap_detected' && gap !== 'insufficient_data';
  const matched = gap === 'no_gap_detected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-medium text-gray-800 capitalize">
            {pulse.focus_category?.replace(/_/g, ' ') || 'Focus'}
          </p>
          <span className="text-[10px] text-gray-400">{date}</span>
        </div>
        {pulse.focus_intention && (
          <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">"{pulse.focus_intention}"</p>
        )}
        {gapConfig && (
          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${gapConfig.color}`}>
            {gapConfig.label}
          </span>
        )}
        {!gap && (
          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border text-gray-500 bg-gray-100 border-gray-200">
            Actuals not yet captured
          </span>
        )}
      </div>
      <div className="flex-shrink-0 mt-1">
        {matched && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {hasGap && <AlertCircle className="w-4 h-4 text-amber-500" />}
        {!gap && <Circle className="w-4 h-4 text-gray-300" />}
      </div>
    </motion.div>
  );
}

export default function CommitmentTracker({ pulses, trends, onOpenAtreus }) {
  // Filter to morning intents only
  const intents = (pulses || []).filter(p =>
    p.prompt_type === 'morning_intent' && p.focus_category
  ).slice(0, 7);

  const delegationGapCount = trends?.delegation_gap_count_7d || 0;
  const delegationIntentCount = trends?.delegation_intent_count_7d || 0;
  const hasPattern = delegationGapCount >= 2 || delegationIntentCount >= 3;

  if (intents.length === 0) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">Your commitment loop</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                When you set a morning intention, Atreus tracks whether the day matched. The loop closes here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Your commitment loop</p>
            <p className="text-[10px] text-gray-400">What you said vs what happened · Private</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-400">Private</Badge>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">

        {/* Pattern callout */}
        {hasPattern && delegationGapCount >= 2 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-amber-800">A pattern Atreus is noticing</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              You've set delegation as your intention {delegationIntentCount} time{delegationIntentCount !== 1 ? 's' : ''} this week,
              but your day went differently {delegationGapCount} time{delegationGapCount !== 1 ? 's' : ''}.
              That gap is worth naming — not as a failure, but as useful data about what gets in the way.
            </p>
          </div>
        )}

        {/* Commitment rows */}
        <div className="space-y-2">
          {intents.map((pulse, i) => (
            <CommitmentRow key={pulse.id} pulse={pulse} index={i} />
          ))}
        </div>

        {/* CTA */}
        {onOpenAtreus && (
          <button
            onClick={() => onOpenAtreus("Let's talk about the gap between what I intend to do and what actually happens in my week.")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#0202ff]/20 text-xs font-medium text-[#0202ff] hover:bg-[#0202ff]/5 transition-colors"
          >
            <Brain className="w-3.5 h-3.5" />
            Talk through the gap with Atreus
          </button>
        )}
      </CardContent>
    </Card>
  );
}