import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Minus, Users, Target, BookOpen,
  AlertTriangle, CheckCircle, Brain, RefreshCw, Loader2,
  Shield, Star, ArrowUpRight, Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

const INDUSTRY_BENCHMARKS = {
  dm: 77, si: 75, comm: 78, rm: 78, sm: 79, pm: 76
};

const COMPETENCY_LABELS = {
  dm: "Decision Making", si: "Situational Intelligence",
  comm: "Communication", rm: "Resource Management",
  sm: "Stakeholder Management", pm: "Performance Management"
};

function MetricCard({ title, value, unit = "", trend, trendLabel, benchmark, color, icon: Icon, description }) {
  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500";
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const vsBenchmark = benchmark ? value - benchmark : null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-md h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{trendLabel}</span>
              </div>
            )}
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            <span className="text-sm text-gray-500 ml-1">{unit}</span>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
          {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
          {vsBenchmark !== null && (
            <div className={`text-xs font-medium ${vsBenchmark >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {vsBenchmark >= 0 ? '▲' : '▼'} {Math.abs(vsBenchmark).toFixed(1)}% vs. industry benchmark
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RiskPill({ label, level }) {
  const config = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config[level] || config.low}`}>
      {label}
    </span>
  );
}

export default function ExecutiveDashboardView({ user }) {
  const [loading, setLoading] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [assignedLearning, setAssignedLearning] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [briefing, setBriefing] = useState("");
  const [risks, setRisks] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const clientId = user?.client_id || user?.data?.client_id;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, g, l, u] = await Promise.all([
        base44.entities.Assessment.list('-created_date', 500).catch(() => []),
        base44.entities.Goal.list('-created_date', 500).catch(() => []),
        base44.entities.AssignedLearning.list('-created_date', 500).catch(() => []),
        (clientId
          ? base44.entities.User.filter({ client_id: clientId })
          : base44.entities.User.list()
        ).catch(() => [])
      ]);
      setAssessments(a || []);
      setGoals(g || []);
      setAssignedLearning(l || []);
      setAllUsers(Array.isArray(u) ? u : []);
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const af = (a, f) => a[f] ?? a.data?.[f] ?? 0;
    const total = assessments.length || 1;

    const competencyAverages = {
      dm: Math.round(assessments.reduce((s, a) => s + af(a, 'dm_pct'), 0) / total),
      si: Math.round(assessments.reduce((s, a) => s + af(a, 'si_pct'), 0) / total),
      comm: Math.round(assessments.reduce((s, a) => s + af(a, 'comm_pct'), 0) / total),
      rm: Math.round(assessments.reduce((s, a) => s + af(a, 'rm_pct'), 0) / total),
      sm: Math.round(assessments.reduce((s, a) => s + af(a, 'sm_pct'), 0) / total),
      pm: Math.round(assessments.reduce((s, a) => s + af(a, 'pm_pct'), 0) / total),
    };

    const managerEffectivenessIndex = Math.round(
      competencyAverages.dm * 0.35 +
      competencyAverages.si * 0.30 +
      competencyAverages.comm * 0.20 +
      competencyAverages.pm * 0.15
    );

    const avgLeadershipScore = Math.round(
      assessments.reduce((s, a) => s + af(a, 'overall_pct'), 0) / total
    );

    const atRiskCount = assessments.filter(a => af(a, 'overall_pct') < 60).length;
    const highPotentialCount = assessments.filter(a => af(a, 'overall_pct') >= 85).length;

    const completedGoals = goals.filter(g => (g.status ?? g.data?.status) === 'completed').length;
    const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

    const completedLearning = assignedLearning.filter(l => (l.status ?? l.data?.status) === 'completed').length;
    const learningCompletionRate = assignedLearning.length > 0 ? Math.round((completedLearning / assignedLearning.length) * 100) : 0;

    const successionCoverage = highPotentialCount > 0 ? Math.min(100, Math.round((highPotentialCount / Math.max(1, assessments.length)) * 100 * 3)) : 0;

    return {
      competencyAverages, managerEffectivenessIndex, avgLeadershipScore,
      atRiskCount, highPotentialCount, goalCompletionRate, learningCompletionRate,
      totalAssessments: assessments.length, totalUsers: allUsers.length,
      successionCoverage,
    };
  }, [assessments, goals, assignedLearning, allUsers]);

  const radarData = useMemo(() => {
    return Object.entries(COMPETENCY_LABELS).map(([key, label]) => ({
      subject: label.split(' ')[0],
      fullLabel: label,
      score: metrics.competencyAverages[key] || 0,
      benchmark: INDUSTRY_BENCHMARKS[key],
    }));
  }, [metrics]);

  const overallRiskLevel = useMemo(() => {
    if (metrics.atRiskCount > metrics.totalAssessments * 0.2) return 'high';
    if (metrics.atRiskCount > metrics.totalAssessments * 0.1) return 'medium';
    return 'low';
  }, [metrics]);

  const generateBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strategic advisor to a Chief People Officer (CPO) at Nemours Children's Hospital. Write a concise 2-paragraph executive briefing focused on leadership effectiveness and its correlation to organizational stability and patient outcomes.

