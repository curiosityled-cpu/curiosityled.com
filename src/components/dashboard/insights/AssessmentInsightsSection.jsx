import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, TrendingUp, TrendingDown, Users, AlertTriangle,
  BarChart3, Award, Target
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export default function AssessmentInsightsSection({ assessments, programs, participantEmails }) {
  const insights = useMemo(() => {
    if (!assessments || assessments.length === 0) {
      return {
        totalAssessments: 0,
        avgScore: 0,
        completionRate: 0,
        scoreDistribution: [],
        competencyBreakdown: [],
        recentTrend: 0,
        topPerformers: [],
        needsAttention: []
      };
    }

    // Basic metrics
    const totalAssessments = assessments.length;
    const avgScore = Math.round(assessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / totalAssessments);
    
    // Completion rate (participants who have taken at least one assessment)
    const participantsWithAssessments = [...new Set(assessments.map(a => a.email))].length;
    const completionRate = participantEmails.length > 0 
      ? Math.round((participantsWithAssessments / participantEmails.length) * 100)
      : 0;

    // Score distribution
    const scoreRanges = [
      { name: '0-20%', min: 0, max: 20, count: 0 },
      { name: '21-40%', min: 21, max: 40, count: 0 },
      { name: '41-60%', min: 41, max: 60, count: 0 },
      { name: '61-80%', min: 61, max: 80, count: 0 },
      { name: '81-100%', min: 81, max: 100, count: 0 }
    ];
    
    assessments.forEach(a => {
      const score = a.overall_pct || 0;
      const range = scoreRanges.find(r => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    // Competency breakdown (average scores per competency)
    const competencyScores = {
      'Situational Intelligence': { total: 0, count: 0 },
      'Decision Making': { total: 0, count: 0 },
      'Communication': { total: 0, count: 0 },
      'Resource Management': { total: 0, count: 0 },
      'Stakeholder Management': { total: 0, count: 0 },
      'Performance Management': { total: 0, count: 0 }
    };

    assessments.forEach(a => {
      if (a.si_pct) { competencyScores['Situational Intelligence'].total += a.si_pct; competencyScores['Situational Intelligence'].count++; }
      if (a.dm_pct) { competencyScores['Decision Making'].total += a.dm_pct; competencyScores['Decision Making'].count++; }
      if (a.comm_pct) { competencyScores['Communication'].total += a.comm_pct; competencyScores['Communication'].count++; }
      if (a.rm_pct) { competencyScores['Resource Management'].total += a.rm_pct; competencyScores['Resource Management'].count++; }
      if (a.sm_pct) { competencyScores['Stakeholder Management'].total += a.sm_pct; competencyScores['Stakeholder Management'].count++; }
      if (a.pm_pct) { competencyScores['Performance Management'].total += a.pm_pct; competencyScores['Performance Management'].count++; }
    });

    const competencyBreakdown = Object.entries(competencyScores)
      .filter(([_, data]) => data.count > 0)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        score: Math.round(data.total / data.count)
      }))
      .sort((a, b) => b.score - a.score);

    // Recent trend (compare last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const recentAssessments = assessments.filter(a => new Date(a.submission_ts) > thirtyDaysAgo);
    const previousAssessments = assessments.filter(a => {
      const date = new Date(a.submission_ts);
      return date > sixtyDaysAgo && date <= thirtyDaysAgo;
    });

    const recentAvg = recentAssessments.length > 0 
      ? recentAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / recentAssessments.length
      : 0;
    const previousAvg = previousAssessments.length > 0
      ? previousAssessments.reduce((sum, a) => sum + (a.overall_pct || 0), 0) / previousAssessments.length
      : 0;
    
    const recentTrend = previousAvg > 0 ? Math.round(recentAvg - previousAvg) : 0;

    // Top performers
    const topPerformers = [...assessments]
      .sort((a, b) => (b.overall_pct || 0) - (a.overall_pct || 0))
      .slice(0, 5)
      .map(a => ({
        email: a.email,
        score: a.overall_pct,
        archetype: a.archetype_label
      }));

    // Needs attention (below 50%)
    const needsAttention = assessments
      .filter(a => (a.overall_pct || 0) < 50)
      .map(a => ({
        email: a.email,
        score: a.overall_pct,
        weakestArea: getWeakestArea(a)
      }));

    return {
      totalAssessments,
      avgScore,
      completionRate,
      scoreDistribution: scoreRanges,
      competencyBreakdown,
      recentTrend,
      topPerformers,
      needsAttention
    };
  }, [assessments, participantEmails]);

  function getWeakestArea(assessment) {
    const scores = {
      'Situational Intelligence': assessment.si_pct || 0,
      'Decision Making': assessment.dm_pct || 0,
      'Communication': assessment.comm_pct || 0,
      'Resource Management': assessment.rm_pct || 0,
      'Stakeholder Management': assessment.sm_pct || 0,
      'Performance Management': assessment.pm_pct || 0
    };
    const entries = Object.entries(scores).filter(([_, v]) => v > 0);
    if (entries.length === 0) return 'N/A';
    return entries.sort((a, b) => a[1] - b[1])[0][0];
  }

  if (assessments.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessment Data</h3>
          <p className="text-gray-500">No assessments have been completed by program participants yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold">{insights.totalAssessments}</p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold">{insights.avgScore}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
              {insights.recentTrend !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${insights.recentTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {insights.recentTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(insights.recentTrend)}% vs last month
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">{insights.completionRate}%</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <Progress value={insights.completionRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className={insights.needsAttention.length > 0 ? 'border-orange-200' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Needs Attention</p>
                  <p className="text-2xl font-bold">{insights.needsAttention.length}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${insights.needsAttention.length > 0 ? 'text-orange-400' : 'text-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500 mt-2">Scored below 50%</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score Distribution</CardTitle>
            <CardDescription>How participants are performing</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={insights.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Competency Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Competency Performance</CardTitle>
            <CardDescription>Average scores by competency area</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.competencyBreakdown.length > 0 ? (
              <div className="space-y-3">
                {insights.competencyBreakdown.map((comp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600" title={comp.fullName}>{comp.name}</span>
                      <span className="font-medium">{comp.score}%</span>
                    </div>
                    <Progress value={comp.score} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No competency data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Needs Attention */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.topPerformers.length > 0 ? (
              <div className="space-y-3">
                {insights.topPerformers.map((performer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{performer.email}</p>
                      {performer.archetype && (
                        <p className="text-xs text-gray-500">{performer.archetype}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {performer.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Needs Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.needsAttention.length > 0 ? (
              <div className="space-y-3">
                {insights.needsAttention.slice(0, 5).map((person, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{person.email}</p>
                      <p className="text-xs text-gray-500">Focus: {person.weakestArea}</p>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {person.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">All participants performing well!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}