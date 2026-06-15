/**
 * CheckInTrendDashboard
 * Full trend visualization from DailyCheckIn entries (numeric 1–5 scores)
 * + Leadership Index Assessment competency overlay.
 */
import React, { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, CartesianGrid
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Activity, Brain, Target, ExternalLink } from "lucide-react";
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

// Leadership Index competencies from Assessment entity
// Benchmarks = Target band (50th–75th pct) per sector
// Source: Press Ganey/ACHE/Korn Ferry (Healthcare, n=12,500),
//         Korn Ferry/DDI/Fortune 500 (Corporate, n=28,000),
//         OPM/Partnership for Public Service (Government, n=15,000)
const COMPETENCY_BASE = [
  { key: "si",   label: "Situational Intelligence", pctKey: "si_pct",   color: "#0202ff" },
  { key: "dm",   label: "Decision Making",          pctKey: "dm_pct",   color: "#10b981" },
  { key: "comm", label: "Communication",            pctKey: "comm_pct", color: "#f59e0b" },
  { key: "rm",   label: "Resource Mgmt",            pctKey: "rm_pct",   color: "#8b5cf6" },
  { key: "sm",   label: "Stakeholder Mgmt",         pctKey: "sm_pct",   color: "#ef4444" },
  { key: "pm",   label: "Performance Mgmt",         pctKey: "pm_pct",   color: "#06b6d4" },
];

// Target-band benchmarks by sector (min / target / exceptional)
// Industry differentiators applied per document:
//   Healthcare: DM +4, SI +3 (crisis mgmt emphasis)
//   Government: SM +3, RM -3 (budget constraints)
//   Corporate:  PM +3, Comm +3 (exec presence, results orientation)
const SECTOR_BENCHMARKS = {
  Healthcare: { si: { min: 58, target: 68, exceptional: 85 }, dm: { min: 62, target: 72, exceptional: 88 }, comm: { min: 57, target: 66, exceptional: 83 }, rm: { min: 55, target: 64, exceptional: 81 }, sm: { min: 58, target: 67, exceptional: 84 }, pm: { min: 56, target: 65, exceptional: 82 } },
  "Corporate/Private": { si: { min: 55, target: 65, exceptional: 82 }, dm: { min: 56, target: 66, exceptional: 83 }, comm: { min: 60, target: 70, exceptional: 87 }, rm: { min: 57, target: 67, exceptional: 84 }, sm: { min: 57, target: 66, exceptional: 83 }, pm: { min: 60, target: 70, exceptional: 87 } },
  Government: { si: { min: 53, target: 63, exceptional: 80 }, dm: { min: 54, target: 64, exceptional: 81 }, comm: { min: 56, target: 65, exceptional: 82 }, rm: { min: 50, target: 59, exceptional: 76 }, sm: { min: 60, target: 70, exceptional: 86 }, pm: { min: 55, target: 64, exceptional: 81 } },
  // Cross-industry average (default)
  default: { si: { min: 55, target: 65, exceptional: 82 }, dm: { min: 57, target: 67, exceptional: 84 }, comm: { min: 58, target: 67, exceptional: 84 }, rm: { min: 54, target: 63, exceptional: 80 }, sm: { min: 58, target: 67, exceptional: 84 }, pm: { min: 57, target: 66, exceptional: 83 } },
};

function getBenchmarks(sector) {
  const s = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS.default;
  return COMPETENCY_BASE.map(c => ({ ...c, ...s[c.key] }));
}

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

