/**
 * PerformanceGlanceCard — Compact KPI + Cascaded Goals summary for Lead page companion column.
 * Shows: top 3 KPIs (on/off track), cascaded org goals count, link to My Performance.
 */
import React from "react";
import { BarChart3, Target, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const DIRECTION_ICONS = {
  higher_better: { icon: TrendingUp, color: "text-emerald-600" },
  lower_better: { icon: TrendingDown, color: "text-blue-600" },
  maintain: { icon: Minus, color: "text-amber-600" },
};

function KpiRow({ kpi }) {
  const isOnTrack = kpi.current_value != null && kpi.target_value != null;
  const dir = DIRECTION_ICONS[kpi.direction] || DIRECTION_ICONS.higher_better;
  const Icon = dir.icon;
  const onTrack = isOnTrack && (
    kpi.direction === "higher_better" ? (kpi.current_value >= kpi.target_value)
    : kpi.direction === "lower_better" ? (kpi.current_value <= kpi.target_value)
    : Math.abs(kpi.current_value - kpi.target_value) <= (kpi.target_value * 0.05)
  );
  const gap = isOnTrack
    ? kpi.direction === "lower_better"
      ? (kpi.current_value - kpi.target_value).toFixed(1)
      : (kpi.target_value - kpi.current_value).toFixed(1)
    : null;

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

export default function PerformanceGlanceCard({ kpis = [], cascadedGoals = [], goals = [] }) {
  const topKpis = kpis.filter(k => k.status === "active").slice(0, 3);
  const activeCascaded = cascadedGoals.filter(g => g.status === "active");
  const activeGoals = goals.filter(g => g.status === "active" && g.goal_type !== "kpi");
  const hasAnyData = topKpis.length > 0 || activeCascaded.length > 0 || activeGoals.length > 0;
  if (!hasAnyData) return null;

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      <Link to="/my-performance" className="block px-4 pt-4 pb-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0202ff]/10 border border-[#0202ff]/15 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-3 h-3 text-[#0202ff]" />
            </div>
            <p className="text-sm font-semibold text-foreground">Performance</p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </Link>

      <CardContent className="px-4 pt-0 pb-4 space-y-3">
        {/* KPIs */}
        {topKpis.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">KPIs</p>
            <div className="divide-y divide-border/40">
              {topKpis.map(k => <KpiRow key={k.id} kpi={k} />)}
            </div>
          </div>
        )}

        {/* Cascaded Org Goals */}
        {activeCascaded.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Org Goals</p>
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

        {/* Active Goals count */}
        {activeGoals.length > 0 && !activeCascaded.length && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="w-3 h-3 text-indigo-500" />
            <span>{activeGoals.length} active goal{activeGoals.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}