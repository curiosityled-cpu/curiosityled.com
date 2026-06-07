/**
 * DailyHUD — compact status scorecard strip for Lead page.
 * Shows Energy, Load, Momentum, and Pattern Watch as a horizontal scorecard.
 * Replaces the old LeadMicroAnalytics component for the redesigned Lead page.
 */
import React from "react";
import { TrendingUp, TrendingDown, Flame, Zap, Target, Activity } from "lucide-react";

const INDICATORS = [
  {
    key: "energy",
    label: "Energy",
    icon: Zap,
    get: (pulse) => {
      const map = {
        strong:        { label: "Strong",     color: "text-emerald-600", dot: "bg-emerald-500" },
        steady:        { label: "Steady",      color: "text-blue-600",   dot: "bg-blue-500" },
        stretched:     { label: "Stretched",   color: "text-amber-600",  dot: "bg-amber-500" },
        drained:       { label: "Drained",     color: "text-rose-600",   dot: "bg-rose-500" },
      };
      return pulse?.energy_level ? map[pulse.energy_level] : null;
    },
    trend: (trends) => trends?.energy_trend,
  },
  {
    key: "load",
    label: "Load",
    icon: Activity,
    get: (pulse) => {
      const map = {
        light:         { label: "Light",       color: "text-emerald-600", dot: "bg-emerald-500" },
        manageable:    { label: "Manageable",  color: "text-blue-600",   dot: "bg-blue-500" },
        heavy:         { label: "Heavy",       color: "text-amber-600",  dot: "bg-amber-500" },
        unsustainable: { label: "Critical",    color: "text-rose-600",   dot: "bg-rose-500" },
      };
      return pulse?.perceived_load ? map[pulse.perceived_load] : null;
    },
    trend: (trends) => {
      const s = trends?.overload_pattern_strength;
      if (!s) return null;
      return s > 60 ? "declining" : s > 30 ? "stable" : "improving";
    },
  },
  {
    key: "momentum",
    label: "Goals",
    icon: Target,
    get: (_, __, goals) => {
      const active = (goals || []).filter(g => g.status === "active");
      const moving = active.filter(g => (g.progress || 0) >= 20);
      if (active.length === 0) return { label: "No goals", color: "text-gray-400", dot: "bg-gray-400" };
      const ratio = moving.length / active.length;
      if (ratio >= 0.7) return { label: "Building", color: "text-emerald-600", dot: "bg-emerald-500" };
      if (ratio >= 0.4) return { label: "Mixed",    color: "text-amber-600",  dot: "bg-amber-500" };
      return { label: "Stalled", color: "text-rose-600", dot: "bg-rose-500" };
    },
    trend: () => null,
  },
  {
    key: "pattern",
    label: "Pattern",
    icon: Flame,
    get: (_, trends) => {
      if (!trends) return null;
      if (trends.overload_pattern_strength > 60) return { label: "Overload", color: "text-amber-600",  dot: "bg-amber-500" };
      if (trends.identity_friction_active)       return { label: "Friction", color: "text-violet-600", dot: "bg-violet-500" };
      if (trends.confidence_trend === "declining") return { label: "Watch",  color: "text-rose-600",   dot: "bg-rose-500" };
      return { label: "Steady", color: "text-emerald-600", dot: "bg-emerald-500" };
    },
    trend: () => null,
  },
];

function TrendArrow({ trend }) {
  if (trend === "improving") return <TrendingUp className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />;
  if (trend === "declining") return <TrendingDown className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />;
  return null;
}

export default function DailyHUD({ pulse, trends, goals = [] }) {
  const items = INDICATORS.map(ind => {
    const status = ind.get(pulse, trends, goals);
    const trend  = ind.trend(trends);
    return { ...ind, status, trend };
  }).filter(i => i.status);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ key, label, status, trend }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center gap-1 bg-card border border-border rounded-2xl py-3 px-2"
        >
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
            <span className={`text-[11px] font-bold ${status.color}`}>{status.label}</span>
            {trend && <TrendArrow trend={trend} />}
          </div>
          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
}