Current Leadership Data:
- Manager Effectiveness Index: ${metrics.managerEffectivenessIndex}% (weighted: DM 35%, SI 30%, Comm 20%, PM 15%)
- Overall Leadership Score: ${metrics.avgLeadershipScore}%
- Decision Making: ${metrics.competencyAverages.dm}% (benchmark: ${INDUSTRY_BENCHMARKS.dm}%)
- Situational Intelligence: ${metrics.competencyAverages.si}% (benchmark: ${INDUSTRY_BENCHMARKS.si}%)
- At-Risk Leaders (below 60%): ${metrics.atRiskCount} of ${metrics.totalAssessments}
- High-Potential Leaders (above 85%): ${metrics.highPotentialCount}
- Goal Completion Rate: ${metrics.goalCompletionRate}%
- Learning Completion Rate: ${metrics.learningCompletionRate}%
- Succession Pipeline Coverage: ${metrics.successionCoverage}%

Write in a professional, data-driven executive tone. Highlight the top 1-2 strategic priorities. Do NOT use bullet points — write in flowing paragraph form.`,
        response_json_schema: {
          type: "object",
          properties: {
            briefing: { type: "string" },
            risks: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, severity: { type: "string" } } }
            },
            opportunities: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } }
            }
          }
        }
      });
      setBriefing(result?.briefing || "");
      setRisks(result?.risks?.slice(0, 3) || []);
      setOpportunities(result?.opportunities?.slice(0, 3) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  useEffect(() => {
    if (!loading && metrics.totalAssessments > 0 && !briefing) {
      generateBriefing();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const meIndex = metrics.managerEffectivenessIndex;
  const meStatus = meIndex >= 80 ? { label: "Strong", color: "bg-green-100 text-green-800" }
    : meIndex >= 65 ? { label: "Developing", color: "bg-amber-100 text-amber-800" }
    : { label: "At Risk", color: "bg-red-100 text-red-800" };

  return (
    <div className="space-y-8">
      {/* Strategic Risk Banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className={`rounded-xl p-4 flex items-center justify-between ${
          overallRiskLevel === 'high' ? 'bg-red-50 border border-red-200' :
          overallRiskLevel === 'medium' ? 'bg-amber-50 border border-amber-200' :
          'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${
              overallRiskLevel === 'high' ? 'text-red-600' :
              overallRiskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'
            }`} />
            <div>
              <span className="font-semibold text-sm text-gray-900">Strategic Risk Level: </span>
              <RiskPill label={overallRiskLevel.charAt(0).toUpperCase() + overallRiskLevel.slice(1)} level={overallRiskLevel} />
            </div>
          </div>
          <span className="text-xs text-gray-500">{metrics.atRiskCount} of {metrics.totalAssessments} leaders scored below 60%</span>
        </div>
      </motion.div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Manager Effectiveness Index"
          value={meIndex}
          unit="%"
          color="bg-indigo-600"
          icon={Brain}
          description="DM + SI + Comm + PM weighted"
          trend={meIndex >= 70 ? 1 : -1}
          trendLabel={meStatus.label}
        />
        <MetricCard
          title="Overall Leadership Score"
          value={metrics.avgLeadershipScore}
          unit="%"
          color="bg-blue-600"
          icon={Star}
          benchmark={76}
          trend={metrics.avgLeadershipScore >= 76 ? 1 : -1}
          trendLabel={`${Math.abs(metrics.avgLeadershipScore - 76)}% vs target`}
        />
        <MetricCard
          title="High-Potential Leaders"
          value={metrics.highPotentialCount}
          unit="leaders"
          color="bg-emerald-600"
          icon={ArrowUpRight}
          description="Scored 85% or above"
          trend={metrics.highPotentialCount > 0 ? 1 : 0}
          trendLabel={`${Math.round((metrics.highPotentialCount / Math.max(1, metrics.totalAssessments)) * 100)}% of cohort`}
        />
        <MetricCard
          title="Succession Coverage"
          value={metrics.successionCoverage}
          unit="%"
          color="bg-purple-600"
          icon={Shield}
          description="Critical roles with ready successors"
          trend={metrics.successionCoverage >= 60 ? 1 : -1}
          trendLabel={metrics.successionCoverage >= 60 ? "Healthy" : "Needs attention"}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Decision Making"
          value={metrics.competencyAverages.dm}
          unit="%"
          color="bg-teal-600"
          icon={Target}
          benchmark={INDUSTRY_BENCHMARKS.dm}
          trend={metrics.competencyAverages.dm >= INDUSTRY_BENCHMARKS.dm ? 1 : -1}
          trendLabel="Primary ME driver"
        />
        <MetricCard
          title="Situational Intelligence"
          value={metrics.competencyAverages.si}
          unit="%"
          color="bg-violet-600"
          icon={Activity}
          benchmark={INDUSTRY_BENCHMARKS.si}
          trend={metrics.competencyAverages.si >= INDUSTRY_BENCHMARKS.si ? 1 : -1}
          trendLabel="Primary ME driver"
        />
        <MetricCard
          title="Goal Completion Rate"
          value={metrics.goalCompletionRate}
          unit="%"
          color="bg-sky-600"
          icon={CheckCircle}
          description={`${goals.length} total goals tracked`}
          trend={metrics.goalCompletionRate >= 70 ? 1 : -1}
          trendLabel={metrics.goalCompletionRate >= 70 ? "On track" : "Below target"}
        />
        <MetricCard
          title="Learning Completion"
          value={metrics.learningCompletionRate}
          unit="%"
          color="bg-orange-600"
          icon={BookOpen}
          description={`${assignedLearning.length} assignments tracked`}
          trend={metrics.learningCompletionRate >= 70 ? 1 : -1}
          trendLabel={metrics.learningCompletionRate >= 70 ? "On track" : "Below target"}
        />
      </div>

      {/* Radar Chart + AI Briefing */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg h-full">
            <CardHeader>
              <CardTitle className="text-base">Competency Radar vs. Industry Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Your Org" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} />
                  <Radar name="Industry" dataKey="benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeDasharray="4 4" />
                  <Tooltip formatter={(val, name) => [`${val}%`, name]} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-600 inline-block"></span>Your Org</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400 inline-block border-dashed border-t"></span>Industry Benchmark</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                AI Executive Briefing
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={generateBriefing} disabled={generatingBriefing} title="Regenerate briefing">
                {generatingBriefing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              {generatingBriefing ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Generating executive briefing...</span>
                </div>
              ) : briefing ? (
                <p className="text-sm text-gray-700 leading-relaxed">{briefing}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No briefing generated yet. Click refresh to generate.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Strategic Risks & Opportunities */}
      {(risks.length > 0 || opportunities.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {risks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-red-400">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    Strategic Risks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {risks.map((r, i) => (
                    <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{r.title}</span>
                        {r.severity && <RiskPill label={r.severity} level={r.severity?.toLowerCase() === 'high' ? 'high' : r.severity?.toLowerCase() === 'medium' ? 'medium' : 'low'} />}
                      </div>
                      <p className="text-xs text-gray-600">{r.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {opportunities.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="border-0 shadow-lg border-l-4 border-l-green-400">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    Strategic Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {opportunities.map((o, i) => (
                    <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="font-medium text-sm text-gray-900 mb-1">{o.title}</p>
                      <p className="text-xs text-gray-600">{o.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Talent Snapshot */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-700" />
              Talent Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{metrics.totalAssessments}</div>
                <div className="text-xs text-gray-500 mt-1">Leaders Assessed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{metrics.atRiskCount}</div>
                <div className="text-xs text-gray-500 mt-1">At-Risk Leaders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{metrics.highPotentialCount}</div>
                <div className="text-xs text-gray-500 mt-1">High-Potential Leaders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{metrics.totalUsers}</div>
                <div className="text-xs text-gray-500 mt-1">Total Users in Org</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}