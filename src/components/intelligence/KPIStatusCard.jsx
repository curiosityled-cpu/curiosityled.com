/**
 * KPIStatusCard — Displays cascaded org KPIs on the Manager dashboard.
 * Reads Goal entities with goal_type="kpi" or "cascaded_kpi"
 */
import React from "react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

function kpiStatus(kpi) {
  const target = kpi.kpi_target;
  const current = kpi.kpi_current;
  const direction = kpi.kpi_direction || "higher_better";
  if (target == null || current == null) return { label: "No data", color: "text-muted-foreground", bg: "bg-muted", icon: Target };
  const pct = target !== 0 ? (current / target) * 100 : 0;
  const isGood = direction === "higher_better" ? pct >= 95 : pct <= 105;
  const isWarn = direction === "higher_better" ? pct >= 75 : pct <= 125;
  if (isGood) return { label: "On Track", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 };
  if (isWarn) return { label: "Watch", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle };
  return { label: "At Risk", color: "text-red-600", bg: "bg-red-50", icon: TrendingDown };
}

function KPIItem({ kpi }) {
  const status = kpiStatus(kpi);
  const StatusIcon = status.icon;
  const target = kpi.kpi_target;
  const current = kpi.kpi_current;
  const direction = kpi.kpi_direction || "higher_better";
  const progressPct = target && target !== 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg ${status.bg} flex items-center justify-center`}>
        <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground truncate">{kpi.title}</p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color} ${status.bg} border-0`}>
            {status.label}
          </Badge>
        </div>
        {target != null && current != null && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">
                {current}{kpi.kpi_unit || ""} / {target}{kpi.kpi_unit || ""}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(progressPct)}%
              </span>
            </div>
            <Progress
              value={progressPct}
              className="h-1"
              indicatorClassName={
                progressPct >= 95
                  ? "bg-emerald-500"
                  : progressPct >= 75
                  ? "bg-amber-500"
                  : "bg-red-500"
              }
            />
          </div>
        )}
        {kpi.cascaded_from_goal_id && (
          <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5" /> Cascaded from org goal
          </p>
        )}
      </div>
    </div>
  );
}

export default function KPIStatusCard({ kpis = [], className = "" }) {
  const activeKpis = kpis.filter(k => k.status === "active");
  const atRiskCount = activeKpis.filter(k => kpiStatus(k).label === "At Risk").length;
  const onTrackCount = activeKpis.filter(k => kpiStatus(k).label === "On Track").length;

  if (activeKpis.length === 0) return null;

  return (
    <Card className={`border-border shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-[#0202ff]" />
            </div>
            <CardTitle className="text-xs font-bold uppercase tracking-widest">Operational KPIs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onTrackCount > 0 && (
              <span className="text-[10px] text-emerald-600 font-medium">{onTrackCount} on track</span>
            )}
            {atRiskCount > 0 && (
              <span className="text-[10px] text-red-600 font-medium">{atRiskCount} at risk</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div>
          {activeKpis.slice(0, 5).map(kpi => (
            <KPIItem key={kpi.id} kpi={kpi} />
          ))}
        </div>
        {activeKpis.length > 5 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            +{activeKpis.length - 5} more KPIs
          </p>
        )}
        {activeKpis.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border">
            <Link to="/my-goals" className="flex items-center justify-center gap-1 text-[10px] text-[#0202ff] font-medium hover:underline">
              View all goals <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}