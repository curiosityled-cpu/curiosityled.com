/**
 * DailyHUD — Flo-inspired status bar for Lead.
 *
 * One dominant signal + supporting micro-indicators.
 * Feels like a personal status read, not a KPI dashboard.
 * Renders only after a check-in exists; silent otherwise.
 */
import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

// ── Derive the single dominant signal ────────────────────────────────────────
function getDominantSignal(pulse, trends, goals) {
  if (!pulse) return null;

  if (pulse.perceived_load === "unsustainable" || pulse.energy_level === "drained")
    return { label: "Running on fumes", dot: "bg-rose-500", ring: "border-rose-500/30", glow: "shadow-rose-500/10" };
  if (pulse.avoidance_flag === "yes")
    return { label: "Something feels avoided", dot: "bg-orange-400", ring: "border-orange-400/30", glow: "shadow-orange-400/10" };
  if (pulse.perceived_load === "heavy" || pulse.energy_level === "stretched")
    return { label: "Carrying a heavy load", dot: "bg-amber-400", ring: "border-amber-400/30", glow: "shadow-amber-400/10" };
  if (pulse.energy_level === "strong" || pulse.confidence_today === "high")
    return { label: "In a good place today", dot: "bg-emerald-500", ring: "border-emerald-500/30", glow: "shadow-emerald-500/10" };
  if (pulse.energy_level === "steady" || pulse.perceived_load === "manageable")
    return { label: "Steady state", dot: "bg-blue-400", ring: "border-blue-400/30", glow: "shadow-blue-400/10" };
  if (pulse.focus_category)
    return { label: "Intent set", dot: "bg-[#0202ff]", ring: "border-[#0202ff]/30", glow: "shadow-[#0202ff]/10" };

  return { label: "Checked in", dot: "bg-gray-400", ring: "border-border", glow: "" };
}

// ── Supporting micro-tiles ────────────────────────────────────────────────────
function getMicroIndicators(pulse, trends, goals) {
  const items = [];

  // Load
  const loadMap = { light: { l: "Light", c: "text-emerald-500" }, manageable: { l: "Manageable", c: "text-blue-500" }, heavy: { l: "Heavy", c: "text-amber-500" }, unsustainable: { l: "Critical", c: "text-rose-500" } };
  if (pulse?.perceived_load && loadMap[pulse.perceived_load]) items.push({ label: "Load", value: loadMap[pulse.perceived_load].l, color: loadMap[pulse.perceived_load].c, trend: trends?.overload_pattern_strength > 60 ? "up" : null });

  // Goals momentum
  const active = (goals || []).filter(g => g.status === "active");
  const moving = active.filter(g => (g.progress || 0) >= 20);
  if (active.length > 0) {
    const ratio = moving.length / active.length;
    const v = ratio >= 0.7 ? { l: "Building", c: "text-emerald-500" } : ratio >= 0.4 ? { l: "Mixed", c: "text-amber-500" } : { l: "Stalled", c: "text-rose-500" };
    items.push({ label: "Goals", value: v.l, color: v.c, trend: null });
  }

  // Pattern watch
  if (trends) {
    if (trends.overload_pattern_strength > 60) items.push({ label: "Pattern", value: "Overload", color: "text-amber-500", trend: "up" });
    else if (trends.confidence_trend === "declining") items.push({ label: "Pattern", value: "Watch", color: "text-rose-500", trend: "down" });
    else if (trends.overload_pattern_strength < 30 && trends.energy_trend === "improving") items.push({ label: "Pattern", value: "Steady", color: "text-emerald-500", trend: "up" });
  }

  return items.slice(0, 3);
}

export default function DailyHUD({ pulse, trends, goals = [] }) {
  const dominant = getDominantSignal(pulse, trends, goals);
  const micro = getMicroIndicators(pulse, trends, goals);

  if (!dominant) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border ${dominant.ring} shadow-sm ${dominant.glow}`}>
      {/* Dominant signal */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dominant.dot}`} />
        <span className="text-sm font-semibold text-foreground">{dominant.label}</span>
      </div>

      {/* Divider */}
      {micro.length > 0 && <div className="w-px h-4 bg-border flex-shrink-0" />}

      {/* Micro indicators */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {micro.map(({ label, value, color, trend }) => (
          <div key={label} className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className={`text-[10px] font-bold ${color}`}>{value}</span>
            {trend === "up" && <TrendingUp className="w-2.5 h-2.5 text-rose-400" />}
            {trend === "down" && <TrendingDown className="w-2.5 h-2.5 text-rose-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}