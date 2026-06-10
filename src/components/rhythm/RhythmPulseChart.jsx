/**
 * RhythmPulseChart — 5-measure leadership rhythm sparkline from DailyCheckIn history.
 * Shows last 7 days of energy, confidence, focus, load, growth trends.
 */
import React from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { format, parseISO } from "date-fns";

// Using CSS custom properties via inline style is not possible on SVG stroke,
// so we define two palettes and pick based on document dark class at render time.
const MEASURES_LIGHT = [
  { key: "energy",     label: "Energy",     color: "#f59e0b" },
  { key: "confidence", label: "Confidence", color: "#0202ff" },
  { key: "focus",      label: "Focus",      color: "#10b981" },
  { key: "load",       label: "Load",       color: "#ef4444" },
  { key: "growth",     label: "Growth",     color: "#8b5cf6" },
];
// Desaturated ~25% versions for dark mode — softer on dark bg but still distinct
const MEASURES_DARK = [
  { key: "energy",     label: "Energy",     color: "#d97706" },
  { key: "confidence", label: "Confidence", color: "#6c84e8" },
  { key: "focus",      label: "Focus",      color: "#34c48a" },
  { key: "load",       label: "Load",       color: "#f07070" },
  { key: "growth",     label: "Growth",     color: "#a78bfa" },
];

function avg(arr) {
  const v = arr.filter(Boolean);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export default function RhythmPulseChart({ checkIns = [] }) {
  if (!checkIns || checkIns.length === 0) return null;
  const isDark = document.documentElement.classList.contains('dark');
  const MEASURES = isDark ? MEASURES_DARK : MEASURES_LIGHT;

  // Group by date, average scores across morning + evening entries
  const days = {};
  checkIns.forEach(r => {
    if (!days[r.check_in_date]) days[r.check_in_date] = {};
    MEASURES.forEach(m => {
      const score = r[`${m.key}_score`];
      if (score) {
        if (!days[r.check_in_date][m.key]) days[r.check_in_date][m.key] = [];
        days[r.check_in_date][m.key].push(score);
      }
    });
  });

  const chartData = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, scores]) => {
      const point = { date: format(parseISO(date), "EEE") };
      MEASURES.forEach(m => {
        const sc = scores[m.key];
        if (sc?.length) point[m.key] = parseFloat(avg(sc).toFixed(1));
      });
      return point;
    });

  if (chartData.length === 0) return null;

  // Compute current averages for the mini stat strip
  const statStrip = MEASURES.map(m => {
    const allScores = checkIns.map(r => r[`${m.key}_score`]).filter(Boolean);
    const a = avg(allScores);
    return { ...m, avg: a ? parseFloat(a.toFixed(1)) : null };
  });

  return (
    <div className="bg-card rounded-2xl border border-border px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Leadership rhythm · recent trend</p>
        <p className="text-[10px] text-muted-foreground">1=low · 3=baseline · 5=strong</p>
      </div>

      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[1, 5]}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickCount={3}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: `1px solid ${isDark ? 'hsl(222 11% 28%)' : 'hsl(var(--border))'}`,
              backgroundColor: isDark ? 'hsl(222 13% 17%)' : 'hsl(var(--card))',
              color: isDark ? 'hsl(220 16% 93%)' : 'hsl(var(--foreground))',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : undefined,
            }}
            formatter={(val, name) => [val, MEASURES.find(m => m.key === name)?.label || name]}
          />
          <ReferenceLine y={3} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          {MEASURES.map(m => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={m.color}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend + averages */}
      <div className="flex gap-3 mt-3 flex-wrap">
        {statStrip.map(m => (
          <div key={m.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
            {m.avg && <span className="text-[10px] font-semibold text-foreground">{m.avg}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}