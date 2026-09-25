import React from "react";
import { Target, BookOpen, BarChart3, Calendar, TrendingUp } from "lucide-react";

function SummaryCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function TeamSummaryCards({ aggregates, teamSize }) {
  const a = aggregates || {};
  const goals = a.goals || {};
  const journeys = a.journeys || {};
  const assessments = a.assessments || {};
  const checkins = a.checkins || {};

  return (
    <div className="grid grid-cols-2 gap-3">
      <SummaryCard
        icon={Target}
        label="Goals"
        value={`${goals.completion_pct || 0}%`}
        sub={`${goals.completed || 0} of ${goals.total || 0} complete · ${goals.in_progress || 0} active`}
        accent="bg-[#0202ff]"
      />
      <SummaryCard
        icon={BarChart3}
        label="Assessments"
        value={`${assessments.avg_overall_pct || 0}%`}
        sub={`${assessments.completion_rate || 0}% of team assessed`}
        accent="bg-emerald-600"
      />
      <SummaryCard
        icon={BookOpen}
        label="Journeys"
        value={`${journeys.in_progress || 0}`}
        sub={`${journeys.completed || 0} completed · ${journeys.enrolled || 0} enrolled`}
        accent="bg-amber-600"
      />
      <SummaryCard
        icon={Calendar}
        label="Check-ins"
        value={`${checkins.participation_pct || 0}%`}
        sub={`${checkins.total_submitted || 0} submitted · ${teamSize} in scope`}
        accent="bg-purple-600"
      />
    </div>
  );
}