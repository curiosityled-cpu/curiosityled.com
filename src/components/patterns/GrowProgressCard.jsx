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

function getMomentumScore(goals, pulses, assignments) {
  let score = 0;
  let signals = [];

  // Goal progress
  const activeGoals = goals.filter(g => g.status === 'active');
  const movingGoals = activeGoals.filter(g => (g.progress || 0) >= 30);
  if (movingGoals.length > 0) {
    score += 30;
    signals.push({ label: `${movingGoals.length} goal${movingGoals.length > 1 ? 's' : ''} moving`, status: 'positive' });
  } else if (activeGoals.length > 0) {
    score += 5;
    signals.push({ label: 'Goals set, progress starting', status: 'neutral' });
  }

  // Check-in consistency (last 7 days)
  const recent7 = pulses.filter(p => (Date.now() - new Date(p.created_date).getTime()) < 7 * 86400000);
  if (recent7.length >= 4) {
    score += 25;
    signals.push({ label: `${recent7.length} check-ins this week`, status: 'positive' });
  } else if (recent7.length >= 2) {
    score += 12;
    signals.push({ label: `${recent7.length} check-ins this week`, status: 'neutral' });
  } else {
    signals.push({ label: 'Few check-ins this week', status: 'watch' });
  }

  // Completed learning
  const completedLearning = assignments.filter(a => a.status === 'completed');
  if (completedLearning.length >= 2) {
    score += 25;
    signals.push({ label: `${completedLearning.length} learning items completed`, status: 'positive' });
  } else if (completedLearning.length === 1) {
    score += 12;
    signals.push({ label: '1 learning item completed', status: 'positive' });
  }

  // Follow-through pulses
  const followThrough = pulses.filter(p => p.prompt_type === 'follow_up' && p.intent_actuals_gap === 'no_gap_detected');
  if (followThrough.length >= 2) {
    score += 20;
    signals.push({ label: `${followThrough.length} commitments followed through`, status: 'positive' });
  } else if (followThrough.length === 1) {
    score += 10;
    signals.push({ label: '1 commitment followed through', status: 'positive' });
  }

  return { score: Math.min(score, 100), signals };
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
  const { score, signals } = getMomentumScore(goals, pulses, assignments);
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

        {/* Momentum score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Development momentum</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg} ${color}`}>{label}</span>
          </div>
          <Progress value={score} className="h-2" />
          <p className="text-[10px] text-gray-400">Based on goals, check-ins, learning, and follow-through · Private</p>
        </div>

        {/* Signals */}
        {signals.length > 0 && (
          <div className="space-y-1.5">
            {signals.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                {STATUS_ICONS[s.status]}
                <p className="text-xs text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recently completed goals */}
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
              <span className="font-medium">{stalledGoals.length} goal{stalledGoals.length > 1 ? 's' : ''} stalled under pressure</span> — hasn't moved recently. This is the pattern the brief predicts.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}