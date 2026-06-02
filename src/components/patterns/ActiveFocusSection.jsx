/**
 * ActiveFocusSection — Grow > Active Focus, properly built per the brief.
 * Shows 1-2 growth themes with: why they matter now, linked pattern, linked assessment insight, recent behavior.
 * Brief spec: "current growth themes, why they matter now, linked pattern(s), linked assessment insight(s), recent related behavior"
 */
import React, { useState } from "react";
import { Target, Brain, ArrowRight, ChevronDown, ChevronUp, Activity, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import GoalVisibilityToggle from "@/components/privacy/GoalVisibilityToggle";
import BehavioralArcCard from "@/components/goals/BehavioralArcCard";

function getLinkedPatterns(trends) {
  const patterns = [];
  if (trends?.overload_pattern_strength > 40) patterns.push({ label: `Overload pattern (${Math.round(trends.overload_pattern_strength)}%)`, color: "text-amber-700 bg-amber-50 border-amber-100" });
  if (trends?.identity_friction_active) patterns.push({ label: "Role clarity friction", color: "text-violet-700 bg-violet-50 border-violet-100" });
  if (trends?.energy_trend === 'declining') patterns.push({ label: "Energy declining", color: "text-rose-700 bg-rose-50 border-rose-100" });
  if (trends?.delegation_gap_count_7d > 0) patterns.push({ label: `${trends.delegation_gap_count_7d} delegation gap${trends.delegation_gap_count_7d > 1 ? 's' : ''} this week`, color: "text-blue-700 bg-blue-50 border-blue-100" });
  if (trends?.learning_stall_detected) patterns.push({ label: "Development stall", color: "text-gray-600 bg-gray-100 border-gray-200" });
  return patterns;
}

function getLinkedInsights(insight) {
  const items = [];
  if (insight?.archetype) items.push({ label: `Archetype: ${insight.archetype}`, color: "text-purple-700 bg-purple-50 border-purple-100" });
  if (insight?.development_areas?.[0]) items.push({ label: `Growth edge: ${insight.development_areas[0].split(' (')[0]}`, color: "text-indigo-700 bg-indigo-50 border-indigo-100" });
  if (insight?.top_strengths?.[0]) items.push({ label: `Strength: ${insight.top_strengths[0]}`, color: "text-emerald-700 bg-emerald-50 border-emerald-100" });
  return items;
}

function buildWhyNow(goal, trends, insight) {
  const reasons = [];

  if (trends?.overload_pattern_strength > 40) {
    reasons.push({ label: "Active pattern", text: "Your overload pattern makes delegation and boundary-setting directly relevant right now.", color: "text-amber-700", bg: "bg-amber-50" });
  }
  if (trends?.identity_friction_active) {
    reasons.push({ label: "Role clarity", text: "Current identity friction signals make this focus especially timely.", color: "text-violet-700", bg: "bg-violet-50" });
  }
  if (insight?.development_areas?.[0]) {
    reasons.push({ label: "Assessment insight", text: `Your Leadership Index highlights ${insight.development_areas[0].split(' (')[0]} as a high-leverage growth area.`, color: "text-purple-700", bg: "bg-purple-50" });
  }
  if ((goal.progress || 0) > 0 && (goal.progress || 0) < 30) {
    reasons.push({ label: "Early momentum", text: "You've started but haven't gained full traction yet — now is the right time to push.", color: "text-emerald-700", bg: "bg-emerald-50" });
  }
  if (reasons.length === 0) {
    reasons.push({ label: "Your commitment", text: "You chose to work on this. That intention is part of your active development focus.", color: "text-gray-600", bg: "bg-gray-50" });
  }
  return reasons.slice(0, 2);
}

function GrowthThemeCard({ goal: initialGoal, trends, insight, onOpenAtreus }) {
  const [goal, setGoal] = useState(initialGoal);
  const [showDetail, setShowDetail] = useState(false);
  const whyNow = buildWhyNow(goal, trends, insight);
  const linkedPatterns = getLinkedPatterns(trends);
  const linkedInsights = getLinkedInsights(insight);

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 space-y-3">
      {/* Theme title + progress + visibility */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 flex-1">{goal.title}</p>
          <GoalVisibilityToggle goal={goal} onUpdated={setGoal} />
        </div>
        <div className="flex items-center gap-2">
          <Progress value={goal.progress || 0} className="h-1.5 flex-1" />
          <span className="text-xs text-gray-500 flex-shrink-0">{goal.progress || 0}%</span>
        </div>
      </div>

      {/* Linked patterns + insights as tags */}
      {(linkedPatterns.length > 0 || linkedInsights.length > 0) && (
        <div className="space-y-1.5">
          {linkedPatterns.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Activity className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <p className="text-[10px] text-gray-400 font-medium">Linked patterns:</p>
              {linkedPatterns.map((p, i) => (
                <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
              ))}
            </div>
          )}
          {linkedInsights.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Lightbulb className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <p className="text-[10px] text-gray-400 font-medium">Assessment:</p>
              {linkedInsights.map((ins, i) => (
                <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${ins.color}`}>{ins.label}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Why this matters now — collapsible */}
      <button
        onClick={() => setShowDetail(s => !s)}
        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Why this matters now
      </button>
      {showDetail && (
        <div className="space-y-1.5">
          {whyNow.map((r, i) => (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg ${r.bg}`}>
              <span className={`text-[10px] font-semibold flex-shrink-0 mt-0.5 ${r.color}`}>{r.label}</span>
              <span className={`text-[11px] leading-relaxed ${r.color}`}>{r.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Behavioral arc — 5-part model */}
      <BehavioralArcCard goal={goal} onUpdated={setGoal} />

      {/* Quick actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onOpenAtreus?.(`I want to work on my goal: "${goal.title}". Help me think about what's getting in the way and what my next move should be.`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0202ff]/5 border border-[#0202ff]/15 text-xs font-medium text-[#0202ff] hover:bg-[#0202ff]/10 transition-colors"
        >
          <Brain className="w-3.5 h-3.5" /> Work on this
        </button>
        <Link to="/my-goals" className="flex items-center justify-center px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function ActiveFocusSection({ goals = [], trends = null, insight = null, onOpenAtreus }) {
  const active = goals.filter(g => g.status === 'active').slice(0, 2);

  if (active.length === 0) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="py-8 px-5 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#0202ff]/10 flex items-center justify-center mx-auto">
            <Target className="w-5 h-5 text-[#0202ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">No active growth focus</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Set a goal to give your development a focused direction — tied to real patterns and behavior.</p>
          </div>
          <Link to="/my-goals">
            <button className="text-xs font-medium text-[#0202ff] hover:underline flex items-center gap-1 mx-auto">
              Set a growth goal <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100 bg-gradient-to-br from-blue-50/40 to-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Active focus</p>
            <p className="text-[10px] text-gray-400">What you're deliberately developing</p>
          </div>
        </div>
        <Link to="/my-goals">
          <span className="text-xs text-[#0202ff] font-medium">Manage →</span>
        </Link>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {active.map(goal => (
          <GrowthThemeCard
            key={goal.id}
            goal={goal}
            trends={trends}
            insight={insight}
            onOpenAtreus={onOpenAtreus}
          />
        ))}
      </CardContent>
    </Card>
  );
}