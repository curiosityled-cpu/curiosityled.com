/**
 * RhythmPulseChart — Rhythm Trends card with two tabs:
 *   • Daily Rhythm: 7-day sparkline (existing)
 *   • Trends: full interactive multi-line chart with date range + measure toggles + expand
 */
import React, { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { Maximize2, Minimize2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const MEASURES_LIGHT = [
  { key: "energy",     label: "Energy",     color: "#f59e0b", emoji: "⚡" },
  { key: "confidence", label: "Confidence", color: "#0202ff", emoji: "🎯" },
  { key: "focus",      label: "Focus",      color: "#10b981", emoji: "🔍" },
  { key: "load",       label: "Load",       color: "#ef4444", emoji: "🪨" },
  { key: "growth",     label: "Growth",     color: "#8b5cf6", emoji: "🌱" },
];
const MEASURES_DARK = [
  { key: "energy",     label: "Energy",     color: "#d97706", emoji: "⚡" },
  { key: "confidence", label: "Confidence", color: "#6c84e8", emoji: "🎯" },
  { key: "focus",      label: "Focus",      color: "#34c48a", emoji: "🔍" },
  { key: "load",       label: "Load",       color: "#f07070", emoji: "🪨" },
  { key: "growth",     label: "Growth",     color: "#a78bfa", emoji: "🌱" },
];

const RANGES = [
  { label: "7d",  days: 7  },
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
  const half = Math.ceil(pts.length / 2);
  const diff = avg(pts.slice(half)) - avg(pts.slice(0, half));
  if (diff > 0.3) return "up";
  if (diff < -0.3) return "down";
  return "stable";
}

function buildDayMap(checkIns, MEASURES) {
  const days = {};
  checkIns.forEach(r => {
    if (!r.check_in_date) return;
    if (!days[r.check_in_date]) days[r.check_in_date] = {};
    MEASURES.forEach(m => {
      const score = r[`${m.key}_score`];
      if (score != null) {
        if (!days[r.check_in_date][m.key]) days[r.check_in_date][m.key] = [];
        days[r.check_in_date][m.key].push(score);
      }
    });
  });
  return days;
}

// ── Sparkline tooltip (compact)
const SparkTooltip = ({ active, payload, label, MEASURES }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs min-w-[120px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map(p => {
        const m = MEASURES.find(m => m.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.stroke }} />
              <span className="text-muted-foreground">{m?.label}</span>
            </div>
            <span className="font-bold text-foreground">{p.value}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Full trend chart tooltip
const TrendTooltip = ({ active, payload, label, MEASURES }) => {
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

// ── The full trends view (used both inline and in expanded modal)
function TrendsView({ checkIns, MEASURES, gridColor, compact = false }) {
  const [rangeDays, setRangeDays] = useState(14);
  const [activeKeys, setActiveKeys] = useState(new Set(MEASURES.map(m => m.key)));

  const cutoff = subDays(new Date(), rangeDays).toISOString().slice(0, 10);
  const filtered = checkIns.filter(r => r.check_in_date >= cutoff);
  const dayMap = buildDayMap(filtered, MEASURES);

  const chartData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => {
      const point = {
        date: format(parseISO(date), rangeDays <= 7 ? "EEE" : "MMM d"),
        fullDate: date,
      };
      MEASURES.forEach(m => {
        if (scores[m.key]?.length) point[m.key] = avg(scores[m.key]);
      });
      return point;
    });

  const stats = MEASURES.map(m => ({
    ...m,
    avg: avg(chartData.map(d => d[m.key]).filter(v => v != null)),
    trend: getTrend(chartData, m.key),
  }));

  const trendIcon = t => t === "up" ? "↑" : t === "down" ? "↓" : "→";
  const trendColor = t => t === "up" ? "text-emerald-600" : t === "down" ? "text-red-500" : "text-muted-foreground";

  const toggleMeasure = (key) => {
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
        Not enough data yet — complete a few more check-ins.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Range selector + day count */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] text-muted-foreground">{chartData.length} check-in {chartData.length === 1 ? 'day' : 'days'}</p>
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
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
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
      <ResponsiveContainer width="100%" height={compact ? 140 : 180}>
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
          <Tooltip content={<TrendTooltip MEASURES={MEASURES} />} />
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
      <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border">
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

// ── Main component
export default function RhythmPulseChart({ checkIns = [] }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [activeTab, setActiveTab] = useState("daily");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Close expanded on Escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  if (!checkIns || checkIns.length === 0) return null;

  const MEASURES = isDark ? MEASURES_DARK : MEASURES_LIGHT;
  const gridColor = isDark ? "hsl(222 11% 22%)" : "hsl(var(--border))";

  // ── Build 7-day sparkline data
  const dayMap = buildDayMap(checkIns, MEASURES);
  const sparkData = Object.entries(dayMap)
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

  const statStrip = MEASURES.map(m => {
    const all = checkIns.map(r => r[`${m.key}_score`]).filter(x => x != null);
    const a = avg(all);
    return { ...m, avg: a };
  });

  const hasTrendsData = checkIns.length >= 2;

  return (
    <>
      <div className="bg-card rounded-2xl border border-border px-4 py-4">
        {/* Header with tabs */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                activeTab === "daily"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Rhythm
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                activeTab === "trends"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rhythm Trends
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[10px] text-muted-foreground">1=low · 3=mid · 5=strong</p>
            {activeTab === "trends" && hasTrendsData && (
              <button
                onClick={() => setExpanded(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Expand chart"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Daily Rhythm tab — sparkline */}
        {activeTab === "daily" && (
          <>
            {sparkData.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                Complete your first check-in to see your rhythm.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={sparkData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
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
                  <Tooltip content={<SparkTooltip MEASURES={MEASURES} />} />
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
            )}

            {/* Legend + averages */}
            <div className="flex gap-3 mt-3 flex-wrap">
              {statStrip.map(m => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  {m.avg != null && <span className="text-[10px] font-semibold text-foreground">{m.avg}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Rhythm Trends tab — full interactive chart */}
        {activeTab === "trends" && (
          <TrendsView checkIns={checkIns} MEASURES={MEASURES} gridColor={gridColor} compact />
        )}
      </div>

      {/* Expanded modal overlay */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-4 md:inset-10 bg-card rounded-2xl border border-border shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">Rhythm Trends</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Select measures and date range to explore your patterns</p>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Modal content */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <TrendsView checkIns={checkIns} MEASURES={MEASURES} gridColor={gridColor} compact={false} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}