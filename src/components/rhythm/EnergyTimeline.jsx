/**
 * EnergyTimeline
 * Line-style sparkline showing energy + perceived load over last 14 check-ins.
 * Displayed on ManagerPatterns.
 */
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const ENERGY_VALUE = { drained: 1, stretched: 2, steady: 3, strong: 4 };
const LOAD_VALUE   = { unsustainable: 1, heavy: 2, manageable: 3, light: 4 };

function Sparkline({ values, color, label }) {
  if (values.length < 2) return null;
  const min = 1, max = 4;
  const w = 200, h = 40;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x},${y}`;
  }).join(" ");

  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const trend = last > prev ? "up" : last < prev ? "down" : "flat";

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 font-medium">{label}</span>
        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
          {trend === "up"   && <TrendingUp className="w-3 h-3 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="w-3 h-3 text-rose-400" />}
          {trend === "flat" && <Minus className="w-3 h-3 text-gray-400" />}
          {label === "Load" ? ["critical","heavy","manageable","light"][last - 1] : ["drained","stretched","steady","strong"][last - 1]}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" preserveAspectRatio="none">
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={(i / (values.length - 1)) * w}
            cy={h - ((v - min) / (max - min)) * h}
            r="2.5"
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.5}
          />
        ))}
      </svg>
    </div>
  );
}

export default function EnergyTimeline({ pulses = [] }) {
  const last14 = useMemo(() =>
    [...pulses]
      .filter(p => p.created_date)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .slice(-14),
  [pulses]);

  const energyValues = last14.map(p => ENERGY_VALUE[p.energy_level]).filter(Boolean);
  const loadValues   = last14.map(p => LOAD_VALUE[p.perceived_load]).filter(Boolean);

  // Need at least 2 data points in either series to render anything useful
  if (energyValues.length < 2 && loadValues.length < 2) return null;

  const hasEnergy = energyValues.length >= 2;
  const hasLoad = loadValues.length >= 2;

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <p className="text-sm font-semibold text-card-foreground">Energy & load trend</p>
        <p className="text-xs text-muted-foreground mt-0.5">Last {last14.length} check-ins</p>
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        <div className="flex gap-4">
          {hasEnergy && <Sparkline values={energyValues} color="#0202ff" label="Energy" />}
          {hasLoad && <Sparkline values={loadValues} color="#f59e0b" label="Load" />}
        </div>
        <div className="mt-3 flex items-center gap-4">
          {hasEnergy && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-[#0202ff] rounded" />
              <span className="text-[10px] text-muted-foreground">Energy</span>
            </div>
          )}
          {hasLoad && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-amber-400 rounded" />
              <span className="text-[10px] text-muted-foreground">Load (inverted)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}