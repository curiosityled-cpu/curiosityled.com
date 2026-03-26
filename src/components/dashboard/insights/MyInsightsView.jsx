import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  Target,
  BookOpen,
  Award,
  Brain,
  Loader2,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Map,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Star,
  Eye,
  Clock
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";

// ─── Sub-components ───────────────────────────────────────────────

function InsightCard({ insight, onAction }) {
  const [expanded, setExpanded] = useState(false);

  const badgeClass = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  }[insight.priority?.toLowerCase()] || 'bg-gray-100 text-gray-700';

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="border rounded-lg bg-white hover:shadow-md transition-shadow">
        <CollapsibleTrigger className="w-full">
          <div className="p-4 flex items-start justify-between">
            <div className="flex-1 text-left">
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge className={badgeClass}>{insight.priority || 'Medium'}</Badge>
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            {insight.recommended_action && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800">{insight.recommended_action}</p>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => onAction(insight.action_type || 'update_goals')} className="gap-2">
              Take Action <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ProcessingPlaceholder({ label }) {
  return (
    <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
      <Clock className="w-4 h-4 shrink-0" />
      <span>{label || 'Insights processing...'}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function MyInsightsView({ user, onMetricsUpdate }) {
  const [loading, setLoading] = useState(true);
  // Stored AI insights from AssessmentInsights entity
  const [storedInsight, setStoredInsight] = useState(null);
  // Computed metrics from backend (no OpenAI, just data math)
  const [metrics, setMetrics] = useState(null);
  // Raw assessment for competency radar
  const [latestAssessment, setLatestAssessment] = useState(null);

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Parallel: stored insights + latest assessment + basic goal/learning counts
      const [insights, assessments, goals, assignedLearning, journeyEnrollments] = await Promise.all([
        base44.entities.AssessmentInsights.filter({ user_email: user.email, status: 'generated' }, '-created_date', 1).catch(() => []),
        base44.entities.Assessment.filter({ email: user.email }, '-submission_ts', 5).catch(() => []),
        base44.entities.Goal.filter({ created_by: user.email }).catch(() => []),
        base44.entities.AssignedLearning.filter({ user_email: user.email }).catch(() => []),
        base44.entities.JourneyEnrollment.filter({ user_email: user.email }).catch(() => []),
      ]);

      const best = insights[0] || null;
      setStoredInsight(best);

      const latest = assessments[0] || null;
      setLatestAssessment(latest);

      // Compute simple metrics locally — no AI needed
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
      const completedLearning = assignedLearning.filter(l => l.status === 'completed').length;
      const learningRate = assignedLearning.length > 0 ? Math.round((completedLearning / assignedLearning.length) * 100) : 0;
      const overdueGoals = goals.filter(g => g.status === 'overdue').length;

      const computed = {
        currentAssessmentScore: latest?.overall_pct ?? null,
        goalCompletionRate,
        learningRate,
        overdueGoals,
        activeGoals: goals.filter(g => ['active', 'at_risk', 'overdue'].includes(g.status)).length,
        activeJourneys: journeyEnrollments.filter(j => j.status === 'in_progress').length,
      };
      setMetrics(computed);

      if (onMetricsUpdate) {
        const insightCount = (best?.top_strengths?.length || 0) + (best?.development_areas?.length || 0) + (best?.recommendations?.length || 0);
        onMetricsUpdate({
          totalInsights: insightCount,
          actionItems: overdueGoals,
          completionRate: goalCompletionRate,
        });
      }
    } catch (err) {
      console.error('[MyInsightsView] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    const routes = {
      take_assessment: 'LeadershipAssessment',
      update_goals: 'Performance',
      view_learning: 'LearningLibrary',
      continue_journey: 'MyJourneys',
      view_career_path: 'CareerPathExplorer',
      update_profile: 'Profile',
    };
    const page = routes[action];
    if (page) window.location.href = createPageUrl(page);
    else toast.info('Action not implemented');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Derive display data from stored insight ──────────────────────
  const hasInsight = !!storedInsight;

  const radarData = latestAssessment ? [
    { competency: 'SI',   score: latestAssessment.si_pct   || 0, fullName: 'Situational Intelligence' },
    { competency: 'DM',   score: latestAssessment.dm_pct   || 0, fullName: 'Decision Making' },
    { competency: 'Comm', score: latestAssessment.comm_pct || 0, fullName: 'Communication' },
    { competency: 'RM',   score: latestAssessment.rm_pct   || 0, fullName: 'Resource Management' },
    { competency: 'SM',   score: latestAssessment.sm_pct   || 0, fullName: 'Stakeholder Management' },
    { competency: 'PM',   score: latestAssessment.pm_pct   || 0, fullName: 'Performance Management' },
  ] : null;

  // Build insight cards from stored data
  const insightCards = hasInsight ? [
    storedInsight.summary && {
      title: 'Your Leadership Profile',
      description: storedInsight.summary,
      priority: 'medium',
      action_type: 'take_assessment',
    },
    ...(storedInsight.recommendations || []).slice(0, 3).map(rec => ({
      title: 'Recommendation',
      description: rec,
      priority: 'medium',
      action_type: 'view_learning',
    })),
  ].filter(Boolean) : [];

  return (
    <div className="space-y-6">

      {/* ── Leader Profile (stored AI) ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Your Leader Profile</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Derived from your latest assessment</p>
                </div>
              </div>
              {hasInsight && storedInsight.archetype && (
                <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                  {storedInsight.archetype}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasInsight ? (
              <p className="text-gray-700 leading-relaxed">
                {storedInsight.summary || 'Your personalized summary is ready.'}
              </p>
            ) : (
              <ProcessingPlaceholder label="Insights processing... Complete an assessment to generate your leader profile." />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Insights Cards ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>AI-Generated Insights</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Personalized recommendations based on your assessment</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {insightCards.length > 0 ? (
              <div className="space-y-3">
                {insightCards.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} onAction={handleQuickAction} />
                ))}
              </div>
            ) : (
              <ProcessingPlaceholder label="Insights processing... Complete your assessment to unlock personalized recommendations." />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Strengths / Development / Risk Flags ────────────────── */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Strengths */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-green-600" />
                <CardTitle className="text-base">Your Strengths</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {hasInsight && storedInsight.top_strengths?.length > 0 ? (
                <ul className="space-y-2">
                  {storedInsight.top_strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ProcessingPlaceholder />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Development Areas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base">Development Areas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {hasInsight && storedInsight.development_areas?.length > 0 ? (
                <ul className="space-y-2">
                  {storedInsight.development_areas.map((d, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Target className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ProcessingPlaceholder />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Risk Flags */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-lg h-full border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-red-600" />
                <CardTitle className="text-base">Watch Areas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {hasInsight && storedInsight.risk_flags?.length > 0 ? (
                <ul className="space-y-2">
                  {storedInsight.risk_flags.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{r.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ProcessingPlaceholder />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Performance Metrics (computed locally) ──────────────── */}
      {metrics && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle>Performance Snapshot</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {metrics.currentAssessmentScore != null ? `${metrics.currentAssessmentScore}%` : '—'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Assessment Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{metrics.goalCompletionRate}%</div>
                  <div className="text-sm text-gray-600 mt-1">Goal Completion</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{metrics.learningRate}%</div>
                  <div className="text-sm text-gray-600 mt-1">Learning Completion</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${metrics.overdueGoals > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics.overdueGoals}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Overdue Goals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Competency Radar (from raw assessment scores) ───────── */}
      {radarData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Competency Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Your Scores" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <RechartsTooltip formatter={(value, name, props) => [`${value}%`, props.payload.fullName]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Recommendations (from stored insight) ───────────────── */}
      {hasInsight && storedInsight.recommendations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-lg border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {storedInsight.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-900">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-blue-50" onClick={() => handleQuickAction('update_goals')}>
                <Target className="w-5 h-5 text-blue-600 mb-2" />
                <span className="font-semibold">Update Goals</span>
                <span className="text-xs text-gray-500 mt-1">Track your progress</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-purple-50" onClick={() => handleQuickAction('take_assessment')}>
                <BarChart3 className="w-5 h-5 text-purple-600 mb-2" />
                <span className="font-semibold">Take Assessment</span>
                <span className="text-xs text-gray-500 mt-1">Measure your growth</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-green-50" onClick={() => handleQuickAction('view_learning')}>
                <BookOpen className="w-5 h-5 text-green-600 mb-2" />
                <span className="font-semibold">Browse Learning</span>
                <span className="text-xs text-gray-500 mt-1">Find resources</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col items-start hover:bg-indigo-50" onClick={() => handleQuickAction('view_career_path')}>
                <Map className="w-5 h-5 text-indigo-600 mb-2" />
                <span className="font-semibold">Explore Careers</span>
                <span className="text-xs text-gray-500 mt-1">Plan your path</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}