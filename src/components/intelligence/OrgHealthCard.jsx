import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCheck, TrendingUp, TrendingDown, AlertTriangle, Target, BarChart3, Zap, GitBranch, Shield } from "lucide-react";

/**
 * Organizational Leadership Health Card
 * Consolidates: Manager Effectiveness Index, Skill Gap Analysis, Top Strategic Risks,
 * Top Strategic Opportunities, Flight Risk Indicators, Decision-Making Quality,
 * Industry Benchmark Comparison
 */
export default function OrgHealthCard({ metrics, assessments, goals, assignedLearning, strategicRisks, strategicOpportunities, onPromptAtreus }) {
  const { competencyAverages } = metrics;

  // Manager Effectiveness Index
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

  // Industry benchmark gaps (Corporate/Private, Mid-Level)
  const benchmarks = [
    { label: "Decision Making", score: competencyAverages.dm, target: 77 },
    { label: "Situational Intel.", score: competencyAverages.si, target: 75 },
    { label: "Communication", score: competencyAverages.comm, target: 78 },
    { label: "Resource Mgmt", score: competencyAverages.rm, target: 78 },
    { label: "Stakeholder Mgmt", score: competencyAverages.sm, target: 79 },
    { label: "Performance Mgmt", score: competencyAverages.pm, target: 76 },
  ];
  const topGaps = [...benchmarks].sort((a, b) => (a.score - a.target) - (b.score - b.target)).slice(0, 3);

  // Flight risk
  const lowScorers = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) < 50).length;
  const totalUsers = new Set([
    ...assessments.map(a => a.email ?? a.data?.email),
    ...goals.map(g => g.user_email ?? g.data?.user_email)
  ]).size;
  const flightRiskPct = totalUsers > 0 ? Math.round((lowScorers / totalUsers) * 100) : 0;
  const staleGoals = goals.filter(g => ['overdue', 'on_hold'].includes(g.status ?? g.data?.status)).length;

  // Top risk / opportunity (AI or derived)
  const topRisk = strategicRisks?.[0] || (metrics.atRiskLeaders > 0 ? {
    title: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? 's' : ''} below threshold`,
    severity: 'High'
  } : null);
  const topOpp = strategicOpportunities?.[0] || (metrics.highPotentialLeaders > 0 ? {
    title: `${metrics.highPotentialLeaders} high-potential leader${metrics.highPotentialLeaders !== 1 ? 's' : ''} ready for advancement`,
    potential: 'High'
  } : null);

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

        {/* Manager Effectiveness Index */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-900">Manager Effectiveness Index</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-indigo-700">{meIndex}%</span>
              <Badge className={meTier.color}>{meTier.label}</Badge>
            </div>
          </div>
          <Progress value={meIndex} className="h-2 mb-2" />
          <div className="flex items-center justify-between text-xs text-indigo-600">
            <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> Decision Quality: <strong>{decisionQuality}%</strong></span>
            <span className="text-indigo-400">DM 35% · SI 30% · Comm 20% · PM 15%</span>
          </div>
        </div>

        {/* Two-column: Benchmarks + Flight Risk */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Benchmark Gaps */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700">Top Benchmark Gaps</span>
            </div>
            <div className="space-y-2">
              {topGaps.map((b, i) => {
                const diff = b.score - b.target;
                const isBelow = diff < 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-600 truncate">{b.label}</span>
                      <span className={isBelow ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {isBelow ? '' : '+'}{diff}%
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`absolute h-full rounded-full ${isBelow ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${Math.min(b.score, 100)}%` }} />
                      <div className="absolute h-full w-px bg-gray-700" style={{ left: `${Math.min(b.target, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-gray-400 mt-1">| = Corporate/Private mid-level target</p>
            </div>
          </div>

          {/* Flight Risk */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-gray-700">Flight Risk Signals</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">At elevated risk</span>
                <span className={`text-lg font-bold ${flightRiskPct > 20 ? 'text-red-600' : flightRiskPct > 10 ? 'text-yellow-600' : 'text-green-600'}`}>{flightRiskPct}%</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block" />Low scores (&lt;50%)</span>
                  <span className="font-medium">{lowScorers}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" />Stale/overdue goals</span>
                  <span className="font-medium">{staleGoals}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full inline-block" />Incomplete learning</span>
                  <span className="font-medium">{assignedLearning.filter(l => (l.status ?? l.data?.status) !== 'completed').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Risk & Opportunity */}
        <div className="grid grid-cols-2 gap-3">
          {topRisk && (
            <button
              className="text-left p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              onClick={() => onPromptAtreus?.(`I have a strategic risk: "${topRisk.title}". Help me develop an action plan to address this.`)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-semibold text-red-800">Top Risk</span>
                {topRisk.severity && <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">{topRisk.severity}</Badge>}
              </div>
              <p className="text-xs text-red-700 leading-tight">{topRisk.title}</p>
              <p className="text-[10px] text-red-500 mt-1">Click to ask Atreus →</p>
            </button>
          )}
          {topOpp && (
            <button
              className="text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              onClick={() => onPromptAtreus?.(`I have a strategic opportunity: "${topOpp.title}". Help me create a plan to capitalise on this.`)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-800">Top Opportunity</span>
                {topOpp.potential && <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">{topOpp.potential}</Badge>}
              </div>
              <p className="text-xs text-green-700 leading-tight">{topOpp.title}</p>
              <p className="text-[10px] text-green-500 mt-1">Click to ask Atreus →</p>
            </button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}