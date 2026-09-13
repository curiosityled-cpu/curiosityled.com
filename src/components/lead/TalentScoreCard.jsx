/**
 * TalentScoreCard — Combined Performance + Development summary card.
 * Two sections:
 *   1. "My Performance" (→ /my-performance): KPIs list + cascaded org goals
 *   2. "My Development" (→ /my-development): Active Journeys, Active Learning, Experiences
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Target, TrendingUp, TrendingDown, Minus, ArrowRight, Compass, BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

function SectionHeader({ to, title, subtitle }) {
  return (
    <Link to={to} className="flex items-center justify-between hover:bg-muted/30 transition-colors -mx-1 px-1 py-1 rounded-md">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

export default function TalentScoreCard({ kpis = [], cascadedGoals = [], goals = [] }) {
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
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      {/* Card title */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-border/60">
        <div className="w-6 h-6 rounded-lg bg-[#0202ff]/10 border border-[#0202ff]/15 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-3 h-3 text-[#0202ff]" />
        </div>
        <p className="text-sm font-semibold text-foreground">Talent Score</p>
      </div>

      <CardContent className="px-4 pt-3 pb-4 space-y-4">
        {/* ── My Performance ── */}
        {hasPerfData && (
          <div className="space-y-2">
            <SectionHeader to="/my-performance" title="My Performance" subtitle="KPIs and org goals" />
            {topKpis.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">KPIs</p>
                <div className="divide-y divide-border/40">
                  {topKpis.map(k => <KpiRow key={k.id} kpi={k} />)}
                </div>
              </div>
            )}
            {activeCascaded.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Org Goals</p>
                <div className="space-y-1">
                  {activeCascaded.slice(0, 3).map(g => (
                    <div key={g.id} className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                      <p className="text-xs text-foreground truncate">{g.title}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-auto">{g.progress || 0}%</span>
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

        {/* Divider between sections */}
        {hasPerfData && hasDevData && <div className="border-t border-border/60" />}

        {/* ── My Development ── */}
        {hasDevData && (
          <div className="space-y-2">
            <SectionHeader to="/my-development" title="My Development" subtitle="Journeys, learning and experiences" />
            <div className="grid grid-cols-3 gap-2">
              {DEV_STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.key} className={`rounded-xl ${s.bg} px-2.5 py-2 text-center`}>
                    <Icon className={`w-3 h-3 mx-auto mb-1 ${s.color}`} />
                    <p className={`text-lg font-bold leading-none ${s.color}`}>{devStats[s.key]}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}