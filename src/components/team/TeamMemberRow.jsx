import React, { useState } from "react";
import { ChevronDown, ChevronUp, Target, BookOpen, BarChart3, Calendar, AlertCircle } from "lucide-react";

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TeamMemberRow({ member, isAtRisk }) {
  const [open, setOpen] = useState(false);
  const m = member;
  const name = m.full_name || m.email;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-[#0202ff]/10 text-[#0202ff] flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            {isAtRisk && <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-500 truncate">{m.current_role || m.app_role || m.email}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <StatPill icon={Target} label="Goals" value={`${m.goals.completed}/${m.goals.total}`} color="text-[#0202ff]" />
          <StatPill icon={BarChart3} label="Score" value={m.assessments.latest_overall_pct != null ? `${m.assessments.latest_overall_pct}%` : "—"} color="text-emerald-600" />
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-[#0202ff]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Goals</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{m.goals.completed} done · {m.goals.in_progress} active</p>
              <p className="text-xs text-gray-500">{m.goals.avg_progress}% avg progress</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Assessment</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{m.assessments.latest_overall_pct != null ? `${m.assessments.latest_overall_pct}%` : "None"}</p>
              <p className="text-xs text-gray-500">{m.assessments.count} on file</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Journeys</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{m.journeys.in_progress} active</p>
              <p className="text-xs text-gray-500">{m.journeys.completed} completed</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Check-ins</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{m.checkins.submitted_count} submitted</p>
              <p className="text-xs text-gray-500">{m.learner_progress.completed} resources done</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}