// ── Main component ────────────────────────────────────────────────────────────
export default function CheckInTrendDashboard({ checkIns = [], assessment = null }) {
  const [rangeDays, setRangeDays] = useState(14);
  const [activeMeasures, setActiveMeasures] = useState(new Set(["energy", "focus", "load"]));
  const [tab, setTab] = useState("rhythm"); // "rhythm" | "assessment"

  const toggleMeasure = (key) => {
    setActiveMeasures(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
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

  // Derive sector from assessment record field or record contract
  // Normalize "Not specified" / blank strings to null so we fall back to default benchmarks
  const rawSector = assessment?.record?.sector || assessment?.sector || null;
  const sector = (rawSector && rawSector !== "Not specified" && rawSector !== "not specified") ? rawSector : null;
  const COMPETENCIES = useMemo(() => getBenchmarks(sector), [sector]);

  // Assessment radar data
  const radarData = useMemo(() => {
    if (!assessment) return [];
    return COMPETENCIES.map(c => ({
      label: c.label,
      score: assessment[c.pctKey] ?? 0,
      benchmark: c.target,
      fullMark: 100,
    }));
  }, [assessment, COMPETENCIES]);

  const hasCheckInData = checkIns.length >= 1;
  const hasAssessment = assessment != null;

  if (!hasCheckInData && !hasAssessment) {
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
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Leadership rhythm trends</p>
            <p className="text-[10px] text-muted-foreground">Daily check-in signals · private to you</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setTab("rhythm")}
            className={`flex items-center gap-1.5 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === "rhythm" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Daily rhythm
          </button>
          <button
            onClick={() => setTab("assessment")}
            className={`flex items-center gap-1.5 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === "assessment" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Brain className="w-3.5 h-3.5" /> Leadership Index
          </button>
        </div>
      </div>

      <CardContent className="px-5 pt-4 pb-5 space-y-5">

        {/* ── RHYTHM TAB ── */}
        {tab === "rhythm" && (
          <>
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
                    <Bar
                      dataKey="count"
                      name="Check-ins"
                      fill="#0202ff"
                      opacity={0.3}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* ── ASSESSMENT TAB — no assessment yet ── */}
        {tab === "assessment" && !hasAssessment && (
          <div className="py-8 text-center space-y-3">
            <Brain className="w-9 h-9 text-muted mx-auto" />
            <p className="text-sm font-semibold text-foreground">No Leadership Index assessment yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Complete a Leadership Index assessment to see your competency scores benchmarked against industry data.
            </p>
            <Link
              to="/Insights"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0202ff] hover:underline"
            >
              Go to Insights <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* ── ASSESSMENT TAB ── */}
        {tab === "assessment" && hasAssessment && (
          <>
            {/* Overall score */}
            <div className="flex items-center gap-4 p-4 bg-[#0202ff]/5 rounded-xl border border-[#0202ff]/15">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-[#0202ff]">{assessment.overall_pct ?? "—"}%</span>
                <span className="text-[10px] text-muted-foreground">Overall</span>
              </div>
              <div className="flex-1 min-w-0">
                {assessment.archetype_label && (
                  <p className="text-sm font-semibold text-foreground">{assessment.archetype_label}</p>
                )}
                {assessment.band_overall && (
                  <p className="text-xs text-muted-foreground">{assessment.band_overall}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leadership Index Assessment · {assessment.submission_ts ? format(parseISO(assessment.submission_ts), "MMM d, yyyy") : "on file"}
                </p>
              </div>
            </div>

            {/* Radar chart */}
            {radarData.length > 0 && (
              <>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[#0202ff] rounded" />Your score</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-amber-400 rounded opacity-80" />Industry benchmark</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name="Industry benchmark"
                      dataKey="benchmark"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.08}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#0202ff"
                      fill="#0202ff"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        // find full competency data
                        const comp = COMPETENCIES.find(c => c.label === d.label);
                        return (
                          <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
                            <p className="font-semibold text-foreground">{d.label}</p>
                            <p className="text-[#0202ff] font-bold">Your score: {d.score}%</p>
                            {comp && <>
                              <p className="text-rose-400">Min acceptable: {comp.min}%</p>
                              <p className="text-amber-500">Target: {comp.target}%</p>
                              <p className="text-emerald-500">Exceptional: {comp.exceptional}%</p>
                            </>}
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </>
            )}

            {/* Sector label */}
            {sector && (
              <p className="text-[10px] text-muted-foreground">
                Benchmarks: <span className="font-semibold text-foreground">{sector}</span> industry (50th–75th percentile target band)
              </p>
            )}
            {!sector && (
              <p className="text-[10px] text-muted-foreground">Benchmarks: cross-industry average (50th–75th percentile target band)</p>
            )}

            {/* Competency bars */}
            <div className="space-y-3">
              {COMPETENCIES.map(c => {
                const val = assessment[c.pctKey];
                if (val == null) return null;
                const aboveTarget = val >= c.target;
                const aboveMin = val >= c.min;
                const bandLabel = val >= c.exceptional ? "Exceptional" : val >= c.target ? "On target" : val >= c.min ? "Developing" : "Needs focus";
                const bandColor = val >= c.exceptional ? "text-emerald-600" : val >= c.target ? "text-[#0202ff]" : val >= c.min ? "text-amber-600" : "text-rose-500";
                return (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground font-medium">{c.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium ${bandColor}`}>{bandLabel}</span>
                        <span className="text-xs font-bold text-foreground">{val}%</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-visible">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${val}%`, backgroundColor: c.color }}
                      />
                      {/* Min acceptable marker (25th pct) */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-px h-3.5 bg-rose-400 opacity-70 rounded-full"
                        style={{ left: `${c.min}%` }}
                        title={`Minimum acceptable: ${c.min}%`}
                      />
                      {/* Target marker (50th–75th pct) */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-amber-400 rounded-full"
                        style={{ left: `${c.target}%` }}
                        title={`Industry target: ${c.target}%`}
                      />
                      {/* Exceptional marker (90th pct) */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-px h-3.5 bg-emerald-400 opacity-70 rounded-full"
                        style={{ left: `${c.exceptional}%` }}
                        title={`Exceptional: ${c.exceptional}%`}
                      />
                    </div>
                  </div>
                );
              }).filter(Boolean)}

              {/* Benchmark legend */}
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground"><span className="w-px h-3 bg-rose-400 opacity-70 inline-block rounded-full" />Min acceptable</span>
                <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground"><span className="w-0.5 h-3.5 bg-amber-400 inline-block rounded-full" />Target</span>
                <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground"><span className="w-px h-3 bg-emerald-400 opacity-70 inline-block rounded-full" />Exceptional</span>
              </div>
            </div>

            {/* Link to full Insights */}
            <Link
              to="/Insights"
              className="flex items-center justify-between p-3 rounded-xl border border-[#0202ff]/20 bg-[#0202ff]/5 hover:bg-[#0202ff]/10 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
                <span className="text-xs font-semibold text-[#0202ff]">View full Leadership Index report</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[#0202ff] opacity-60 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* Cross-reference note */}
            {hasCheckInData && (
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">How this connects to your daily rhythm</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {(() => {
                        const focusAvg = avg(filtered.map(r => r.focus_score).filter(Boolean));
                        const energyAvg = avg(filtered.map(r => r.energy_score).filter(Boolean));
                        const weakComp = COMPETENCIES.find(c => (assessment[c.pctKey] ?? 100) < 55);
                        const parts = [];
                        if (focusAvg != null) parts.push(`Your focus is averaging ${focusAvg.toFixed(1)}/5 in check-ins`);
                        if (energyAvg != null) parts.push(`energy is at ${energyAvg.toFixed(1)}/5`);
                        if (weakComp) parts.push(`your assessment flags ${weakComp.label} as an area to develop`);
                        return parts.length > 0 ? parts.join(", ") + "." : "Check-in data and assessment results are both being tracked.";
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}