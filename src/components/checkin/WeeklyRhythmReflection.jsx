/**
 * WeeklyRhythmReflection — Full weekly summary with charts, AI analysis, and reflection input.
 * Contains: 5-measure trend chart, AI narrative, Big 3 data, goal movement,
 * competency signals, risk areas, recognition, and next-week recommendations.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, TrendingUp, TrendingDown, Minus,
  Brain, Target, AlertCircle, Star, Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { format, parseISO } from "date-fns";

const MEASURES = [
  { key: "energy",     label: "Energy",     emoji: "⚡", color: "#f59e0b" },
  { key: "confidence", label: "Confidence", emoji: "🎯", color: "#0202ff" },
  { key: "focus",      label: "Focus",      emoji: "🔍", color: "#10b981" },
  { key: "load",       label: "Load",       emoji: "🪨", color: "#ef4444" },
  { key: "growth",     label: "Growth",     emoji: "🌱", color: "#8b5cf6" },
];

function avg(arr) {
  const v = arr.filter(Boolean);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function getTrend(scores) {
  if (!scores || scores.length < 2) return "stable";
  const half = Math.ceil(scores.length / 2);
  const recentAvg = avg(scores.slice(0, half));
  const olderAvg = avg(scores.slice(half));
  if (!recentAvg || !olderAvg) return "stable";
  if (recentAvg > olderAvg + 0.3) return "improving";
  if (recentAvg < olderAvg - 0.3) return "declining";
  return "stable";
}

function TrendBadge({ trend }) {
  if (trend === "improving") return <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-semibold"><TrendingUp className="w-3 h-3" /> Up</span>;
  if (trend === "declining") return <span className="flex items-center gap-0.5 text-rose-500 text-[10px] font-semibold"><TrendingDown className="w-3 h-3" /> Down</span>;
  return <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]"><Minus className="w-3 h-3" /> Stable</span>;
}

export default function WeeklyRhythmReflection({ isOpen, onClose, onSuccess, userEmail, assessmentInsight }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [weekRecords, setWeekRecords] = useState([]);
  const [goals, setGoals] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Reflection form
  const [wentWell, setWentWell] = useState("");
  const [surprised, setSurprised] = useState("");
  const [nextWeekIntent, setNextWeekIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !userEmail) return;
    setLoading(true);
    setAiData(null);
    setActiveTab("summary");

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    // Use ET date to match how check_in_date is stored (America/New_York)
    const weekAgoStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(weekAgo);

    Promise.all([
      base44.entities.DailyCheckIn.filter({ user_email: userEmail }, "-check_in_date", 14).catch(() => []),
      base44.entities.Goal.filter({ user_email: userEmail }, "-created_date", 15).catch(() => []),
      base44.entities.AssessmentInsights.filter({ user_email: userEmail }, "-created_date", 1).catch(() => []),
    ]).then(([records, goalsData, insightsData]) => {
      const filtered = records.filter(r => r.check_in_date >= weekAgoStr);
      setWeekRecords(filtered);
      setGoals(goalsData);
      // Prefer passed-in insight prop, fall back to fetched
      const resolvedInsight = assessmentInsight || insightsData[0] || null;
      setAssessment(resolvedInsight);
      setLoading(false);
      if (filtered.length > 0) generateAISummary(filtered, goalsData, resolvedInsight);
    }).catch(() => setLoading(false));
  }, [isOpen, userEmail, assessmentInsight]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateAISummary = async (records, goalsData, insight) => {
    setAiLoading(true);
    try {
      const weekStats = {};
      MEASURES.forEach(m => {
        const scores = records.map(r => r[`${m.key}_score`]).filter(Boolean);
        weekStats[m.key] = { avg: avg(scores)?.toFixed(1), trend: getTrend(scores) };
      });

      const morningCount = records.filter(r => r.morning_completed).length;
      const eveningCount = records.filter(r => r.evening_completed).length;
      const allBig3 = records.flatMap(r => r.big3_priorities || []);
      const shiftedCount = allBig3.filter(p => p.midday_status === "shifted" || p.midday_status === "blocked").length;
      const activeGoals = (goalsData || []).filter(g => g.status === "active");
      const stalledGoals = activeGoals.filter(g => (g.progress || 0) < 20);

      const prompt = `You are Atreus, a leadership intelligence system. Analyze this manager's week.

Weekly check-in data:
- Energy avg: ${weekStats.energy.avg}/5 (${weekStats.energy.trend})
- Confidence avg: ${weekStats.confidence.avg}/5 (${weekStats.confidence.trend})
- Focus avg: ${weekStats.focus.avg}/5 (${weekStats.focus.trend})
- Load avg: ${weekStats.load.avg}/5 (${weekStats.load.trend}) [5=highest pressure]
- Growth avg: ${weekStats.growth.avg}/5 (${weekStats.growth.trend})
- Check-in consistency: ${morningCount} mornings, ${eveningCount} evenings out of ${records.length} days
- Big 3 priorities set: ${allBig3.length} total, ${shiftedCount} shifted or blocked mid-week
- Active goals: ${activeGoals.length}, stalled: ${stalledGoals.length}
${insight ? `- Leadership archetype: ${insight.archetype}\n- Development areas: ${(insight.development_areas || []).join(", ")}` : ""}

Generate a leadership rhythm analysis. Return JSON with:
- narrative: 2-3 sentence reflection on what this week revealed about their leadership rhythm (specific, not generic)
- risk_areas: 2-3 specific risks or patterns that need attention (short, named, concrete)
- recognition: 2-3 positive signals or strengths demonstrated this week
- recommendations: 3 specific, actionable recommendations for next week (each under 15 words)
- competency_signals: 1-2 leadership competency areas signaled by this week's patterns (pick from: Situational Intelligence, Decision Making, Communication, Resource Management, Stakeholder Management, Performance Management)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            narrative: { type: "string" },
            risk_areas: { type: "array", items: { type: "string" } },
            recognition: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            competency_signals: { type: "array", items: { type: "string" } },
          },
        },
      });
      setAiData(result);
    } catch (err) {
      console.error("AI generation failed", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Build chart data — one point per day, avg of all scores that day
  const chartData = (() => {
    const days = {};
    weekRecords.forEach(r => {
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
      .map(([date, scores]) => {
        const point = { date: format(parseISO(date), "EEE") };
        MEASURES.forEach(m => {
          const sc = scores[m.key];
          if (sc?.length) point[m.key] = parseFloat(avg(sc).toFixed(1));
        });
        return point;
      });
  })();

  const allBig3 = weekRecords.flatMap(r => r.big3_priorities || []);
  const shiftedBig3 = allBig3.filter(p => p.midday_status === "shifted" || p.midday_status === "blocked");
  const activeGoals = goals.filter(g => g.status === "active");
  const movingGoals = activeGoals.filter(g => (g.progress || 0) > 0);

  const handleSubmit = async () => {
    if (!wentWell.trim()) { toast.error("Share at least one win from this week"); return; }
    setSubmitting(true);
    try {
      const weekStats = {};
      MEASURES.forEach(m => {
        const scores = weekRecords.map(r => r[`${m.key}_score`]).filter(Boolean);
        weekStats[m.key] = avg(scores);
      });
      await base44.entities.ManagerPulse.create({
        user_email: userEmail,
        prompt_type: "weekly_reflection",
        source: "web",
        biggest_weight_today: wentWell,
        ...(surprised && { identity_friction_note: surprised }),
        ...(nextWeekIntent && { focus_intention: nextWeekIntent }),
        metadata: { week_averages: weekStats, ai_summary: aiData, week_record_count: weekRecords.length },
      });
      toast.success("Weekly rhythm reflection saved.");
      onSuccess?.();
      onClose();
      setWentWell(""); setSurprised(""); setNextWeekIntent("");
    } catch {
      toast.error("Failed to save reflection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-[#0202ff]" />
            Weekly Rhythm Reflection
          </DialogTitle>
          <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
            {[{ id: "summary", label: "This Week" }, { id: "reflect", label: "My Reflection" }].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${activeTab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
            </div>
          )}

          {/* ── SUMMARY TAB ── */}
          {!loading && activeTab === "summary" && (
            <div className="space-y-5">
              {weekRecords.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">No check-in data for this week yet.</p>
                  <p className="text-xs mt-1">Complete morning or evening check-ins to see your rhythm here.</p>
                </div>
              ) : (
                <>
                  {/* 5-Measure trend chart */}
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Leadership state this week</p>
                    <p className="text-[10px] text-muted-foreground mb-3">1 = low · 3 = baseline · 5 = strong</p>
                    {chartData.length >= 1 ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[1, 5]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickCount={5} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                            formatter={(val, name) => [val, MEASURES.find(m => m.key === name)?.label || name]}
                          />
                          <ReferenceLine y={3} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                          {MEASURES.map(m => (
                            <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={{ r: 3, fill: m.color }} connectNulls />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Check in on more days to see your trend line.</p>
                    )}

                    {/* Measure averages + trend badges */}
                    <div className="grid grid-cols-5 gap-2 mt-4 pt-3 border-t border-border/50">
                      {MEASURES.map(m => {
                        const scores = weekRecords.map(r => r[`${m.key}_score`]).filter(Boolean);
                        const avgScore = avg(scores);
                        const trend = getTrend(scores);
                        return (
                          <div key={m.key} className="text-center">
                            <span className="text-base">{m.emoji}</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
                            <p className="text-sm font-bold text-foreground">{avgScore?.toFixed(1) ?? "–"}</p>
                            <TrendBadge trend={trend} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Narrative */}
                  {aiLoading && (
                    <div className="bg-[#0202ff]/5 rounded-xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0202ff] flex-shrink-0" />
                      <p className="text-xs text-[#0202ff]">Atreus is reading your week...</p>
                    </div>
                  )}

                  {aiData?.narrative && (
                    <div className="bg-[#0202ff]/5 rounded-xl px-4 py-4 border border-[#0202ff]/10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
                        <p className="text-[10px] font-semibold text-[#0202ff] uppercase tracking-wide">Atreus reads your week</p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{aiData.narrative}</p>
                    </div>
                  )}

                  {/* Check-in stats + Big 3 + Goals */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card border border-border rounded-xl px-3 py-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Check-ins</p>
                      <p className="text-xl font-bold text-foreground">{weekRecords.filter(r => r.morning_completed || r.evening_completed).length}<span className="text-xs font-normal text-muted-foreground"> days</span></p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">🌅 {weekRecords.filter(r => r.morning_completed).length} mornings · 🌙 {weekRecords.filter(r => r.evening_completed).length} evenings</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl px-3 py-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Big 3 set</p>
                      <p className="text-xl font-bold text-foreground">{allBig3.length}</p>
                      {shiftedBig3.length > 0 && (
                        <p className="text-[10px] text-amber-600 mt-0.5">{shiftedBig3.length} shifted/blocked</p>
                      )}
                    </div>
                    <div className="bg-card border border-border rounded-xl px-3 py-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Goal movement</p>
                      <p className="text-xl font-bold text-foreground">{movingGoals.length}<span className="text-xs font-normal text-muted-foreground">/{activeGoals.length}</span></p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">goals in motion</p>
                    </div>
                  </div>

                  {/* Competency signals */}
                  {aiData?.competency_signals?.length > 0 && (
                    <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide mb-2">Competency signals this week</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiData.competency_signals.map((s, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">{s}</span>
                        ))}
                      </div>
                      {assessment?.archetype && (
                        <p className="text-[10px] text-violet-500 mt-2">Cross-referenced with your {assessment.archetype} Leadership Index baseline</p>
                      )}
                    </div>
                  )}

                  {/* Risk Areas + Recognition */}
                  {(aiData?.risk_areas?.length > 0 || aiData?.recognition?.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {aiData?.risk_areas?.length > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide">Watch areas</p>
                          </div>
                          <ul className="space-y-1.5">
                            {aiData.risk_areas.slice(0, 3).map((r, i) => (
                              <li key={i} className="text-xs text-rose-700 leading-snug">· {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiData?.recognition?.length > 0 && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Star className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Recognized</p>
                          </div>
                          <ul className="space-y-1.5">
                            {aiData.recognition.slice(0, 3).map((r, i) => (
                              <li key={i} className="text-xs text-emerald-700 leading-snug">· {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leadership Index baseline cross-reference */}
                  {assessment && (assessment.archetype || assessment.top_strengths?.length > 0 || assessment.development_areas?.length > 0) && (
                    <div className="bg-card border border-border rounded-xl px-4 py-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Zap className="w-3.5 h-3.5 text-violet-500" />
                        <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Leadership Index baseline</p>
                      </div>
                      {assessment.archetype && (
                        <p className="text-xs text-muted-foreground mb-2">Archetype: <span className="font-semibold text-foreground">{assessment.archetype}</span></p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {assessment.top_strengths?.length > 0 && (
                          <div>
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide mb-1">Assessed strengths</p>
                            {assessment.top_strengths.slice(0, 3).map((s, i) => (
                              <p key={i} className="text-xs text-foreground leading-snug">· {s}</p>
                            ))}
                          </div>
                        )}
                        {assessment.development_areas?.length > 0 && (
                          <div>
                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Development focus</p>
                            {assessment.development_areas.slice(0, 3).map((d, i) => (
                              <p key={i} className="text-xs text-foreground leading-snug">· {d}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      {aiData?.competency_signals?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                          This week's patterns are cross-referenced against your Leadership Index baseline above.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {aiData?.recommendations?.length > 0 && (
                    <div className="bg-card border border-border rounded-xl px-4 py-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Target className="w-3.5 h-3.5 text-[#0202ff]" />
                        <p className="text-[10px] font-semibold text-[#0202ff] uppercase tracking-wide">Recommendations for next week</p>
                      </div>
                      <ol className="space-y-2.5">
                        {aiData.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-[#0202ff] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-foreground leading-snug">{r}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <Button onClick={() => setActiveTab("reflect")} className="w-full bg-[#0202ff] hover:bg-[#0101dd]">
                    Add your reflection →
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── REFLECT TAB ── */}
          {!loading && activeTab === "reflect" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Your reflection is private and feeds Atreus's pattern memory.</p>

              <div className="space-y-2">
                <label className="text-sm font-medium">What went well or as planned? *</label>
                <textarea
                  value={wentWell}
                  onChange={e => setWentWell(e.target.value)}
                  placeholder="Wins, moments of focus, things that clicked..."
                  rows={3}
                  className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">What surprised you?</label>
                <textarea
                  value={surprised}
                  onChange={e => setSurprised(e.target.value)}
                  placeholder="Unexpected pivots, difficult moments (optional)"
                  rows={2}
                  className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Intent for next week</label>
                <textarea
                  value={nextWeekIntent}
                  onChange={e => setNextWeekIntent(e.target.value)}
                  placeholder="One thing you want to do differently or protect (optional)"
                  rows={2}
                  className="w-full text-sm bg-muted/40 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setActiveTab("summary")}>← Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !wentWell.trim()}
                  className="flex-1 bg-[#0202ff] hover:bg-[#0101dd]"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save reflection"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}