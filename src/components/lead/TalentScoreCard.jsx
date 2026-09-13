/**
 * TalentScorecard — Combined Performance + Development summary card.
 * Layout mirrors Today's Playbook: header bar, then bordered sections.
 *   1. "My Performance" (→ /my-performance): KPIs list + cascaded org goals
 *   2. "My Development" (→ /my-development): Active Journeys, Active Learning, Experiences
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Target, ArrowRight, Compass, BookOpen, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const DIRECTION_ICONS = {
  higher_better: { icon: TrendingUp, color: "text-emerald-600" },
  lower_better: { icon: TrendingDown, color: "text-blue-600" },
  maintain: { icon: Minus, color: "text-amber-600" },
};

const DEV_STATS = [
  { key: "journeys", label: "Active Journeys", icon: Compass, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "learning", label: "Active Learning", icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "experiences", label: "Experiences", icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50" },
];

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

function SectionLink({ to, label }) {
  return (
    <Link to={to} className="text-[10px] text-[#0202ff] font-medium hover:underline flex-shrink-0">
      {label} →
    </Link>
  );
}

export default function TalentScorecard({ kpis = [], cascadedGoals = [], goals = [] }) {
  const { user } = useAuth();

  const { data: devStats = { journeys: 0, learning: 0, experiences: 0 } } = useQuery({
    queryKey: ['dev-stats', user?.email],
    queryFn: async () => {
      if (!user?.email) return { journeys: 0, learning: 0, experiences: 0 };
      try {
        const [plans, assigned, exps] = await Promise.all([
          base44.entities.DevelopmentPlan.filter({ status: { $in: ["active", "paused"] } }),
          base44.entities.AssignedLearning.filter({ user_email: user.email, status: { $ne: "completed" } }),
          base44.entities.DevelopmentExperience.filter({ user_email: user.email }),
        ]);
        return { journeys: plans.length, learning: assigned.length, experiences: exps.length };
      } catch {
        return { journeys: 0, learning: 0, experiences: 0 };
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const topKpis = kpis.filter(k => k.status === "active").slice(0, 3);
  const activeCascaded = cascadedGoals.filter(g => g.status === "active");
  const activeGoals = goals.filter(g => g.status === "active" && g.goal_type !== "kpi");
  const hasPerfData = topKpis.length > 0 || activeCascaded.length > 0 || activeGoals.length > 0;
  const hasDevData = devStats.journeys > 0 || devStats.learning > 0 || devStats.experiences > 0;
  if (!hasPerfData && !hasDevData) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5 text-[#0202ff]" />
        <p className="text-xs font-bold text-foreground uppercase tracking-widest">Talent Scorecard</p>
      </div>

      {/* ── My Performance ──────────────────────────────────────────── */}
      {hasPerfData && (
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Performance</p>
            <SectionLink to="/my-performance" label="All" />
          </div>

          {topKpis.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1">KPIs</p>
              <div className="divide-y divide-border/40">
                {topKpis.map(k => <KpiRow key={k.id} kpi={k} />)}
              </div>
            </div>
          )}

          {activeCascaded.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1">Org Goals</p>
              <div className="space-y-1.5">
                {activeCascaded.slice(0, 3).map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                    <p className="text-xs text-foreground truncate flex-1">{g.title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{g.progress || 0}%</span>
                  </div>
                ))}
                {activeCascaded.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-5">+{activeCascaded.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {activeGoals.length > 0 && !activeCascaded.length && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3 h-3 text-indigo-500" />
              <span>{activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      {/* ── My Development ─────────────────────────────────────────── */}
      {hasDevData && (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Development</p>
            <SectionLink to="/my-development" label="All" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEV_STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.key} className={`rounded-xl ${s.bg} px-2.5 py-2.5 text-center`}>
                  <Icon className={`w-3.5 h-3.5 mx-auto mb-1.5 ${s.color}`} />
                  <p className={`text-lg font-bold leading-none ${s.color}`}>{devStats[s.key]}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}