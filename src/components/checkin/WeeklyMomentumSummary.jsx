/**
 * WeeklyMomentumSummary — "This week in your leadership" digest.
 * Combines: intentions set/kept, overload days, delegation gaps, recovery signals.
 * Shows a concise narrative alongside pattern data.
 * Private to the manager.
 */
import React from "react";
import { TrendingUp, TrendingDown, Minus, Target, Zap, CheckCircle2, AlertCircle, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

function MomentumStat({ icon: IconComponent, label, value, sub, color = "text-gray-700", bg = "bg-gray-50" }) {
  const Icon = IconComponent;
  return (
    <div className={`rounded-xl px-3 py-3 ${bg} space-y-0.5`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 leading-relaxed">{sub}</p>}
    </div>
  );
}

function MomentumBar({ value, max, color = "bg-[#0202ff]" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-1.5 rounded-full ${color}`}
      />
    </div>
  );
}

export default function WeeklyMomentumSummary({ pulses = [], trends = null, onOpenAtreus }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekPulses = pulses.filter(p => new Date(p.created_date) >= weekStart);

  // Intentions this week
  const intentions = thisWeekPulses.filter(p => p.prompt_type === 'morning_intent');
  const intentsMatched = intentions.filter(p => p.intent_actuals_gap === 'no_gap_detected').length;
  const intentsGapped = intentions.filter(p =>
    p.intent_actuals_gap && p.intent_actuals_gap !== 'no_gap_detected' && p.intent_actuals_gap !== 'insufficient_data'
  ).length;

  // Energy this week
  const energyPulses = thisWeekPulses.filter(p => p.energy_level);
  const stretchDays = energyPulses.filter(p => ['drained', 'stretched'].includes(p.energy_level)).length;
  const strongDays = energyPulses.filter(p => ['steady', 'strong'].includes(p.energy_level)).length;

  // Overload checks
  const overloadYes = thisWeekPulses.filter(p =>
    p.prompt_type === 'overload_check' && ['very_much', 'somewhat'].includes(p.operator_mode_response)
  ).length;

  // Delegation gap from trends
  const delegationGaps = trends?.delegation_gap_count_7d || 0;

  // Derive a short momentum label
  let momentumLabel = "Building";
  let momentumColor = "text-gray-600";
  let MomentumIcon = Minus;

  if (stretchDays >= 3 || overloadYes >= 2) {
    momentumLabel = "Heavy week";
    momentumColor = "text-amber-600";
    MomentumIcon = TrendingDown;
  } else if (intentsMatched >= 2 || strongDays >= 3) {
    momentumLabel = "Good week";
    momentumColor = "text-emerald-600";
    MomentumIcon = TrendingUp;
  }

  // Week narrative
  let narrative = null;
  if (intentions.length === 0 && energyPulses.length === 0) {
    narrative = "You haven't set intentions or check-ins this week yet. Even one per day builds your picture fast.";
  } else if (stretchDays >= 3 && delegationGaps >= 2) {
    narrative = "This has been a heavy week — and the gap between what you intended and what happened with delegation has shown up again. That pattern is worth a few minutes of honest reflection.";
  } else if (intentsMatched >= 2) {
    narrative = `You set ${intentions.length} intention${intentions.length !== 1 ? 's' : ''} this week and followed through on ${intentsMatched}. That kind of consistency is how behaviour actually shifts.`;
  } else if (stretchDays >= 2) {
    narrative = `${stretchDays} out of ${energyPulses.length} days felt stretched or draining. Noticing that is the first step. What's taking the most from you right now?`;
  } else if (energyPulses.length > 0) {
    narrative = `You've checked in ${thisWeekPulses.length} time${thisWeekPulses.length !== 1 ? 's' : ''} this week. Keep that rhythm and Atreus will start surfacing patterns worth talking about.`;
  }

  const hasData = thisWeekPulses.length > 0;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/8 border border-[#0202ff]/12 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">This week</p>
            <p className="text-[10px] text-gray-400">Leadership momentum · Private</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <MomentumIcon className={`w-3.5 h-3.5 ${momentumColor}`} />
          <span className={`text-xs font-semibold ${momentumColor}`}>{momentumLabel}</span>
        </div>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">

        {/* Narrative */}
        {narrative && (
          <div className="bg-[#0202ff]/4 border border-[#0202ff]/10 rounded-xl p-3.5">
            <p className="text-sm text-gray-700 leading-relaxed">{narrative}</p>
          </div>
        )}

        {/* Stats grid */}
        {hasData && (
          <div className="grid grid-cols-2 gap-2">
            <MomentumStat
              icon={Target}
              label="Intentions"
              value={intentions.length}
              sub={intentsGapped > 0 ? `${intentsGapped} gap${intentsGapped > 1 ? 's' : ''} detected` : intentsMatched > 0 ? `${intentsMatched} matched` : "Set tomorrow's"}
              color={intentsGapped > 0 ? "text-amber-700" : "text-gray-700"}
              bg={intentsGapped > 0 ? "bg-amber-50" : "bg-gray-50"}
            />
            <MomentumStat
              icon={Zap}
              label="Energy days"
              value={energyPulses.length}
              sub={stretchDays > 0 ? `${stretchDays} felt heavy` : strongDays > 0 ? `${strongDays} felt steady` : "Keep logging"}
              color={stretchDays >= 2 ? "text-amber-700" : "text-gray-700"}
              bg={stretchDays >= 2 ? "bg-amber-50" : "bg-gray-50"}
            />
            {overloadYes > 0 && (
              <MomentumStat
                icon={AlertCircle}
                label="Overload signals"
                value={overloadYes}
                sub="operator mode detected"
                color="text-orange-700"
                bg="bg-orange-50"
              />
            )}
            {intentions.length > 0 && (
              <MomentumStat
                icon={CheckCircle2}
                label="Follow-through"
                value={`${intentions.length > 0 ? Math.round((intentsMatched / intentions.length) * 100) : 0}%`}
                sub={`${intentsMatched} of ${intentions.length} matched`}
                color={intentsMatched >= intentions.length * 0.6 ? "text-emerald-700" : "text-gray-700"}
                bg={intentsMatched >= intentions.length * 0.6 ? "bg-emerald-50" : "bg-gray-50"}
              />
            )}
          </div>
        )}

        {!hasData && (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-400">Start a check-in or set a morning intention to build your weekly picture.</p>
          </div>
        )}

        {/* CTA */}
        {onOpenAtreus && hasData && (
          <button
            onClick={() => onOpenAtreus("Let's do a quick reflection on how this week went — what I intended, what happened, and what I want to do differently.")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#0202ff]/20 text-xs font-medium text-[#0202ff] hover:bg-[#0202ff]/5 transition-colors"
          >
            <Brain className="w-3.5 h-3.5" />
            Reflect on this week with Atreus
          </button>
        )}
      </CardContent>
    </Card>
  );
}