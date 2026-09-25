/**
 * TeamTalentScorecard — Combined Team Health + KPI card.
 * Mirrors the Talent Scorecard design: accent bar, collapsible header,
 * KPI sub-card (broken into Enterprise / Team sections), and
 * Team Health sub-card (side-by-side stat tiles like Development).
 */
import React, { useState } from "react";
import {
  Trophy, Target, BarChart3, BookOpen, Calendar,
  TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";

const DIRECTION_ICONS = {
  higher_better: { icon: TrendingUp, color: "text-emerald-600" },
  lower_better: { icon: TrendingDown, color: "text-blue-600" },
  maintain: { icon: Minus, color: "text-amber-600" },
};

const HEALTH_STATS = [
  { key: "goals", label: "Goals", icon: Target, color: "text-[#0202ff]", bg: "bg-[#0202ff]/5" },
  { key: "assessments", label: "Assessments", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "journeys", label: "Journeys", icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "checkins", label: "Check-ins", icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
];

function SectionLink({ to, label }) {
  return (
    <Link to={to} className="text-[10px] text-[#0202ff] font-medium hover:underline flex-shrink-0">
      {label} →
    </Link>
  );
}

function KpiRow({ kpi }) {
  const isOnTrack = kpi.current_value != null && kpi.target_value != null;
  const dir = DIRECTION_ICONS[kpi.direction] || DIRECTION_ICONS.higher_better;
  const Icon = dir.icon;
  const onTrack = isOnTrack && (
    kpi.direction === "higher_better" ? (kpi.current_value >= kpi.target_value)
    : kpi.direction === "lower_better" ? (kpi.current_value <= kpi.target_value)
    : Math.abs(kpi.current_value - kpi.target_value) <= (kpi.target_value * 0.05)
  );

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-3 h-3 flex-shrink-0 ${dir.color}`} />
        <p className="text-xs text-foreground truncate">{kpi.title}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isOnTrack && (
          <>
            <span className={`text-[10px] font-semibold ${onTrack ? "text-emerald-600" : "text-amber-600"}`}>
              {kpi.current_value}{kpi.unit}
            </span>
            <span className="text-[10px] text-muted-foreground">/ {kpi.target_value}{kpi.unit}</span>
          </>
        )}
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${onTrack ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
          {onTrack ? "On" : "Off"}
        </span>
      </div>
    </div>
  );
}

export default function TeamTalentScorecard({ aggregates, kpis = [], teamSize }) {
  const a = aggregates || {};
  const goals = a.goals || {};
  const journeys = a.journeys || {};
  const assessments = a.assessments || {};
  const checkins = a.checkins || {};

  // Split KPIs into Enterprise (no owner) and Team (has owner)
  const enterpriseKpis = kpis.filter((k) => !k.owner_email);
  const teamKpis = kpis.filter((k) => k.owner_email);

  const [cardExpanded, setCardExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_scorecard"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [kpiExpanded, setKpiExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_scorecard_kpi"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [healthExpanded, setHealthExpanded] = useState(() => {
    try { const s = localStorage.getItem("cl_collapse_team_scorecard_health"); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });

  const persist = (key, setter) => (v) => { setter(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

  const healthValues = {
    goals: `${goals.completion_pct || 0}%`,
    assessments: `${assessments.avg_overall_pct || 0}%`,
    journeys: `${journeys.in_progress || 0}`,
    checkins: `${checkins.participation_pct || 0}%`,
  };

  const hasKpis = kpis.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
      {/* Accent bar */}
      <div className="h-0.5 w-full" style={{ backgroundColor: '#0202ff' }} />

      {/* Header */}
      <button
        onClick={() => persist("cl_collapse_team_scorecard", setCardExpanded)(!cardExpanded)}
        className="flex items-center gap-2.5 px-4 py-3.5 w-full text-left group"
      >
        <Trophy className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
        <p className="text-sm font-semibold text-slate-900 flex-1 group-hover:text-slate-700 transition-colors">
          Team Talent Scorecard
        </p>
        {cardExpanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {/* Content */}
      {cardExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">

          {/* ── KPI sub-card ───────────────────────────────────────────── */}
          {hasKpis && (
            <div className="bg-card border border-border rounded-2xl px-5 py-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => persist("cl_collapse_team_scorecard_kpi", setKpiExpanded)(!kpiExpanded)}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">KPI</p>
                <div className="flex items-center gap-2">
                  <SectionLink to="/Insights" label="All" />
                  {kpiExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                </div>
              </button>
              {kpiExpanded && (
                <div className="mt-2 space-y-3">
                  {enterpriseKpis.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5">Enterprise</p>
                      <div className="divide-y divide-border/40">
                        {enterpriseKpis.slice(0, 5).map((k) => <KpiRow key={k.id} kpi={k} />)}
                      </div>
                      {enterpriseKpis.length > 5 && (
                        <p className="text-[10px] text-muted-foreground pl-5 mt-1">+{enterpriseKpis.length - 5} more</p>
                      )}
                    </div>
                  )}
                  {enterpriseKpis.length > 0 && teamKpis.length > 0 && (
                    <div className="border-t border-border/40" />
                  )}
                  {teamKpis.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5">Team</p>
                      <div className="divide-y divide-border/40">
                        {teamKpis.slice(0, 5).map((k) => <KpiRow key={k.id} kpi={k} />)}
                      </div>
                      {teamKpis.length > 5 && (
                        <p className="text-[10px] text-muted-foreground pl-5 mt-1">+{teamKpis.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Team Health sub-card ──────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl px-5 py-4">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => persist("cl_collapse_team_scorecard_health", setHealthExpanded)(!healthExpanded)}
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Team Health</p>
              <div className="flex items-center gap-2">
                <SectionLink to="/Insights" label="All" />
                {healthExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </div>
            </button>
            {healthExpanded && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {HEALTH_STATS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className={`rounded-xl ${s.bg} px-2.5 py-2.5 text-center`}>
                      <Icon className={`w-3.5 h-3.5 mx-auto mb-1.5 ${s.color}`} />
                      <p className={`text-lg font-bold leading-none ${s.color}`}>{healthValues[s.key]}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}