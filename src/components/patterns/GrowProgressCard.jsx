/**
 * GrowProgressCard — Development momentum, commitment follow-through, consistency.
 * Shows whether development is becoming real behavioral change.
 * Lives in Practice > Grow section.
 */
import React from "react";
import { CheckCircle2, Circle, AlertCircle, Flame, Activity, Repeat2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

function getMomentumScore(goals, pulses, assignments) {
  // Two distinct buckets: Activity (doing things) and Behavioral Change (doing things differently)
  let activityScore = 0;
  let changeScore = 0;
  let activitySignals = [];
  let changeSignals = [];

  // ACTIVITY: Check-in consistency (doing things)
  const recent7 = pulses.filter(p => (Date.now() - new Date(p.created_date).getTime()) < 7 * 86400000);
  if (recent7.length >= 4) {
    activityScore += 40;
    activitySignals.push({ label: `${recent7.length} check-ins this week`, status: 'positive' });
  } else if (recent7.length >= 2) {
    activityScore += 20;
    activitySignals.push({ label: `${recent7.length} check-ins this week`, status: 'neutral' });
  } else {
    activitySignals.push({ label: 'Few check-ins this week', status: 'watch' });
  }

  // ACTIVITY: Learning completed
  const completedLearning = assignments.filter(a => a.status === 'completed');
  if (completedLearning.length >= 2) {
    activityScore += 30;
    activitySignals.push({ label: `${completedLearning.length} learning items completed`, status: 'positive' });
  } else if (completedLearning.length === 1) {
    activityScore += 15;
    activitySignals.push({ label: '1 learning item completed', status: 'positive' });
  }

  // ACTIVITY: Goals set
  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    activityScore += 30;
    activitySignals.push({ label: `${activeGoals.length} active growth goal${activeGoals.length > 1 ? 's' : ''}`, status: 'positive' });
  }

  // BEHAVIORAL CHANGE: Commitment follow-through (doing things differently)
  const allFollowThrough = pulses.filter(p => p.prompt_type === 'follow_up');
  const followedThrough = allFollowThrough.filter(p => p.intent_actuals_gap === 'no_gap_detected');
  const partialFollowThrough = allFollowThrough.filter(p => p.intent_actuals_gap === 'partial_follow_through');
  const noFollowThrough = allFollowThrough.filter(p => p.intent_actuals_gap === 'no_follow_through_detected');

  if (followedThrough.length >= 2) {
    changeScore += 50;
    changeSignals.push({ label: `${followedThrough.length} commitments followed through`, status: 'positive' });
  } else if (followedThrough.length === 1) {
    changeScore += 25;
    changeSignals.push({ label: '1 commitment followed through', status: 'positive' });
  }
  if (partialFollowThrough.length > 0) {
    changeScore += 15;
    changeSignals.push({ label: `${partialFollowThrough.length} partial follow-through`, status: 'neutral' });
  }
  if (noFollowThrough.length >= 2) {
    changeSignals.push({ label: `${noFollowThrough.length} commitments not followed through`, status: 'watch' });
  }

  // BEHAVIORAL CHANGE: Goal momentum (actual progress made)
  const movingGoals = activeGoals.filter(g => (g.progress || 0) >= 40);
  if (movingGoals.length > 0) {
    changeScore += 50;
    changeSignals.push({ label: `${movingGoals.length} goal${movingGoals.length > 1 ? 's' : ''} showing real progress`, status: 'positive' });
  } else if (activeGoals.length > 0) {
    changeSignals.push({ label: 'Goals started but limited progress yet', status: 'neutral' });
  }

  const activityPct = Math.min(activityScore, 100);
  const changePct = Math.min(changeScore, 100);

  return { activityPct, changePct, activitySignals, changeSignals };
}

const STATUS_ICONS = {
  positive: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
  neutral: <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />,
  watch: <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
};

function getLabel(pct) {
  if (pct >= 70) return { label: "Strong", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (pct >= 40) return { label: "Building", color: "text-blue-600", bg: "bg-blue-50" };
  if (pct >= 15) return { label: "Starting", color: "text-amber-600", bg: "bg-amber-50" };
  return { label: "Early", color: "text-gray-500", bg: "bg-gray-100" };
}

export default function GrowProgressCard({ goals = [], pulses = [], assignments = [] }) {
  const { activityPct, changePct, activitySignals, changeSignals } = getMomentumScore(goals, pulses, assignments);
  const activityLabel = getLabel(activityPct);
  const changeLabel = getLabel(changePct);

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

        {/* Two distinct bars: Activity vs Behavioral Change */}
        <div className="space-y-3">
          {/* Activity bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-xs font-medium text-gray-700">Activity</p>
                <span className="text-[10px] text-gray-400">— doing things</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${activityLabel.bg} ${activityLabel.color}`}>{activityLabel.label}</span>
            </div>
            <Progress value={activityPct} className="h-1.5" />
            {activitySignals.length > 0 && (
              <div className="space-y-1 pt-0.5">
                {activitySignals.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {STATUS_ICONS[s.status]}
                    <p className="text-[11px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-100" />

          {/* Behavioral change bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Repeat2 className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-xs font-medium text-gray-700">Behavioral change</p>
                <span className="text-[10px] text-gray-400">— doing differently</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${changeLabel.bg} ${changeLabel.color}`}>{changeLabel.label}</span>
            </div>
            <Progress value={changePct} className="h-1.5" />
            {changeSignals.length > 0 && (
              <div className="space-y-1 pt-0.5">
                {changeSignals.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {STATUS_ICONS[s.status]}
                    <p className="text-[11px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {changeSignals.length === 0 && (
              <p className="text-[11px] text-gray-400 italic">Follow-through data builds from daily intentions and reflections.</p>
            )}
          </div>
        </div>

        <p className="text-[10px] text-gray-400 leading-relaxed">Activity is doing things. Behavioral change is when you lead differently under pressure. Both matter — but they're not the same thing.</p>

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
              <span className="font-medium">{stalledGoals.length} goal{stalledGoals.length > 1 ? 's' : ''} stalled under pressure</span> — hasn't moved recently.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}