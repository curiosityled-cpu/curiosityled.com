import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Zap, GitBranch, Shield, Brain, Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
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
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
          style={{ left: `${benchmark}%` }}
          title={`Target: ${benchmark}%`}
        />
      </div>
    </div>
  );
}

export default function OrgHealthCard({
  metrics, assessments, goals, assignedLearning,
  strategicRisks, strategicOpportunities,
  onPromptAtreus, executiveBriefing, generatingBriefing, generatingAll, onRefreshBriefing
}) {
  const { competencyAverages } = metrics;
  const [showAllDimensions, setShowAllDimensions] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

  const meIndex = Math.round(
    competencyAverages.dm * 0.35 +
    competencyAverages.si * 0.30 +
    competencyAverages.comm * 0.20 +
    competencyAverages.pm * 0.15
  );
  const decisionQuality = Math.round(competencyAverages.dm * 0.55 + competencyAverages.si * 0.45);
  const meTier =
    meIndex >= 80 ? { label: "High", color: "bg-emerald-100 text-emerald-700 border-emerald-200" } :
    meIndex >= 65 ? { label: "Developing", color: "bg-amber-100 text-amber-700 border-amber-200" } :
                    { label: "Needs Attention", color: "bg-red-100 text-red-700 border-red-200" };

  const meInterpretation =
    meIndex >= 80 ? "Strong manager effectiveness across assessed population." :
    meIndex >= 65 ? "Building — primary drivers DM and SI need continued investment." :
    meIndex > 0 ? "Below target — coaching review and structured support recommended." :
    "No assessment data. Run assessments to populate this section.";

  const dimensions = [
    { key: "dm",   label: DIMENSION_LABELS.dm,   score: competencyAverages.dm,   isPrimary: true },
    { key: "si",   label: DIMENSION_LABELS.si,   score: competencyAverages.si,   isPrimary: true },
    { key: "comm", label: DIMENSION_LABELS.comm, score: competencyAverages.comm, isPrimary: false },
    { key: "pm",   label: DIMENSION_LABELS.pm,   score: competencyAverages.pm,   isPrimary: false },
    { key: "rm",   label: DIMENSION_LABELS.rm,   score: competencyAverages.rm,   isPrimary: false },
    { key: "sm",   label: DIMENSION_LABELS.sm,   score: competencyAverages.sm,   isPrimary: false },
  ];

  // Sort by delta to find top strengths and gaps
  const sorted = [...dimensions].map(d => ({ ...d, delta: d.score - BENCHMARKS[d.key] }))
    .sort((a, b) => b.delta - a.delta);
  const top2Strengths = sorted.slice(0, 2);
  const top2Gaps = [...sorted].reverse().slice(0, 2);
  const visibleDimensions = showAllDimensions ? dimensions : [...top2Strengths, ...top2Gaps.filter(g => !top2Strengths.find(s => s.key === g.key))];

  // Flight risk signals
  const lowScorers = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 50).length;
  const staleGoals = goals.filter(g => ['overdue', 'on_hold'].includes(g.status ?? g.data?.status)).length;
  const completedLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) === 'completed').length;
  const learningRate = assignedLearning.length > 0 ? Math.round((completedLearning / assignedLearning.length) * 100) : 0;
  const incompleteLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) !== 'completed').length;
  const velocityLabel = learningRate >= 70 ? 'High' : learningRate >= 50 ? 'Moderate' : 'Low';
  const velocityColor = learningRate >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : learningRate >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';

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

  // One-line briefing summary (first sentence only)
  const briefingSummary = executiveBriefing
    ? executiveBriefing.split(/[.!?]/)[0]?.trim() + "."
    : null;

  return (
    <Card className="border-0 shadow-lg" id="org-health">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Organizational Leadership Health
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Manager Effectiveness, risk signals, and competency gaps</p>
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
            {/* ── LAYER A: Headline ─────────────────────────────────────────── */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">ME Index</span>
                    <Badge className={`text-[10px] border ${meTier.color}`}>{meTier.label}</Badge>
                  </div>
                  <div className="text-4xl font-bold text-indigo-700 leading-none">{meIndex}%</div>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-600 mt-1">
                    <GitBranch className="w-3 h-3" />
                    Decision Quality: <strong className="ml-0.5">{decisionQuality}%</strong>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-indigo-900 font-medium leading-relaxed">{meInterpretation}</p>
                <p className="text-[10px] text-indigo-500 mt-1">DM (35%) + SI (30%) + Comm (20%) + PM (15%) · {metrics.totalAssessments} leaders assessed</p>
              </div>
            </div>

            {/* ── LAYER B: Two diagnostic cards ─────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Flight Risk */}
              <div className="border border-gray-200 rounded-xl p-3 bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-gray-700">Risk Signals</span>
                  <span className={`ml-auto text-base font-bold ${lowScorers > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowScorers}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />Below 50% capability</span>
                    <span className="font-medium">{lowScorers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />Stale/overdue goals</span>
                    <span className="font-medium">{staleGoals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />Incomplete learning</span>
                    <span className="font-medium">{incompleteLearning}</span>
                  </div>
                </div>
                {lowScorers > 0 && (
                  <p className="text-[10px] text-red-500 mt-2 font-medium">
                    {lowScorers} leader{lowScorers > 1 ? "s" : ""} flagged — review with managers
                  </p>
                )}
              </div>

              {/* Learning Velocity */}
              <div className="border border-gray-200 rounded-xl p-3 bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-xs font-semibold text-gray-700">Learning Velocity</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className={`text-base font-bold ${learningRate >= 70 ? 'text-emerald-600' : learningRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{learningRate}%</span>
                    <Badge className={`text-[10px] px-1 py-0 border ${velocityColor}`}>{velocityLabel}</Badge>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Completed</span>
                    <span className="font-medium">{completedLearning}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />Remaining</span>
                    <span className="font-medium">{incompleteLearning}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />Total assigned</span>
                    <span className="font-medium">{assignedLearning.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── LAYER C: Top competency dimensions (2 strengths + 2 gaps) ─── */}
            <div className="border border-gray-100 rounded-xl bg-gray-50/50 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-900">Competency Dimensions</span>
                  {!showAllDimensions && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Top 2 strengths &amp; top 2 gaps vs. industry benchmark</p>
                  )}
                </div>
                <button
                  onClick={() => setShowAllDimensions(v => !v)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                >
                  {showAllDimensions ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> View all dimensions</>}
                </button>
              </div>
              <div className="px-4 pb-4 space-y-3">
                {(showAllDimensions ? dimensions : visibleDimensions).map(d => (
                  <DimensionBar key={d.key} label={d.label} score={d.score} benchmark={BENCHMARKS[d.key]} isPrimary={d.isPrimary} />
                ))}
                <p className="text-[10px] text-gray-400 pt-1">Vertical bar = industry benchmark. DM and SI are primary ME drivers.</p>
              </div>
            </div>

            {/* ── LAYER D: AI Briefing — compact, supporting role ─────────────── */}
            <div className="border border-purple-100 rounded-xl bg-purple-50/40 overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-purple-50/60 transition-colors"
                onClick={() => setBriefingOpen(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">Executive AI Briefing</span>
                  <Badge className="text-[10px] border bg-purple-100 text-purple-700 border-purple-200">AI-generated</Badge>
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
                  {briefingOpen ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                </div>
              </div>

              {/* Always-visible one-liner */}
              {briefingSummary && !briefingOpen && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-purple-800 italic leading-relaxed">{briefingSummary}</p>
                  <button onClick={() => setBriefingOpen(true)} className="text-[11px] text-purple-600 hover:text-purple-800 font-medium mt-1">Open full briefing →</button>
                </div>
              )}

              {generatingBriefing && !executiveBriefing && (
                <div className="px-4 pb-3 flex items-center gap-2 text-purple-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating briefing…</span>
                </div>
              )}

              <AnimatePresence>
                {briefingOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {executiveBriefing && (
                        <div>
                          <p className="text-sm text-gray-700 leading-relaxed">{executiveBriefing}</p>
                          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Generated from {metrics.totalAssessments} assessments, {metrics.totalGoals} goals, {metrics.totalLearning} learning records
                          </p>
                        </div>
                      )}

                      {/* Risks & Opportunities */}
                      {(allRisks.length > 0 || allOpps.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {allRisks.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-red-700 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Top Risks
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
                                      <span className="text-xs font-semibold text-red-800 leading-tight line-clamp-1">{risk.title}</span>
                                    </div>
                                    <p className="text-[10px] text-red-400 mt-0.5">Ask Atreus for action plan →</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {allOpps.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Top Opportunities
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
                                      <span className="text-xs font-semibold text-emerald-800 leading-tight line-clamp-1">{opp.title}</span>
                                    </div>
                                    <p className="text-[10px] text-emerald-400 mt-0.5">Ask Atreus for action plan →</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}