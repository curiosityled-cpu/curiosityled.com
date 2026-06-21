/**
 * RhythmPulseChart — Interactive 5-measure leadership rhythm chart.
 * Shows last N days of energy, confidence, focus, load, growth trends.
 * Supports metric toggling and an expanded full-screen modal view.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";
import { format, parseISO } from "date-fns";
import { Maximize2, X } from "lucide-react";

const MEASURES = [
  { key: "energy",     label: "Energy",     color: "#f59e0b" },
  { key: "confidence", label: "Confidence", color: "#0202ff" },
  { key: "focus",      label: "Focus",      color: "#10b981" },
  { key: "load",       label: "Load",       color: "#ef4444" },
  { key: "growth",     label: "Growth",     color: "#8b5cf6" },
];

const RANGE_OPTIONS = [
  { label: "7d",  days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

function avg(arr) {
  const v = arr.filter(Boolean);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function buildChartData(checkIns, maxDays) {
  const days = {};
  checkIns.forEach(r => {
    if (!r.check_in_date) return;
    if (!days[r.check_in_date]) days[r.check_in_date] = {};
    MEASURES.forEach(m => {
      const score = r[`${m.key}_score`];
      if (score) {
        if (!days[r.check_in_date][m.key]) days[r.check_in_date][m.key] = [];
        days[r.check_in_date][m.key].push(score);
      }
    });
  });

  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-maxDays)
    .map(([date, scores]) => {
      const point = {
        date: format(parseISO(date), maxDays <= 14 ? "EEE d" : "MMM d"),
        rawDate: date,
      };
      MEASURES.forEach(m => {
        const sc = scores[m.key];
        if (sc?.length) point[m.key] = parseFloat(avg(sc).toFixed(1));
      });
      return point;
    });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{MEASURES.find(m => m.key === p.dataKey)?.label}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function ChartContent({ chartData, activeMeasures, toggleMeasure, rangeDays, setRangeDays, height = 150, showControls = true }) {
  const statStrip = useMemo(() => {
    return MEASURES.map(m => {
      const vals = chartData.map(r => r[m.key]).filter(Boolean);
      return { ...m, avg: vals.length ? parseFloat(avg(vals).toFixed(1)) : null };
    });
  }, [chartData]);

  return (
    <div className="space-y-3">
      {/* Range + metric toggles */}
      {showControls && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Range selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r.label}
                onClick={() => setRangeDays(r.days)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  rangeDays === r.days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Metric toggles */}
          <div className="flex gap-1.5 flex-wrap">
            {MEASURES.map(m => {
              const active = activeMeasures.has(m.key);
              const stat = statStrip.find(s => s.key === m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => toggleMeasure(m.key)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                    active ? "text-foreground" : "opacity-40 border-transparent bg-transparent text-muted-foreground"
                  }`}
                  style={active ? { borderColor: m.color + "60", backgroundColor: m.color + "12" } : {}}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  {m.label}
                  {stat?.avg != null && <span className="font-bold" style={{ color: active ? m.color : undefined }}>{stat.avg}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No check-ins recorded yet. Complete a check-in to start tracking.</p>
      ) : chartData.length < 2 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Need at least 2 days of data to draw a trend line.</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1, 5]}
              tickCount={5}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={3} stroke="hsl(var(--border))" strokeDasharray="4 4"
              label={{ value: "baseline", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            />
            {MEASURES.filter(m => activeMeasures.has(m.key)).map(m => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                stroke={m.color}
                strokeWidth={2}
                dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function RhythmPulseChart({ checkIns = [] }) {
  const [rangeDays, setRangeDays] = useState(7);
  const [activeMeasures, setActiveMeasures] = useState(new Set(["energy", "confidence", "focus", "load", "growth"]));
  const [expanded, setExpanded] = useState(false);

  if (!checkIns || checkIns.length === 0) return null;

  const toggleMeasure = (key) => {
    setActiveMeasures(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const chartData = buildChartData(checkIns, rangeDays);

  return (
    <>
      <div className="bg-card rounded-2xl border border-border px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Leadership rhythm · recent trend</p>
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="Expand chart"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        </div>

        <ChartContent
          chartData={chartData}
          activeMeasures={activeMeasures}
          toggleMeasure={toggleMeasure}
          rangeDays={rangeDays}
          setRangeDays={setRangeDays}
          height={140}
          showControls={true}
        />
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setExpanded(false)}>
          <div
            className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Leadership Rhythm</p>
                <p className="text-[10px] text-muted-foreground">Daily check-in trends · 1=low · 3=baseline · 5=strong</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <ChartContent
                chartData={buildChartData(checkIns, rangeDays)}
                activeMeasures={activeMeasures}
                toggleMeasure={toggleMeasure}
                rangeDays={rangeDays}
                setRangeDays={setRangeDays}
                height={320}
                showControls={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}