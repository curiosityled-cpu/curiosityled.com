import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, BarChart3, Zap, GitBranch, Shield, Brain } from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/**
 * Organizational Leadership Health Card
 * Leadership Index Score (radar), skill gaps, flight risk, learning velocity,
 * top risk & opportunity
 */
export default function OrgHealthCard({ metrics, assessments, goals, assignedLearning, strategicRisks, strategicOpportunities, onPromptAtreus }) {
  const { competencyAverages } = metrics;

  // Leadership Index Score (Manager Effectiveness)
  const meIndex = Math.round(
    competencyAverages.dm * 0.35 +
    competencyAverages.si * 0.30 +
    competencyAverages.comm * 0.20 +
    competencyAverages.pm * 0.15
  );
  const decisionQuality = Math.round(competencyAverages.dm * 0.55 + competencyAverages.si * 0.45);
  const meTier =
    meIndex >= 80 ? { label: "High", color: "bg-green-100 text-green-700" } :
    meIndex >= 65 ? { label: "Developing", color: "bg-yellow-100 text-yellow-700" } :
                    { label: "Needs Attention", color: "bg-red-100 text-red-700" };

  // Radar data
  const BENCHMARKS = { si: 75, dm: 77, comm: 78, rm: 78, sm: 79, pm: 76 };
  const radarData = [
    { subject: "SI",   score: competencyAverages.si,   benchmark: BENCHMARKS.si },
    { subject: "DM",   score: competencyAverages.dm,   benchmark: BENCHMARKS.dm },
    { subject: "Comm", score: competencyAverages.comm, benchmark: BENCHMARKS.comm },
    { subject: "RM",   score: competencyAverages.rm,   benchmark: BENCHMARKS.rm },
    { subject: "SM",   score: competencyAverages.sm,   benchmark: BENCHMARKS.sm },
    { subject: "PM",   score: competencyAverages.pm,   benchmark: BENCHMARKS.pm },
  ];

  // Benchmark score legend rows
  const scoreRows = [
    { key: "SI",   score: competencyAverages.si,   target: BENCHMARKS.si },
    { key: "DM",   score: competencyAverages.dm,   target: BENCHMARKS.dm },
    { key: "Comm", score: competencyAverages.comm, target: BENCHMARKS.comm },
    { key: "RM",   score: competencyAverages.rm,   target: BENCHMARKS.rm },
    { key: "SM",   score: competencyAverages.sm,   target: BENCHMARKS.sm },
    { key: "PM",   score: competencyAverages.pm,   target: BENCHMARKS.pm },
  ];

  // Flight risk
  const lowScorers = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 50).length;
  const totalUsers = new Set([
    ...assessments.map(a => a.email ?? a.data?.email),
    ...goals.map(g => g.user_email ?? g.data?.user_email)
  ]).size;
  const flightRiskPct = totalUsers > 0 ? Math.round((lowScorers / totalUsers) * 100) : 0;
  const staleGoals = goals.filter(g => ['overdue', 'on_hold'].includes(g.status ?? g.data?.status)).length;

  // Learning Velocity
  const completedLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) === 'completed').length;
  const learningRate = assignedLearning.length > 0 ? Math.round((completedLearning / assignedLearning.length) * 100) : 0;
  const incompleteLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) !== 'completed').length;
  const velocityLabel = learningRate >= 70 ? 'High' : learningRate >= 50 ? 'Moderate' : 'Low';
  const velocityColor = learningRate >= 70 ? 'bg-green-100 text-green-700' : learningRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  // Top risk / opportunity
  const topRisk = strategicRisks?.[0] || (metrics.atRiskLeaders > 0 ? {
    title: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? 's' : ''} below threshold`,
    severity: 'High',
    description: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? 's are' : ' is'} scoring below 60% — indicating potential capability gaps.`
  } : null);
  const topOpp = strategicOpportunities?.[0] || (metrics.highPotentialLeaders > 0 ? {
    title: `${metrics.highPotentialLeaders} high-potential leader${metrics.highPotentialLeaders !== 1 ? 's' : ''} ready for advancement`,
    potential: 'High',
    description: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders !== 1 ? 's are' : ' is'} scoring 85%+ and may be ready for expanded responsibilities.`
  } : null);

  // All risks for accordion-style display
  const allRisks = strategicRisks?.length > 0 ? strategicRisks : (() => {
    const derived = [];
    if (metrics.atRiskLeaders > 0) derived.push({ title: 'Leaders Below Performance Threshold', description: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? 's are' : ' is'} scoring below 60%.`, severity: 'High' });
    if (metrics.competencyAverages.dm < 65) derived.push({ title: 'Decision-Making Gap Detected', description: `Org-wide DM average is ${metrics.competencyAverages.dm}%, below the 65% target.`, severity: 'Medium' });
    if (metrics.competencyAverages.rm < 65) derived.push({ title: 'Resource Management Deficit', description: `RM scores average ${metrics.competencyAverages.rm}% — correlates with project overruns.`, severity: 'Medium' });
    return derived.slice(0, 3);
  })();

  const allOpps = strategicOpportunities?.length > 0 ? strategicOpportunities : (() => {
    const derived = [];
    if (metrics.highPotentialLeaders > 0) derived.push({ title: 'High-Potential Leaders Ready for Advancement', description: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders !== 1 ? 's are' : ' is'} scoring 85%+.`, potential: 'High' });
    if (metrics.competencyAverages.comm >= 70) derived.push({ title: 'Communication Strength to Leverage', description: `Communication scores average ${metrics.competencyAverages.comm}% — above target threshold.`, potential: 'Medium' });
    if (metrics.competencyAverages.si >= 70) derived.push({ title: 'Strong Situational Intelligence Baseline', description: `SI averages ${metrics.competencyAverages.si}% — a strong foundation for strategic decisions.`, potential: 'Medium' });
    return derived.slice(0, 3);
  })();

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Organizational Leadership Health
        </CardTitle>
        <p className="text-xs text-gray-500">Manager Effectiveness, skill gaps, risk signals, and industry benchmarks</p>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Row 1: Radar + Flight Risk & Learning Velocity side by side */}
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Radar — left column */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-indigo-900">Leadership Index Score</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-indigo-700">{meIndex}%</span>
                <Badge className={meTier.color}>{meTier.label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-indigo-600 mb-2">
              <GitBranch className="w-3 h-3" />
              <span>Decision Quality: <strong>{decisionQuality}%</strong></span>
            </div>
            <div className="flex items-center gap-3 mb-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-indigo-600" /> Score</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-amber-400" /> Benchmark</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                <PolarGrid stroke="#c7d2fe" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#4338ca", fontWeight: 600 }} />
                <Radar name="Score" dataKey="score" stroke="#3730a3" fill="#a5b4fc" fillOpacity={0.5} strokeWidth={2} />
                <Radar name="Benchmark" dataKey="benchmark" stroke="#f59e0b" fill="transparent" strokeDasharray="4 3" strokeWidth={1.5} />
                <Tooltip formatter={(val, name) => [`${val}%`, name === 'score' ? 'Org Score' : 'Benchmark']} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 border-t border-indigo-200 pt-2">
              {scoreRows.map(({ key, score, target }) => (
                <div key={key} className="flex items-baseline gap-0.5 text-[10px]">
                  <span className="font-bold text-indigo-800">{key}</span>
                  <span className="text-gray-600">{score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Flight Risk stacked on Learning Velocity */}
          <div className="space-y-3">
            {/* Flight Risk */}
            <div className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-gray-700">Flight Risk Signals</span>
                <span className={`ml-auto text-base font-bold ${flightRiskPct > 20 ? 'text-red-600' : flightRiskPct > 10 ? 'text-yellow-600' : 'text-green-600'}`}>{flightRiskPct}%</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Low scores</span>
                  <span className="font-medium">{lowScorers}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block" />Stale goals</span>
                  <span className="font-medium">{staleGoals}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />Incomplete learning</span>
                  <span className="font-medium">{incompleteLearning}</span>
                </div>
              </div>
            </div>

            {/* Learning Velocity */}
            <div className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-xs font-semibold text-gray-700">Learning Velocity</span>
                <div className="ml-auto flex items-center gap-1">
                  <span className={`text-base font-bold ${learningRate >= 70 ? 'text-green-600' : learningRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{learningRate}%</span>
                  <Badge className={velocityColor + " text-[10px] px-1 py-0"}>{velocityLabel}</Badge>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />Completed</span>
                  <span className="font-medium">{completedLearning}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full inline-block" />Remaining</span>
                  <span className="font-medium">{incompleteLearning}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />Total assigned</span>
                  <span className="font-medium">{assignedLearning.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Risks + Opportunities side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Risks */}
          {allRisks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-semibold text-gray-700">Top Strategic Risks</span>
              </div>
              <div className="space-y-2">
                {allRisks.map((risk, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-2.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    onClick={() => onPromptAtreus?.(`I have a strategic risk: "${risk.title}". ${risk.description || ''} Help me develop an action plan to address this.`)}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">{risk.severity}</Badge>
                      <span className="text-xs font-semibold text-red-800 leading-tight">{risk.title}</span>
                    </div>
                    {risk.description && <p className="text-[10px] text-red-700 leading-tight line-clamp-2">{risk.description}</p>}
                    <p className="text-[10px] text-red-400 mt-0.5">Ask Atreus →</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Top Opportunities */}
          {allOpps.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-semibold text-gray-700">Top Strategic Opportunities</span>
              </div>
              <div className="space-y-2">
                {allOpps.map((opp, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-2.5 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                    onClick={() => onPromptAtreus?.(`I have a strategic opportunity: "${opp.title}". ${opp.description || ''} Help me create a plan to capitalise on this.`)}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">{opp.potential}</Badge>
                      <span className="text-xs font-semibold text-green-800 leading-tight">{opp.title}</span>
                    </div>
                    {opp.description && <p className="text-[10px] text-green-700 leading-tight line-clamp-2">{opp.description}</p>}
                    <p className="text-[10px] text-green-400 mt-0.5">Ask Atreus →</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}