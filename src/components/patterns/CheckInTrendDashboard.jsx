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
import { TrendingUp, TrendingDown, Minus, Activity, Brain, Target, ExternalLink, Maximize2, X, CheckCircle2, AlertCircle, MinusCircle, Clock, ListTodo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import StreakDisplay from "@/components/rhythm/StreakDisplay";

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

// ── Rhythm-derived energy signal ─────────────────────────────────────────────
// Reads from the Daily Rhythm tab's stats/variability so it updates with the
// selected range and reflects exactly what the chart is showing.
function buildRhythmSignal(stats, variability, rangeDays) {
  const get = (k) => stats.find(s => s.key === k);
  const energy = get("energy");
  const load = get("load");
  const focus = get("focus");
  const confidence = get("confidence");
  const energyVar = variability.find(v => v.key === "energy");
  const rangeLabel = rangeDays >= 999 ? "all time" : `last ${rangeDays}d`;

  if (load?.avg != null && load.avg >= 3.5)
    return { icon: "🔴", label: "Load signal", headline: "Load is running high.", body: "Identify one thing to hand off or defer before the week compounds.", tone: "rose", rangeLabel };
  if (energy?.avg != null && energy.avg <= 2.5)
    return { icon: "🟡", label: "Energy signal", headline: "Energy is running low.", body: "Protect thinking time and defer non-urgent decisions where possible.", tone: "amber", rangeLabel };
  if (energy?.trend === "down")
    return { icon: "🟡", label: "Energy signal", headline: "Energy is trending down.", body: "Watch for compounding fatigue — protect recovery time this week.", tone: "amber", rangeLabel };
  if (energyVar?.stdDev != null && energyVar.stdDev >= 1)
    return { icon: "🟡", label: "Energy signal", headline: "Energy is swinging day to day.", body: "Inconsistent rhythm — notice what's driving the highs and lows.", tone: "amber", rangeLabel };
  if (focus?.avg != null && focus.avg <= 2.5)
    return { icon: "🟡", label: "Focus signal", headline: "Focus has been scattered.", body: "Try protecting one uninterrupted block for your hardest task.", tone: "amber", rangeLabel };
  if (energy?.avg != null && energy.avg >= 3.5 && (confidence?.avg == null || confidence.avg >= 3.5))
    return { icon: "🟢", label: "Energy signal", headline: "You're in a strong rhythm.", body: "Energy and confidence are holding — good conditions to push on your Big 3.", tone: "emerald", rangeLabel };
  return { icon: "🟢", label: "Energy signal", headline: "Your rhythm is steady.", body: "No major friction signals in this range. Keep the cadence.", tone: "emerald", rangeLabel };
}

function RhythmEnergySignal({ stats, variability, rangeDays }) {
  const s = buildRhythmSignal(stats, variability, rangeDays);
  const toneClass = {
    rose: "bg-rose-50/60 border-rose-100",
    amber: "bg-amber-50/60 border-amber-100",
    emerald: "bg-emerald-50/60 border-emerald-100",
  }[s.tone];
  return (
    <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border ${toneClass}`}>
      <span className="text-base flex-shrink-0 mt-0.5">{s.icon}</span>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{s.label} · {s.rangeLabel}</p>
        <p className="text-sm font-semibold text-foreground leading-snug">{s.headline}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.body}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CheckInTrendDashboard({ checkIns = [], assessment = null }) {
  const [rangeDays, setRangeDays] = useState(14);
  const [activeMeasures, setActiveMeasures] = useState(new Set(["energy", "confidence", "focus", "load", "growth"]));
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("rhythm"); // "rhythm" | "assessment" | "big3"

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
  // Only treat assessment as "ready" if scores are actually present
  const hasAssessment = assessment != null && assessment.overall_pct != null;
  const assessmentPending = assessment != null && assessment.overall_pct == null;

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
    <>
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Leadership Pulse</p>
              <p className="text-[10px] text-muted-foreground">Daily check-in signals · private to you</p>
            </div>
          </div>
          {hasCheckInData && (
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              title="Expand chart"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </button>
          )}
        </div>

        {dashboardExpanded && (
        <>
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
          <button
            onClick={() => setTab("big3")}
            className={`flex items-center gap-1.5 text-xs font-semibold pb-1.5 border-b-2 transition-colors ${
              tab === "big3" ? "border-[#0202ff] text-[#0202ff]" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" /> Big 3 History
          </button>
        </div>
        </>
        )}
      </div>

      {dashboardExpanded && (
      <CardContent className="px-5 pt-4 pb-5 space-y-5">
...
      </CardContent>
      )}
    </Card>

    {/* Expanded modal */}
    {expanded && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setExpanded(false)}>
        <div
          className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {tab === "assessment" ? "Leadership Index" : tab === "big3" ? "Big 3 Priority History" : "Leadership Pulse — Daily rhythm"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {tab === "assessment" ? "Your competency scores benchmarked against industry data" : tab === "big3" ? "Your daily top 3 priorities and their outcomes" : "1 = low · 3 = baseline · 5 = strong · private to you"}
              </p>
            </div>
            <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Assessment tab expanded ── */}
          {tab === "assessment" && (
            <div className="px-6 py-8 flex flex-col items-center gap-6 text-center">
              <Brain className="w-12 h-12 text-[#0202ff] opacity-80" />
              <div>
                <p className="text-base font-semibold text-foreground mb-1">View your full Leadership Index report</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  See your complete competency breakdown, historical trends, and personalised development recommendations.
                </p>
              </div>
              {hasAssessment && (
                <div className="flex items-center gap-4 p-4 bg-[#0202ff]/5 rounded-xl border border-[#0202ff]/15 w-full max-w-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-[#0202ff]">{assessment.overall_pct}%</span>
                    <span className="text-[10px] text-muted-foreground">Overall</span>
                  </div>
                  <div className="flex-1 text-left">
                    {assessment.archetype_label && <p className="text-sm font-semibold text-foreground">{assessment.archetype_label}</p>}
                    {assessment.band_overall && <p className="text-xs text-muted-foreground">{assessment.band_overall}</p>}
                  </div>
                </div>
              )}
              <Link
                to="/Insights"
                onClick={() => setExpanded(false)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#0202ff' }}
              >
                <Brain className="w-4 h-4" />
                Open full Leadership Index report
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </Link>
            </div>
          )}

          {/* ── Big 3 tab expanded ── */}
          {tab === "big3" && (() => {
            const STATUS_CONFIG = {
              completed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Done" },
              on_track:  { icon: CheckCircle2, color: "text-blue-600",    bg: "bg-blue-50",    label: "On Track" },
              shifted:   { icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50",   label: "Shifted" },
              blocked:   { icon: AlertCircle,  color: "text-red-600",     bg: "bg-red-50",     label: "Blocked" },
              confirmed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Confirmed" },
              planned:   { icon: MinusCircle,  color: "text-gray-400",    bg: "bg-gray-50",    label: "Planned" },
            };
            const byDate = {};
            checkIns.filter(ci => ci.big3_priorities?.length > 0).forEach(ci => {
              const d = ci.check_in_date;
              if (!byDate[d]) byDate[d] = ci;
              else if (ci.check_in_type === 'evening') byDate[d] = ci;
            });
            const history = Object.values(byDate).sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
            if (history.length === 0) return (
              <div className="px-6 py-12 text-center space-y-2">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm font-semibold text-foreground">No priorities recorded yet</p>
              </div>
            );
            return (
              <div className="px-6 py-5 space-y-3">
                {history.map(ci => {
                  let dateLabel;
                  try {
                    const d = parseISO(ci.check_in_date);
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    const yestStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                    dateLabel = ci.check_in_date === todayStr ? "Today" : ci.check_in_date === yestStr ? "Yesterday" : format(d, "EEE, MMM d");
                  } catch { dateLabel = ci.check_in_date; }
                  const completed = ci.big3_priorities.filter(p => p.status === 'completed').length;
                  const total = ci.big3_priorities.length;
                  return (
                    <div key={ci.id || ci.check_in_date} className="border border-border rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">{dateLabel}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${completed === total && total > 0 ? 'bg-emerald-100 text-emerald-700' : completed > 0 ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                          {completed}/{total} done
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {ci.big3_priorities.map((p, idx) => {
                          const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.planned;
                          const Icon = cfg.icon;
                          return (
                            <div key={p.id || idx} className="flex items-start gap-2">
                              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug ${p.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{p.title}</p>
                                {p.midday_note && <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{p.midday_note}"</p>}
                              </div>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Daily rhythm tab expanded ── */}
          {tab === "rhythm" && (
            <div className="px-6 py-5 space-y-4">
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
              <div className="flex gap-2 flex-wrap">
                {MEASURES.map(m => {
                  const active = activeMeasures.has(m.key);
                  const statVal = stats.find(s => s.key === m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMeasure(m.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        active ? "text-foreground" : "opacity-40 border-transparent bg-transparent text-muted-foreground"
                      }`}
                      style={active ? { borderColor: m.color + "60", backgroundColor: m.color + "12" } : {}}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                      {m.label}
                      {statVal?.avg != null && <span className="font-bold" style={{ color: active ? m.color : undefined }}>{statVal.avg}</span>}
                    </button>
                  );
                })}
              </div>
              {chartData.length >= 1 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[1, 5]} tickCount={5} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={3} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: "baseline", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    {MEASURES.filter(m => activeMeasures.has(m.key)).map(m => (
                      <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2.5} dot={{ r: 4, fill: m.color, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">No check-ins in this range.</p>
              )}
              <RhythmEnergySignal stats={stats} variability={variability} rangeDays={rangeDays} />
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}