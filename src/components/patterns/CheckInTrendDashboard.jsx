/**
 * CheckInTrendDashboard
 * Sidebar card with two tabs:
 *   1. Daily rhythm — trend chart from DailyCheckIn entries
 *   2. Leadership Index — assessment competency scores summary
 */
import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Activity, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const MEASURES = [
  { key: "energy",     label: "Energy",     color: "#f59e0b", scoreKey: "energy_score" },
  { key: "confidence", label: "Confidence", color: "#0202ff", scoreKey: "confidence_score" },
  { key: "focus",      label: "Focus",      color: "#10b981", scoreKey: "focus_score" },
  { key: "load",       label: "Load",       color: "#ef4444", scoreKey: "load_score", inverted: true },
  { key: "growth",     label: "Growth",     color: "#8b5cf6", scoreKey: "growth_score" },
];

const RANGE_OPTIONS = [
  { label: "7d",  days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "All", days: 999 },
];

// Competency display config for Leadership Index tab
const COMPETENCIES = [
  { key: "si_pct",   label: "Situational Intelligence", color: "#0202ff" },
  { key: "dm_pct",   label: "Decision Making",          color: "#10b981" },
  { key: "comm_pct", label: "Communication",             color: "#f59e0b" },
  { key: "rm_pct",   label: "Resource Management",       color: "#8b5cf6" },
  { key: "sm_pct",   label: "Stakeholder Management",    color: "#ef4444" },
  { key: "pm_pct",   label: "Performance Management",    color: "#06b6d4" },
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
  if (effectiveDir === "up") return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (effectiveDir === "down") return <TrendingDown className="w-3 h-3 text-rose-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
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

function DailyRhythmTab({ checkIns }) {
  const [rangeDays, setRangeDays] = useState(14);
  const [activeMeasures, setActiveMeasures] = useState(new Set(["energy", "confidence", "focus", "load", "growth"]));

  const toggleMeasure = (key) => {
    setActiveMeasures(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (rangeDays >= 999) return checkIns;
    const cutoff = subDays(new Date(), rangeDays);
    return checkIns.filter(r => r.check_in_date && parseISO(r.check_in_date) >= cutoff);
  }, [checkIns, rangeDays]);

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
        const point = { date: format(parseISO(date), rangeDays <= 14 ? "EEE d" : "MMM d") };
        MEASURES.forEach(m => {
          const sc = scores[m.key];
          if (sc?.length) point[m.key] = parseFloat(avg(sc).toFixed(1));
        });
        return point;
      });
  }, [filtered, rangeDays]);

  const stats = useMemo(() => {
    return MEASURES.map(m => {
      const vals = filtered.map(r => r[m.scoreKey]).filter(v => v != null);
      const a = avg(vals);
      const dir = trendDir(vals);
      return { ...m, avg: a != null ? parseFloat(a.toFixed(1)) : null, trend: dir };
    });
  }, [filtered]);

  return (
    <div className="space-y-4">
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
      <div className="grid grid-cols-5 gap-1.5">
        {stats.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMeasure(m.key)}
            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border transition-all ${
              activeMeasures.has(m.key) ? "border-transparent shadow-sm" : "border-border bg-muted/30 opacity-50"
            }`}
            style={activeMeasures.has(m.key) ? { backgroundColor: m.color + "15", borderColor: m.color + "40" } : {}}
          >
            <div className="flex items-center gap-0.5">
              <span className="text-xs font-bold text-foreground">{m.avg ?? "—"}</span>
              <TrendBadge dir={m.trend} inverted={m.inverted} />
            </div>
            <span className="text-[9px] text-muted-foreground font-medium leading-tight">{m.label}</span>
            <div className="w-4 h-0.5 rounded-full mt-0.5" style={{ backgroundColor: m.color }} />
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
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis domain={[1, 5]} tickCount={5} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={3} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            {MEASURES.filter(m => activeMeasures.has(m.key)).map(m => (
              <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={{ r: 2.5, fill: m.color, strokeWidth: 0 }} activeDot={{ r: 4 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">Need at least 2 days of data to draw a trend line.</p>
      )}
    </div>
  );
}

function LeadershipIndexTab({ assessment }) {
  if (!assessment) {
    return (
      <div className="text-center py-6 space-y-2">
        <Info className="w-7 h-7 text-muted-foreground mx-auto" />
        <p className="text-sm font-semibold text-foreground">No assessment yet</p>
        <p className="text-xs text-muted-foreground">Complete your Leadership Index assessment to see your competency scores.</p>
        <Link to="/Assessments" className="inline-block mt-2 text-xs font-semibold text-[#0202ff] hover:underline">
          Take assessment →
        </Link>
      </div>
    );
  }

  const scores = COMPETENCIES.map(c => ({
    ...c,
    pct: assessment[c.key] ?? assessment?.record?.[c.key] ?? null,
  })).filter(c => c.pct != null);

  const overall = assessment.overall_pct ?? null;
  const archetype = assessment.archetype_label ?? assessment.archetype ?? null;

  return (
    <div className="space-y-4">
      {/* Overall + archetype */}
      {(overall != null || archetype) && (
        <div className="bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl px-3 py-3">
          {overall != null && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Overall score</span>
              <span className="text-sm font-bold text-[#0202ff]">{Math.round(overall)}%</span>
            </div>
          )}
          {archetype && (
            <p className="text-xs font-semibold text-foreground">{archetype}</p>
          )}
        </div>
      )}

      {/* Competency bars */}
      {scores.length > 0 ? (
        <div className="space-y-2.5">
          {scores.map(c => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground truncate pr-2">{c.label}</span>
                <span className="text-[10px] font-semibold text-foreground flex-shrink-0">{Math.round(c.pct)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">No competency data available.</p>
      )}

      <Link to="/Assessments" className="block text-center text-xs font-semibold text-[#0202ff] hover:underline pt-1">
        View full results →
      </Link>
    </div>
  );
}

export default function CheckInTrendDashboard({ checkIns = [], assessment = null, updatePageContext }) {
  const [activeTab, setActiveTab] = useState("rhythm");

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Leadership rhythm trends</p>
            <p className="text-[10px] text-muted-foreground">Daily check-in signals · private to you</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          <button
            onClick={() => setActiveTab("rhythm")}
            className={`flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold mr-4 border-b-2 transition-colors ${
              activeTab === "rhythm"
                ? "border-[#0202ff] text-[#0202ff]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Daily rhythm
          </button>
          <button
            onClick={() => setActiveTab("index")}
            className={`flex items-center gap-1.5 px-1 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "index"
                ? "border-[#0202ff] text-[#0202ff]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Info className="w-3 h-3" />
            Leadership Index
          </button>
        </div>
      </div>

      <CardContent className="px-5 pt-4 pb-5">
        {activeTab === "rhythm" ? (
          <DailyRhythmTab checkIns={checkIns} />
        ) : (
          <LeadershipIndexTab assessment={assessment} />
        )}
      </CardContent>
    </Card>
  );
}