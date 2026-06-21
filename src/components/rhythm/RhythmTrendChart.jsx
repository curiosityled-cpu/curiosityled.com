/**
 * RhythmTrendChart — Interactive multi-line chart for the Daily Rhythm tab.
 * Shows all 5 leadership measures over a selectable date range.
 * Reads from localStorage-backed checkInStore for reliability.
 */
import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend
} from "recharts";
import { format, parseISO, subDays } from "date-fns";

const MEASURES = [
  { key: "energy",     label: "Energy",     color: "#f59e0b", emoji: "⚡" },
  { key: "confidence", label: "Confidence", color: "#0202ff", emoji: "🎯" },
  { key: "focus",      label: "Focus",      color: "#10b981", emoji: "🔍" },
  { key: "load",       label: "Load",       color: "#ef4444", emoji: "🪨" },
  { key: "growth",     label: "Growth",     color: "#8b5cf6", emoji: "🌱" },
];

const RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

function avg(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? parseFloat((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)) : null;
}

function getTrend(data, key) {
  const pts = data.map(d => d[key]).filter(v => v != null);
  if (pts.length < 2) return null;
  const first = pts.slice(0, Math.ceil(pts.length / 2));
  const last = pts.slice(Math.floor(pts.length / 2));
  const diff = avg(last) - avg(first);
  if (diff > 0.3) return "up";
  if (diff < -0.3) return "down";
  return "stable";
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map(p => {
        const m = MEASURES.find(m => m.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke }} />
              <span className="text-muted-foreground">{m?.emoji} {m?.label}</span>
            </div>
            <span className="font-bold text-foreground">{p.value}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function RhythmTrendChart({ checkIns = [] }) {
  const [rangeDays, setRangeDays] = useState(14);
  const [activeKeys, setActiveKeys] = useState(new Set(MEASURES.map(m => m.key)));
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!checkIns || checkIns.length === 0) return null;

  // Filter to range
  const cutoff = subDays(new Date(), rangeDays).toISOString().slice(0, 10);
  const filtered = checkIns.filter(r => r.check_in_date >= cutoff);

  // Group by date, average morning+evening
  const dayMap = {};
  filtered.forEach(r => {
    if (!r.check_in_date) return;
    if (!dayMap[r.check_in_date]) dayMap[r.check_in_date] = {};
    MEASURES.forEach(m => {
      const score = r[`${m.key}_score`];
      if (score != null) {
        if (!dayMap[r.check_in_date][m.key]) dayMap[r.check_in_date][m.key] = [];
        dayMap[r.check_in_date][m.key].push(score);
      }
    });
  });

  const chartData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => {
      const point = { date: format(parseISO(date), rangeDays <= 7 ? "EEE" : "MMM d"), fullDate: date };
      MEASURES.forEach(m => {
        if (scores[m.key]?.length) point[m.key] = avg(scores[m.key]);
      });
      return point;
    });

  if (chartData.length === 0) return null;

  // Summary stats
  const stats = MEASURES.map(m => {
    const vals = chartData.map(d => d[m.key]).filter(v => v != null);
    const trend = getTrend(chartData, m.key);
    return { ...m, avg: avg(vals), trend };
  });

  const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
  const trendColor = (t) => t === "up" ? "text-emerald-600" : t === "down" ? "text-red-500" : "text-muted-foreground";

  const toggleMeasure = (key) => {
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least 1
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const gridColor = isDark ? "hsl(222 11% 22%)" : "hsl(var(--border))";

  return (
    <div className="bg-card rounded-2xl border border-border px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Rhythm over time</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{chartData.length} check-in days shown</p>
        </div>
        {/* Range selector */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                rangeDays === r.days
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Measure toggles */}
      <div className="flex flex-wrap gap-1.5">
        {MEASURES.map(m => {
          const active = activeKeys.has(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggleMeasure(m.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                active
                  ? "border-transparent text-white"
                  : "border-border bg-card text-muted-foreground opacity-50"
              }`}
              style={active ? { backgroundColor: m.color } : {}}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={3} stroke={gridColor} strokeDasharray="4 4" strokeWidth={1.5} />
          {MEASURES.filter(m => activeKeys.has(m.key)).map(m => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={2}
              dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-1 pt-1 border-t border-border">
        {stats.map(m => (
          <div key={m.key} className="flex flex-col items-center gap-0.5">
            <span className="text-sm">{m.emoji}</span>
            {m.avg != null ? (
              <>
                <span className="text-xs font-bold text-foreground">{m.avg}</span>
                <span className={`text-[10px] font-semibold ${trendColor(m.trend)}`}>{trendIcon(m.trend)}</span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}