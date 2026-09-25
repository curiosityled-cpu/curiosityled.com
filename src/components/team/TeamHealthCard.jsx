/**
 * TeamHealthCard — Team Health summary card.
 * Mirrors the Talent Scorecard design: accent bar, collapsible header,
 * and bordered sub-cards for Goals, Assessments, Journeys, and Check-ins.
 */
import React, { useState } from "react";
import { Activity, Target, BarChart3, BookOpen, Calendar, ChevronUp, ChevronDown } from "lucide-react";

function SubCard({ label, icon: Icon, iconColor, expanded, onToggle, value, sub }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="mt-3">
          <p className={`text-2xl font-bold leading-none ${iconColor}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
        </div>
      )}
    </div>
  );
}

export default function TeamHealthCard({ aggregates, teamSize }) {
  const a = aggregates || {};
  const goals = a.goals || {};
  const journeys = a.journeys || {};
  const assessments = a.assessments || {};
  const checkins = a.checkins || {};

  const [cardExpanded, setCardExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_health"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [goalsExpanded, setGoalsExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_health_goals"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [assessmentsExpanded, setAssessmentsExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_health_assessments"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [journeysExpanded, setJourneysExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_health_journeys"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [checkinsExpanded, setCheckinsExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_health_checkins"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });

  const persist = (key, setter) => (v) => { setter(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      {/* Accent bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: '#0202ff' }} />

      {/* Header */}
      <button
        onClick={() => persist("cl_collapse_team_health", setCardExpanded)(!cardExpanded)}
        className="flex items-center gap-2.5 px-4 py-3.5 w-full text-left group"
      >
        <Activity className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
        <p className="text-sm font-semibold text-slate-900 flex-1 group-hover:text-slate-700 transition-colors">Team Health</p>
        {cardExpanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {/* Content */}
      {cardExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <SubCard
            label="Goals"
            icon={Target}
            iconColor="text-[#0202ff]"
            expanded={goalsExpanded}
            onToggle={() => persist("cl_collapse_team_health_goals", setGoalsExpanded)(!goalsExpanded)}
            value={`${goals.completion_pct || 0}%`}
            sub={`${goals.completed || 0} of ${goals.total || 0} complete · ${goals.in_progress || 0} active`}
          />
          <SubCard
            label="Assessments"
            icon={BarChart3}
            iconColor="text-emerald-600"
            expanded={assessmentsExpanded}
            onToggle={() => persist("cl_collapse_team_health_assessments", setAssessmentsExpanded)(!assessmentsExpanded)}
            value={`${assessments.avg_overall_pct || 0}%`}
            sub={`${assessments.completion_rate || 0}% of team assessed`}
          />
          <SubCard
            label="Journeys"
            icon={BookOpen}
            iconColor="text-amber-600"
            expanded={journeysExpanded}
            onToggle={() => persist("cl_collapse_team_health_journeys", setJourneysExpanded)(!journeysExpanded)}
            value={`${journeys.in_progress || 0}`}
            sub={`${journeys.completed || 0} completed · ${journeys.enrolled || 0} enrolled`}
          />
          <SubCard
            label="Check-ins"
            icon={Calendar}
            iconColor="text-purple-600"
            expanded={checkinsExpanded}
            onToggle={() => persist("cl_collapse_team_health_checkins", setCheckinsExpanded)(!checkinsExpanded)}
            value={`${checkins.participation_pct || 0}%`}
            sub={`${checkins.total_submitted || 0} submitted · ${teamSize} in scope`}
          />
        </div>
      )}
    </div>
  );
}