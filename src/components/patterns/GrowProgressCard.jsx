/**
 * GrowProgressCard — Development momentum, commitment follow-through, consistency.
 * Shows whether development is becoming real behavioral change.
 * Lives in Practice > Grow section.
 */
import React from "react";
import { TrendingUp, CheckCircle2, Circle, AlertCircle, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

// Activity signals = doing things (check-ins, learning started, goals set)
// Behavioral change signals = doing things DIFFERENTLY (follow-through, goal progress >30%, delegation gap closing)
function getMomentumScore(goals, pulses, assignments) {
  const activitySignals = [];
  const changeSignals = [];
  let activityScore = 0;
  let changeScore = 0;

  // --- ACTIVITY ---
  const recent7 = pulses.filter(p => (Date.now() - new Date(p.created_date).getTime()) < 7 * 86400000);
  if (recent7.length >= 4) {
    activityScore += 30;
    activitySignals.push({ label: `${recent7.length} check-ins this week`, status: 'positive' });
  } else if (recent7.length >= 2) {
    activityScore += 15;
    activitySignals.push({ label: `${recent7.length} check-ins this week`, status: 'neutral' });
  } else {
    activitySignals.push({ label: 'Few check-ins this week', status: 'watch' });
  }

  const startedLearning = assignments.filter(a => a.status === 'started' || a.status === 'in_progress');
  if (startedLearning.length > 0) {
    activityScore += 20;
    activitySignals.push({ label: `${startedLearning.length} learning item${startedLearning.length > 1 ? 's' : ''} in progress`, status: 'positive' });
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    activityScore += 10;
    activitySignals.push({ label: `${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''} set`, status: 'neutral' });
  }

  // --- BEHAVIORAL CHANGE ---
  // Goals with real traction (>30% progress) = doing differently
  const movingGoals = activeGoals.filter(g => (g.progress || 0) >= 30);
  if (movingGoals.length > 0) {
    changeScore += 35;
    changeSignals.push({ label: `${movingGoals.length} goal${movingGoals.length > 1 ? 's' : ''} with real traction (>30%)`, status: 'positive' });
  }

  // Completed learning = applied knowledge
  const completedLearning = assignments.filter(a => a.status === 'completed');
  if (completedLearning.length >= 2) {
    changeScore += 25;
    changeSignals.push({ label: `${completedLearning.length} learning items completed`, status: 'positive' });
  } else if (completedLearning.length === 1) {
    changeScore += 12;
    changeSignals.push({ label: '1 learning item completed', status: 'positive' });
  }

  // Follow-through on commitments = behavioral evidence
  const followThrough = pulses.filter(p => p.prompt_type === 'follow_up' && p.intent_actuals_gap === 'no_gap_detected');
  if (followThrough.length >= 2) {
    changeScore += 25;
    changeSignals.push({ label: `${followThrough.length} commitments followed through`, status: 'positive' });
  } else if (followThrough.length === 1) {
    changeScore += 12;
    changeSignals.push({ label: '1 commitment followed through', status: 'positive' });
  }

  // Delegation pulses without gap = delegating differently
  const delegationFollowThrough = pulses.filter(p => p.prompt_type === 'overload_check' && (p.operator_mode_response === 'not_really'));
  if (delegationFollowThrough.length >= 2) {
    changeScore += 15;
    changeSignals.push({ label: 'Delegation pattern improving', status: 'positive' });
  }

  const overallScore = Math.round((activityScore * 0.35) + (changeScore * 0.65));
  return { score: Math.min(overallScore, 100), activitySignals, changeSignals, activityScore: Math.min(activityScore, 100), changeScore: Math.min(changeScore, 100) };
}

const STATUS_ICONS = {
  positive: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
  neutral: <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />,
  watch: <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
};

const getMomentumLabel = (score) => {
  if (score >= 70) return { label: "Strong momentum", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (score >= 40) return { label: "Building momentum", color: "text-blue-600", bg: "bg-blue-50" };
  if (score >= 15) return { label: "Getting started", color: "text-amber-600", bg: "bg-amber-50" };
  return { label: "Early stage", color: "text-gray-500", bg: "bg-gray-100" };
};

export default function GrowProgressCard({ goals = [], pulses = [], assignments = [] }) {
  const { score, activitySignals, changeSignals, activityScore, changeScore } = getMomentumScore(goals, pulses, assignments);
  const { label, color, bg } = getMomentumLabel(score);

  const completedGoals = goals.filter(g => g.status === 'completed').slice(0, 3);
  const stalledGoals = goals.filter(g => g.status === 'active' && (g.progress || 0) < 20);

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Development progress</p>
        </div>
        <Link to="/my-goals">
          <span className="text-xs text-[#0202ff] font-medium">View goals →</span>
        </Link>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-4">

        {/* Overall momentum */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Overall momentum</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>{label}</span>
          </div>
          <Progress value={score} className="h-2" />
          <p className="text-[10px] text-gray-400">65% weighted on behavioral change · 35% on activity · Private</p>
        </div>

        {/* Two-column: Activity vs Behavioral Change */}
        <div className="grid grid-cols-2 gap-3">
          {/* Activity column */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Activity</p>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-300 transition-all" style={{ width: `${activityScore}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">Doing things — check-ins, learning started, goals set</p>
            {activitySignals.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {STATUS_ICONS[s.status]}
                <p className="text-[10px] text-gray-600 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Behavioral change column */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Change</p>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${changeScore}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">Doing things differently — traction, follow-through</p>
            {changeSignals.length > 0 ? changeSignals.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {STATUS_ICONS[s.status]}
                <p className="text-[10px] text-gray-600 leading-relaxed">{s.label}</p>
              </div>
            )) : (
              <p className="text-[10px] text-gray-400 italic">No change signals yet — this builds as commitments are followed through.</p>
            )}
          </div>
        </div>

        {/* Recently completed */}
        {completedGoals.length > 0 && (
          <div className="pt-1 border-t border-gray-100 space-y-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Recently completed</p>
            {completedGoals.map(g => (
              <div key={g.id} className="flex items-center gap-2 py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-gray-500 line-through truncate">{g.title}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stalled goals warning */}
        {stalledGoals.length > 0 && (
          <div className="bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-medium">{stalledGoals.length} goal{stalledGoals.length > 1 ? 's' : ''} stalled</span> — activity without change. Check what's blocking traction.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}