import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Zap, GitBranch, Shield, Brain, Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp, Info, ChevronRight, Eye, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BENCHMARKS = { si: 75, dm: 77, comm: 78, rm: 78, sm: 79, pm: 76 };
const DIMENSION_LABELS = { si: "Situational Intelligence", dm: "Decision Making", comm: "Communication", rm: "Resource Management", sm: "Stakeholder Management", pm: "Performance Management" };

function DimensionBar({ label, score, benchmark, isPrimary }) {
  const delta = score - benchmark;
  const isAbove = delta >= 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${isPrimary ? "text-indigo-800" : "text-gray-700"}`}>{label}</span>
          {isPrimary && <Badge className="text-[9px] px-1 py-0 bg-indigo-100 text-indigo-700 border-indigo-200">Primary driver</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${score >= benchmark ? "text-emerald-600" : score >= benchmark * 0.9 ? "text-amber-600" : "text-red-600"}`}>
            {score}%
          </span>
          <span className={`text-[10px] font-medium ${isAbove ? "text-emerald-600" : "text-red-500"}`}>
            {isAbove ? "+" : ""}{delta}% vs target
          </span>
        </div>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= benchmark ? "bg-emerald-400" : score >= benchmark * 0.9 ? "bg-amber-400" : "bg-red-400"
          }`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: `${benchmark}%` }} title={`Target: ${benchmark}%`} />
      </div>
    </div>
  );
}

// Compact detail drawer — slides in from right conceptually, rendered inline below trigger
function DetailDrawer({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-800">{title}</span>
              <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Close ×</button>
            </div>
            <div className="px-4 py-3">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function OrgHealthCard({
  metrics, assessments, goals, assignedLearning,
  strategicRisks, strategicOpportunities,
  onPromptAtreus, executiveBriefing, generatingBriefing, generatingAll, onRefreshBriefing
}) {
  const { competencyAverages } = metrics;
  const [openDrawer, setOpenDrawer] = useState(null); // "risk" | "velocity" | "dimensions" | "briefing"
  const [showAllDimensions, setShowAllDimensions] = useState(false);

  const toggleDrawer = (key) => setOpenDrawer(prev => prev === key ? null : key);

  const [showMETooltip, setShowMETooltip] = useState(false);

  const meIndex = Math.round(
    competencyAverages.dm * 0.35 +
    competencyAverages.si * 0.30 +
    competencyAverages.comm * 0.20 +
    competencyAverages.pm * 0.15
  );
  const decisionQuality = Math.round(competencyAverages.dm * 0.55 + competencyAverages.si * 0.45);
  const meTier =
    meIndex >= 80 ? { label: "High", color: "bg-emerald-100 text-emerald-700 border-emerald-200", meaning: "Above benchmark. Sustain through continued development and stretch opportunities." } :
    meIndex >= 65 ? { label: "Building", color: "bg-amber-100 text-amber-700 border-amber-200", meaning: "A developmental score band indicating growth is underway. Targeted coaching and structured learning are recommended to close the gap to benchmark." } :
                    { label: "Needs Attention", color: "bg-red-100 text-red-700 border-red-200", meaning: "Below benchmark threshold. Leadership review and structured intervention are recommended." };
  const meInterpretation =
    meIndex >= 80 ? "Strong and above benchmark." :
    meIndex >= 65 ? "Building — targeted coaching recommended." :
                    "Below threshold — leadership review needed.";

  const dimensions = [
    { key: "dm",   label: DIMENSION_LABELS.dm,   score: competencyAverages.dm,   isPrimary: true },
    { key: "si",   label: DIMENSION_LABELS.si,   score: competencyAverages.si,   isPrimary: true },
    { key: "comm", label: DIMENSION_LABELS.comm, score: competencyAverages.comm, isPrimary: false },
    { key: "pm",   label: DIMENSION_LABELS.pm,   score: competencyAverages.pm,   isPrimary: false },
    { key: "rm",   label: DIMENSION_LABELS.rm,   score: competencyAverages.rm,   isPrimary: false },
    { key: "sm",   label: DIMENSION_LABELS.sm,   score: competencyAverages.sm,   isPrimary: false },
  ];

  // Sort: show top 2 strengths and top 2 gaps by default
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const top2 = sorted.slice(0, 2);
  const bottom2 = sorted.slice(-2);
  const defaultDimensions = [...top2, ...bottom2].filter((d, i, arr) => arr.findIndex(x => x.key === d.key) === i);
  const visibleDimensions = showAllDimensions ? dimensions : defaultDimensions;

  // Flight risk
  const lowScorers = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 50).length;
  const staleGoals = goals.filter(g => ['overdue', 'on_hold'].includes(g.status ?? g.data?.status)).length;
  const completedLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) === 'completed').length;
  const learningRate = assignedLearning.length > 0 ? Math.round((completedLearning / assignedLearning.length) * 100) : 0;
  const incompleteLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) !== 'completed').length;
  const velocityLabel = learningRate >= 70 ? 'High' : learningRate >= 50 ? 'Moderate' : 'Low';
  const velocityColor = learningRate >= 70 ? 'text-emerald-600' : learningRate >= 50 ? 'text-amber-600' : 'text-red-600';
  const velocityBadge = learningRate >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : learningRate >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';

  const allRisks = strategicRisks?.length > 0 ? strategicRisks : (() => {
    const derived = [];
    if (metrics.atRiskLeaders > 0) derived.push({ title: 'Leaders Below Performance Threshold', description: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? 's are' : ' is'} scoring below 60%.`, severity: 'High' });
    if (metrics.competencyAverages.dm < 65) derived.push({ title: 'Decision-Making Gap Detected', description: `Org-wide DM average is ${metrics.competencyAverages.dm}%, below the 65% target.`, severity: 'Medium' });
    if (metrics.competencyAverages.rm < 65) derived.push({ title: 'Resource Management Deficit', description: `RM scores average ${metrics.competencyAverages.rm}%.`, severity: 'Medium' });
    return derived.slice(0, 3);
  })();

  const allOpps = strategicOpportunities?.length > 0 ? strategicOpportunities : (() => {
    const derived = [];
    if (metrics.highPotentialLeaders > 0) derived.push({ title: 'High-Potential Leaders Ready for Advancement', description: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders !== 1 ? 's are' : ' is'} scoring 85%+.`, potential: 'High' });
    if (metrics.competencyAverages.comm >= 70) derived.push({ title: 'Communication Strength to Leverage', description: `Communication averages ${metrics.competencyAverages.comm}% — above target.`, potential: 'Medium' });
    if (metrics.competencyAverages.si >= 70) derived.push({ title: 'Strong Situational Intelligence Baseline', description: `SI averages ${metrics.competencyAverages.si}%.`, potential: 'Medium' });
    return derived.slice(0, 3);
  })();

  const hasNoData = metrics.totalAssessments === 0;

  return (
    <Card className="border-0 shadow-lg" id="org-health">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Organizational Leadership Health
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Manager Effectiveness, skill gaps, and risk signals</p>
          </div>
          <Badge className={`text-[11px] border ${hasNoData ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-indigo-100 text-indigo-700 border-indigo-200"}`}>
            {hasNoData ? "Data not connected" : "Decision-ready"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasNoData ? (
          <div className="py-8 text-center text-gray-400">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No assessment data. Run assessments to populate this section.</p>
          </div>
        ) : (
          <>
            {/* ── LAYER A: Headline ── */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">ME Index</span>
                    <div className="relative">
                      <button
                        onClick={() => setShowMETooltip(v => !v)}
                        className="flex items-center gap-1"
                      >
                        <Badge className={`text-[10px] border ${meTier.color}`}>{meTier.label}</Badge>
                        <HelpCircle className="w-3 h-3 text-indigo-400 hover:text-indigo-600" />
                      </button>
                      {showMETooltip && (
                        <div className="absolute left-0 top-6 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs leading-relaxed">
                          <div className="flex justify-between mb-1.5">
                            <span className="font-semibold text-gray-900">What "{meTier.label}" means</span>
                            <button onClick={() => setShowMETooltip(false)} className="text-gray-400 hover:text-gray-600">×</button>
                          </div>
                          <p className="text-gray-600 mb-2">{meTier.meaning}</p>
                          <p className="text-gray-400">ME Index = DM (35%) + SI (30%) + Communication (20%) + Performance Management (15%). Benchmark target: 77%.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-indigo-700">{meIndex}%</div>
                  <p className="text-xs text-indigo-600 mt-1">{meInterpretation}</p>
                </div>
                <div className="sm:text-right space-y-1">
                  <div className="flex items-center gap-2 sm:justify-end">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-indigo-700">Decision Quality: <strong>{decisionQuality}%</strong></span>
                  </div>
                  <p className="text-[10px] text-indigo-500">{metrics.totalAssessments} leaders assessed</p>
                  <p className="text-[10px] text-gray-400">DM 35% · SI 30% · Comm 20% · PM 15%</p>
                </div>
              </div>
            </div>

            {/* ── LAYER B: Two diagnostic cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Risk Signals */}
              <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                <button
                  onClick={() => toggleDrawer("risk")}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-gray-700">Risk Signals</span>
                    {lowScorers > 0 && <span className="text-xs font-bold text-red-600 ml-1">{lowScorers} require{lowScorers === 1 ? "s" : ""} review</span>}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDrawer === "risk" ? "rotate-180" : ""}`} />
                </button>
                <div className="px-3 pb-2.5 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className={`text-lg font-bold ${lowScorers > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowScorers}</div>
                    <div className="text-[10px] text-gray-500">Below 50%</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${staleGoals > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{staleGoals}</div>
                    <div className="text-[10px] text-gray-500">Stale goals</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${incompleteLearning > 5 ? 'text-amber-600' : 'text-gray-700'}`}>{incompleteLearning}</div>
                    <div className="text-[10px] text-gray-500">Incomplete learning</div>
                  </div>
                </div>
                <DetailDrawer open={openDrawer === "risk"} title="Risk Signal Detail" onClose={() => setOpenDrawer(null)}>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Leaders scoring below 50% capability</span>
                      <span className="font-bold text-red-600">{lowScorers}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />Goals in overdue or on-hold status</span>
                      <span className="font-bold text-amber-600">{staleGoals}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />Incomplete learning assignments</span>
                      <span className="font-bold">{incompleteLearning}</span>
                    </div>
                    {lowScorers > 0 && (
                      <p className="text-[10px] text-amber-600 pt-1 font-medium">{lowScorers} leader{lowScorers > 1 ? "s" : ""} require{lowScorers === 1 ? "s" : ""} review this cycle. These signals are for coaching and development prioritisation — not employment action.</p>
                    )}
                    <p className="text-[10px] text-gray-400 pt-1">Source: Platform capability assessments, goal records, learning assignments.</p>
                  </div>
                </DetailDrawer>
              </div>

              {/* Learning Velocity */}
              <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                <button
                  onClick={() => toggleDrawer("velocity")}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-semibold text-gray-700">Learning Velocity</span>
                    <Badge className={`text-[9px] px-1 py-0 border ml-1 ${velocityBadge}`}>{velocityLabel}</Badge>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDrawer === "velocity" ? "rotate-180" : ""}`} />
                </button>
                <div className="px-3 pb-2.5 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className={`text-lg font-bold ${velocityColor}`}>{learningRate}%</div>
                    <div className="text-[10px] text-gray-500">Completion</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-600">{completedLearning}</div>
                    <div className="text-[10px] text-gray-500">Done</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-600">{assignedLearning.length}</div>
                    <div className="text-[10px] text-gray-500">Assigned</div>
                  </div>
                </div>
                <DetailDrawer open={openDrawer === "velocity"} title="Learning Velocity Detail" onClose={() => setOpenDrawer(null)}>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />Completed</span>
                      <span className="font-bold text-emerald-600">{completedLearning}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full inline-block" />Remaining</span>
                      <span className="font-bold">{incompleteLearning}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Total assigned</span>
                      <span className="font-bold">{assignedLearning.length}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 pt-1">Target: ≥70% completion rate. Source: Platform-assigned learning records.</p>
                    <p className="text-[10px] text-amber-600 pt-1">Low completion may reflect time constraints, assignment relevance, or workflow friction — not necessarily lack of motivation. Review assignment design before drawing conclusions about leader behaviour.</p>
                  </div>
                </DetailDrawer>
              </div>
            </div>

            {/* ── LAYER C: Competency dimensions — top 2 strengths + top 2 gaps ── */}
            {(() => {
              // Build narrative summary connecting dimensions to ME Index
              const lowestDim = [...dimensions].sort((a,b) => (a.score - BENCHMARKS[a.key]) - (b.score - BENCHMARKS[b.key]))[0];
              const secondLowest = [...dimensions].sort((a,b) => (a.score - BENCHMARKS[a.key]) - (b.score - BENCHMARKS[b.key]))[1];
              const belowBenchmark = dimensions.filter(d => d.score < BENCHMARKS[d.key]);
              const narrativeLine = belowBenchmark.length > 0
                ? `Leadership Health is being held back most by ${lowestDim.label}${secondLowest && secondLowest.score < BENCHMARKS[secondLowest.key] ? ` and ${secondLowest.label}` : ""}. These are the highest-leverage areas for development investment.`
                : "All dimensions are at or above benchmark — focus now on sustaining strengths and deepening primary drivers.";
              return (
                <div className="border border-gray-100 rounded-xl bg-gray-50/50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">Competency Dimensions</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {showAllDimensions ? "All 6 dimensions" : "Top 2 strengths & top 2 gaps"} vs. industry benchmark
                      </p>
                    </div>
                    <Badge className="text-[10px] border bg-slate-100 text-slate-600 border-slate-200">Directional</Badge>
                  </div>
                  {/* Connecting narrative */}
                  <div className="mx-4 mb-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <p className="text-[11px] text-indigo-800 leading-relaxed">{narrativeLine}</p>
                  </div>
                  <div className="px-4 pb-4 space-y-3">
                    {visibleDimensions.map(d => (
                      <DimensionBar key={d.key} label={d.label} score={d.score} benchmark={BENCHMARKS[d.key]} isPrimary={d.isPrimary} />
                    ))}
                    <button
                      onClick={() => setShowAllDimensions(v => !v)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors mt-1"
                    >
                      {showAllDimensions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAllDimensions ? "Show key dimensions only" : "View all 6 dimensions"}
                    </button>
                    <p className="text-[10px] text-gray-400">Vertical bar = industry benchmark (source: platform calibration norms). DM and SI are primary drivers of Manager Effectiveness.</p>
                  </div>
                </div>
              );
            })()}

            {/* ── LAYER D: Executive AI Briefing — compact, supporting role ── */}
            <div className="border border-purple-100 rounded-xl bg-purple-50/40 overflow-hidden">
              <button
                onClick={() => toggleDrawer("briefing")}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">Executive AI Briefing</span>
                  <Badge className="text-[10px] border bg-purple-100 text-purple-700 border-purple-200">AI synthesis</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {onRefreshBriefing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRefreshBriefing(); }}
                      disabled={generatingAll}
                      className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      {generatingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </button>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-purple-400 transition-transform ${openDrawer === "briefing" ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* One-sentence context always visible */}
              <div className="px-4 pb-3 space-y-1">
                {generatingBriefing && !executiveBriefing ? (
                  <div className="flex items-center gap-2 text-purple-600 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />Generating briefing…
                  </div>
                ) : executiveBriefing ? (
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{executiveBriefing.split('\n\n')[0]}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Click Refresh to generate a strategic briefing from your data.</p>
                )}
                <p className="text-[10px] text-gray-400">AI-generated synthesis from {metrics.totalAssessments} assessments, {metrics.totalGoals} goals, {metrics.totalLearning} learning records. Intended for development conversation prep — not sole decision criteria.</p>
              </div>

              {/* Expanded briefing with risks/opps */}
              <DetailDrawer open={openDrawer === "briefing"} title="Full Strategic Briefing" onClose={() => setOpenDrawer(null)}>
                <div className="space-y-4">
                  {executiveBriefing && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-500" />Strategic Context
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed">{executiveBriefing}</p>
                      <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Generated from {metrics.totalAssessments} assessments, {metrics.totalGoals} goals, {metrics.totalLearning} learning records
                      </p>
                    </div>
                  )}

                  {(allRisks.length > 0 || allOpps.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      {allRisks.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-red-700 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />Top Risks
                          </p>
                          <div className="space-y-1.5">
                            {allRisks.map((risk, idx) => (
                              <button
                                key={idx}
                                className="w-full text-left p-2.5 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                                onClick={() => onPromptAtreus?.(`Strategic risk: "${risk.title}". ${risk.description || ''} Help me develop an action plan.`)}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">{risk.severity}</Badge>
                                  <span className="text-xs font-semibold text-red-800 line-clamp-1">{risk.title}</span>
                                </div>
                                {risk.description && <p className="text-[10px] text-red-600 line-clamp-1">{risk.description}</p>}
                                <p className="text-[10px] text-red-400 mt-0.5">Ask Atreus →</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {allOpps.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />Top Opportunities
                          </p>
                          <div className="space-y-1.5">
                            {allOpps.map((opp, idx) => (
                              <button
                                key={idx}
                                className="w-full text-left p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                                onClick={() => onPromptAtreus?.(`Strategic opportunity: "${opp.title}". ${opp.description || ''} Help me create a plan.`)}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">{opp.potential}</Badge>
                                  <span className="text-xs font-semibold text-emerald-800 line-clamp-1">{opp.title}</span>
                                </div>
                                {opp.description && <p className="text-[10px] text-emerald-600 line-clamp-1">{opp.description}</p>}
                                <p className="text-[10px] text-emerald-400 mt-0.5">Ask Atreus →</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DetailDrawer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}