/**
 * CheckInTrendDashboard
 * Full trend visualization from DailyCheckIn entries (numeric 1–5 scores)
 * + Leadership Index Assessment competency overlay.
 */
import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Activity, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

// ── Measure config ────────────────────────────────────────────────────────────
const MEASURES = [
  { key: "energy",     label: "Energy",     color: "#f59e0b", scoreKey: "energy_score" },
  { key: "confidence", label: "Confidence", color: "#0202ff", scoreKey: "confidence_score" },
  { key: "focus",      label: "Focus",      color: "#10b981", scoreKey: "focus_score" },
  { key: "load",       label: "Load",       color: "#ef4444", scoreKey: "load_score",    inverted: true },
  { key: "growth",     label: "Growth",     color: "#8b5cf6", scoreKey: "growth_score" },
];

const RANGE_OPTIONS = [
  { label: "7d",  days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "All", days: 999 },
];

function avg(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function trendDir(vals) {
  if (vals.length < 4) return "stable";
  const h = Math.floor(vals.length / 2);
  const a1 = avg(vals.slice(0, h));
  const a2 = avg(vals.slice(h));
  if (a2 == null || a1 == null) return "stable";
  if (a2 - a1 > 0.25) return "up";
  if (a1 - a2 > 0.25) return "down";
  return "stable";
}

function TrendBadge({ dir, inverted = false }) {
  const effectiveDir = inverted ? (dir === "up" ? "down" : dir === "down" ? "up" : "stable") : dir;
  if (effectiveDir === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (effectiveDir === "down") return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const PRIMARY_METRICS = new Set(["energy", "focus", "load"]);

// ── Main component ────────────────────────────────────────────────────────────
export default function CheckInTrendDashboard({ checkIns = [], assessment = null }) {
  const [rangeDays, setRangeDays] = useState(14);
  const [activeMeasures, setActiveMeasures] = useState(new Set(["energy", "focus", "load"]));
  const [showExtra, setShowExtra] = useState(false);

  const toggleMeasure = (key) => {
    setActiveMeasures(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const handleToggleExtra = () => {
    setShowExtra(v => {
      const next = !v;
      setActiveMeasures(prev => {
        const next2 = new Set(prev);
        if (next) { next2.add("confidence"); next2.add("growth"); }
        else { next2.delete("confidence"); next2.delete("growth"); }
        return next2;
      });
      return next;
    });
  };

  // Filter check-ins to selected range
  const filtered = useMemo(() => {
    if (rangeDays >= 999) return checkIns;
    const cutoff = subDays(new Date(), rangeDays);
    return checkIns.filter(r => {
      if (!r.check_in_date) return false;
      return parseISO(r.check_in_date) >= cutoff;
    });
  }, [checkIns, rangeDays]);

  // Group by date, average morning + evening
  const chartData = useMemo(() => {
    const days = {};
    filtered.forEach(r => {
      const date = r.check_in_date;
      if (!date) return;
      if (!days[date]) days[date] = {};
      MEASURES.forEach(m => {
        const score = r[m.scoreKey];
        if (score != null) {
          if (!days[date][m.key]) days[date][m.key] = [];
          days[date][m.key].push(score);
        }
      });
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => {
        const point = {
          date: format(parseISO(date), rangeDays <= 14 ? "EEE d" : "MMM d"),
          rawDate: date,
          count: Math.max(...MEASURES.map(m => scores[m.key]?.length ?? 0)),
        };
        MEASURES.forEach(m => {
          const sc = scores[m.key];
          if (sc?.length) point[m.key] = parseFloat(avg(sc).toFixed(1));
        });
        return point;
      });
  }, [filtered, rangeDays]);

  // Stat strip — averages + trend direction
  const stats = useMemo(() => {
    return MEASURES.map(m => {
      const vals = filtered.map(r => r[m.scoreKey]).filter(v => v != null);
      const a = avg(vals);
      const dir = trendDir(vals);
      return { ...m, avg: a != null ? parseFloat(a.toFixed(1)) : null, trend: dir, vals };
    });
  }, [filtered]);

  // Daily variability — std dev per measure
  const variability = useMemo(() => {
    return MEASURES.map(m => {
      const vals = filtered.map(r => r[m.scoreKey]).filter(v => v != null);
      if (vals.length < 2) return { ...m, stdDev: null };
      const a = avg(vals);
      const sd = Math.sqrt(vals.reduce((s, v) => s + (v - a) ** 2, 0) / vals.length);
      return { ...m, stdDev: parseFloat(sd.toFixed(2)) };
    });
  }, [filtered]);

  const hasCheckInData = checkIns.length >= 1;

  if (!hasCheckInData) {
    return (
      <Card className="rounded-2xl border border-dashed border-border bg-card">
        <CardContent className="py-10 text-center">
          <Activity className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">No trend data yet</p>
          <p className="text-xs text-muted-foreground">Complete a few daily check-ins to see your trends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Rhythm Trends</p>
            <p className="text-[10px] text-muted-foreground">Daily check-in signals · private to you</p>
          </div>
        </div>
        <Link
          to="/Insights"
          className="flex items-center gap-1 text-[10px] text-[#0202ff] hover:underline flex-shrink-0"
        >
          Leadership Index <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>

      <CardContent className="px-5 pt-4 pb-5 space-y-5">
            {/* Range selector */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
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

            {/* Stat strip */}
            <div className="grid grid-cols-5 gap-2">
              {stats.map(m => (
                <button
                  key={m.key}
                  onClick={() => toggleMeasure(m.key)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
                    activeMeasures.has(m.key)
                      ? "border-transparent shadow-sm"
                      : "border-border bg-muted/30 opacity-50"
                  }`}
                  style={activeMeasures.has(m.key) ? { backgroundColor: m.color + "15", borderColor: m.color + "40" } : {}}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-foreground">{m.avg ?? "—"}</span>
                    <TrendBadge dir={m.trend} inverted={m.inverted} />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">{m.label}</span>
                  <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: m.color }} />
                </button>
              ))}
            </div>

            {/* Empty range notice */}
            {chartData.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3 bg-muted/40 rounded-xl">
                No check-ins in the last {rangeDays === 999 ? "recorded period" : `${rangeDays} days`}. Try a wider range or complete a check-in today.
              </p>
            )}

            {/* Line chart */}
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
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
                  <ReferenceLine y={3} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: "baseline", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  {MEASURES.filter(m => activeMeasures.has(m.key)).map(m => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      name={m.label}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Need at least 2 days of data to draw a trend line.</p>
            )}

            {/* Variability row */}
            {variability.some(v => v.stdDev != null) && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Day-to-day variability</p>
                <div className="space-y-1.5">
                  {variability.filter(v => v.stdDev != null && activeMeasures.has(v.key)).map(v => {
                    const pct = Math.min(100, (v.stdDev / 2) * 100);
                    const label = v.stdDev < 0.5 ? "Very consistent" : v.stdDev < 1 ? "Moderate fluctuation" : "High variability";
                    return (
                      <div key={v.key} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                        <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{v.label}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: v.color, opacity: 0.6 }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-24 text-right flex-shrink-0">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Check-in frequency heatmap — daily bar */}
            {chartData.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Check-in frequency</p>
                <ResponsiveContainer width="100%" height={40}>
                  <BarChart data={chartData} margin={{ top: 0, right: 4, left: -22, bottom: 0 }} barSize={10}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                            <p className="font-semibold text-foreground mb-1">{label}</p>
                            <p className="text-muted-foreground">{payload[0].value} check-in session{payload[0].value !== 1 ? "s" : ""}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="Check-ins" fill="#0202ff" opacity={0.3} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Show Confidence & Growth expand control */}
            <button
              onClick={handleToggleExtra}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showExtra ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showExtra ? "Hide Confidence & Growth" : "+ Show Confidence & Growth"}
            </button>
      </CardContent>
    </Card>
  );
}