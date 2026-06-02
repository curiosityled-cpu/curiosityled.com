/**
 * LeadMicroAnalytics — compact status indicators strip for Lead.
 * Energy, clarity, load, momentum, pattern watch — calm micro-trend lines.
 */
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const STATUS_MAP = {
  energy: {
    label: "Energy",
    getValue: (pulse, trends) => {
      const v = pulse?.energy_level;
      if (!v) return null;
      return { strong: { label: "Strong", color: "text-emerald-600", bg: "bg-emerald-50" }, steady: { label: "Steady", color: "text-blue-600", bg: "bg-blue-50" }, stretched: { label: "Stretched", color: "text-amber-600", bg: "bg-amber-50" }, drained: { label: "Drained", color: "text-rose-600", bg: "bg-rose-50" } }[v] || null;
    },
    getTrend: (trends) => trends?.energy_trend,
  },
  clarity: {
    label: "Clarity",
    getValue: (pulse) => {
      const v = pulse?.energy_level; // clarity proxied via energy in baseline_energy prompt
      if (!v) return null;
      return { steady: { label: "Clear", color: "text-emerald-600", bg: "bg-emerald-50" }, strong: { label: "Clear", color: "text-emerald-600", bg: "bg-emerald-50" }, stretched: { label: "Stretched", color: "text-amber-600", bg: "bg-amber-50" }, drained: { label: "Behind", color: "text-rose-600", bg: "bg-rose-50" } }[v] || null;
    },
    getTrend: () => null,
  },
  load: {
    label: "Load",
    getValue: (pulse) => {
      const v = pulse?.perceived_load;
      if (!v) return null;
      return { light: { label: "Light", color: "text-emerald-600", bg: "bg-emerald-50" }, manageable: { label: "Manageable", color: "text-blue-600", bg: "bg-blue-50" }, heavy: { label: "Heavy", color: "text-amber-600", bg: "bg-amber-50" }, unsustainable: { label: "Critical", color: "text-rose-600", bg: "bg-rose-50" } }[v] || null;
    },
    getTrend: (trends) => {
      const t = trends?.overload_pattern_strength;
      if (!t) return null;
      return t > 60 ? 'declining' : t > 30 ? 'stable' : 'improving';
    },
  },
  momentum: {
    label: "Momentum",
    getValue: (pulse, trends, goals) => {
      const active = (goals || []).filter(g => g.status === 'active');
      const moving = active.filter(g => (g.progress || 0) >= 20);
      if (active.length === 0) return { label: "No goals", color: "text-gray-400", bg: "bg-gray-50" };
      const ratio = moving.length / active.length;
      if (ratio >= 0.7) return { label: "Building", color: "text-emerald-600", bg: "bg-emerald-50" };
      if (ratio >= 0.4) return { label: "Mixed", color: "text-amber-600", bg: "bg-amber-50" };
      return { label: "Stalled", color: "text-rose-600", bg: "bg-rose-50" };
    },
    getTrend: () => null,
  },
  pattern: {
    label: "Pattern",
    getValue: (pulse, trends) => {
      if (!trends) return null;
      if (trends.overload_pattern_strength > 60) return { label: "Overload", color: "text-amber-600", bg: "bg-amber-50" };
      if (trends.identity_friction_active) return { label: "Friction", color: "text-violet-600", bg: "bg-violet-50" };
      if (trends.learning_stall_detected) return { label: "Stall", color: "text-blue-600", bg: "bg-blue-50" };
      if (trends.confidence_trend === 'declining') return { label: "Watch", color: "text-rose-600", bg: "bg-rose-50" };
      return { label: "Steady", color: "text-emerald-600", bg: "bg-emerald-50" };
    },
    getTrend: () => null,
  },
};

function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />;
  if (trend === 'declining') return <TrendingDown className="w-2.5 h-2.5 text-rose-500" />;
  return null;
}

export default function LeadMicroAnalytics({ pulse, trends, goals = [] }) {
  const items = Object.entries(STATUS_MAP).map(([key, def]) => {
    const status = def.getValue(pulse, trends, goals);
    const trend = def.getTrend?.(trends);
    return { key, label: def.label, status, trend };
  }).filter(i => i.status);

  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
      {items.map(({ key, label, status, trend }) => (
        <div key={key} className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${status.bg} border-transparent`}>
          <span className="text-[10px] text-gray-400">{label}</span>
          <span className={`text-[10px] font-semibold ${status.color}`}>{status.label}</span>
          {trend && <TrendIcon trend={trend} />}
        </div>
      ))}
    </div>
  );
}