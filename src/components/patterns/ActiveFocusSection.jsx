/**
 * ActiveFocusSection — Grow > Active Focus, properly built per the brief.
 * Shows 1-2 growth themes with: why they matter now, linked pattern, linked assessment insight, recent behavior.
 * Brief spec: "current growth themes, why they matter now, linked pattern(s), linked assessment insight(s), recent related behavior"
 */
import React from "react";
import { Target, Brain, TrendingUp, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

function buildWhyNow(goal, trends, insight) {
  const reasons = [];

  // Pattern link
  if (trends?.overload_pattern_strength > 40 && (goal.title || '').toLowerCase().match(/delegat|lead|team/)) {
    reasons.push({ label: "Active pattern", text: "Your overload pattern makes this directly relevant right now.", color: "text-amber-700", bg: "bg-amber-50" });
  }
  if (trends?.identity_friction_active) {
    reasons.push({ label: "Role clarity", text: "Current identity friction signals make this focus especially timely.", color: "text-violet-700", bg: "bg-violet-50" });
  }
  if (trends?.learning_stall_detected) {
    reasons.push({ label: "Development stall", text: "Development activity has dropped — focusing here helps reset momentum.", color: "text-blue-700", bg: "bg-blue-50" });
  }

  // Assessment link
  if (insight?.development_areas?.[0]) {
    const area = insight.development_areas[0].split(' (')[0].toLowerCase();
    const goalTitle = (goal.title || '').toLowerCase();
    if (goalTitle.includes(area.split(' ')[0]) || goalTitle.includes('leadership') || goalTitle.includes('develop')) {
      reasons.push({ label: "Assessment insight", text: `Your Leadership Index highlights ${insight.development_areas[0].split(' (')[0]} as a high-leverage area.`, color: "text-purple-700", bg: "bg-purple-50" });
    }
  }

  // Recent behavior
  if ((goal.progress || 0) > 0 && (goal.progress || 0) < 30) {
    reasons.push({ label: "Early momentum", text: "You've started this goal but haven't gained full traction yet. Now is the right time to push.", color: "text-emerald-700", bg: "bg-emerald-50" });
  }

  // Default reason if nothing triggered
  if (reasons.length === 0) {
    reasons.push({ label: "Your commitment", text: "You chose to work on this. That intention is part of your active development focus.", color: "text-gray-600", bg: "bg-gray-50" });
  }

  return reasons.slice(0, 2);
}

function GrowthThemeCard({ goal, trends, insight, onOpenAtreus }) {
  const whyNow = buildWhyNow(goal, trends, insight);

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 space-y-3">
      {/* Theme title + progress */}
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
        <div className="flex items-center gap-2">
          <Progress value={goal.progress || 0} className="h-1.5 flex-1" />
          <span className="text-xs text-gray-500 flex-shrink-0">{goal.progress || 0}%</span>
        </div>
      </div>

      {/* Why this matters now */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Why this matters now</p>
        {whyNow.map((r, i) => (
          <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg ${r.bg}`}>
            <span className={`text-[10px] font-semibold flex-shrink-0 mt-0.5 ${r.color}`}>{r.label}</span>
            <span className={`text-[11px] leading-relaxed ${r.color}`}>{r.text}</span>
          </div>
        ))}
      </div>

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