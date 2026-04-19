import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, TrendingUp, Target, BookOpen, Brain,
  Loader2, BarChart3, CheckCircle, ArrowRight,
  Zap, AlertTriangle, ChevronDown, ChevronUp, Star,
  Clock, FileDown, User, Shield
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ── Competency color map ──────────────────────────────────────────
const COMPETENCY_COLORS = {
  si:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  dm:   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  comm: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  rm:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  sm:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500'   },
  pm:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500'   },
};

function scoreLabel(pct) {
  if (pct >= 85) return 'Mastery';
  if (pct >= 75) return 'Proficient';
  if (pct >= 65) return 'Developing';
  if (pct >= 50) return 'Emerging';
  return 'Foundation';
}

// ── Competency accordion row ──────────────────────────────────────
function CompetencyRow({ label, key: cKey, pct, definition, strengths, developmentFocus, colorKey }) {
  const [open, setOpen] = useState(false);
  const colors = COMPETENCY_COLORS[colorKey] || COMPETENCY_COLORS.si;
  const band = scoreLabel(pct);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${colors.text}`}>{label}</span>
                  <span className="text-xs text-gray-500">{pct}% · {band}</span>
                </div>
                {definition && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{definition}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <div className="w-24 hidden sm:block">
                <Progress value={pct} className="h-1.5" />
              </div>
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 grid sm:grid-cols-2 gap-3">
            {strengths && (
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Your Strength</p>
                <p className="text-sm text-gray-700">{strengths}</p>
              </div>
            )}
            {developmentFocus && (
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Development Focus</p>
                <p className="text-sm text-gray-700">{developmentFocus}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ── AI Insight accordion row ──────────────────────────────────────
function InsightRow({ icon: Icon, iconBg, iconColor, label, score, sublabel, content, priority }) {
  const [open, setOpen] = useState(false);
  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-gray-100 rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3 p-4">
            <div className={`p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900">{label}</span>
                {score && <span className="text-xs text-gray-500">{score}%</span>}
                {priority && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[priority] || priorityColors.medium}`}>
                    {priority}
                  </span>
                )}
              </div>
              {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">{content}</p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ProcessingPlaceholder({ label }) {
  return (
    <div className="flex items-center gap-2 py-8 text-gray-400 text-sm justify-center">
      <Clock className="w-4 h-4 shrink-0" />
      <span>{label || 'Complete an assessment to unlock your insights.'}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function MyInsightsView({ user, onMetricsUpdate }) {
  const [loading, setLoading] = useState(true);
  const [storedInsight, setStoredInsight] = useState(null);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (user?.email) loadData();
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
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
        onMetricsUpdate({ totalInsights: insightCount, actionItems: overdueGoals, completionRate: goalCompletionRate });
      }
    } catch (err) {
      console.error('[MyInsightsView] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  const hasInsight = !!storedInsight;
  const a = latestAssessment;

  const radarData = a ? [
    { competency: 'SI',   score: a.si_pct   || 0, fullName: 'Situational Intelligence' },
    { competency: 'DM',   score: a.dm_pct   || 0, fullName: 'Decision Making' },
    { competency: 'Comm', score: a.comm_pct || 0, fullName: 'Communication' },
    { competency: 'RM',   score: a.rm_pct   || 0, fullName: 'Resource Management' },
    { competency: 'SM',   score: a.sm_pct   || 0, fullName: 'Stakeholder Management' },
    { competency: 'PM',   score: a.pm_pct   || 0, fullName: 'Performance Management' },
  ] : null;

  const competencies = a ? [
    { label: 'Situational Intelligence', key: 'si',   pct: a.si_pct   || 0, colorKey: 'si',   definition: 'Reading context, predicting outcomes, and adapting to complexity.' },
    { label: 'Decision Making',          key: 'dm',   pct: a.dm_pct   || 0, colorKey: 'dm',   definition: 'Making sound judgments under pressure with available information.' },
    { label: 'Communication',            key: 'comm', pct: a.comm_pct || 0, colorKey: 'comm', definition: 'Conveying ideas clearly and adapting messages to different audiences.' },
    { label: 'Resource Management',      key: 'rm',   pct: a.rm_pct   || 0, colorKey: 'rm',   definition: 'Optimizing people, time, and budget to achieve outcomes efficiently.' },
    { label: 'Stakeholder Management',   key: 'sm',   pct: a.sm_pct   || 0, colorKey: 'sm',   definition: 'Building alignment and navigating organizational dynamics.' },
    { label: 'Performance Management',   key: 'pm',   pct: a.pm_pct   || 0, colorKey: 'pm',   definition: 'Setting expectations, developing people, and driving accountability.' },
  ].sort((x, y) => y.pct - x.pct) : [];

  const topStrength = competencies[0];
  const topDev = competencies[competencies.length - 1];

  return (
    <div className="space-y-6">

      {/* ── Header: Leadership Profile ───────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-[#0202ff]" />
                  <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Leadership Profile</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.full_name && !user.full_name.includes('@') ? user.full_name : 'Your Leadership Profile'}
                </h2>
                {a?.record?.role_level && (
                  <p className="text-sm text-gray-500 mt-0.5">{a.record.role_level}{a.record?.sector ? ` · ${a.record.sector}` : ''}</p>
                )}
              </div>
              {a?.overall_pct != null && (
                <div className="text-right flex-shrink-0">
                  <div className="text-4xl font-bold text-[#0202ff]">{a.overall_pct}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">Leadership Score</div>
                  <Badge className="mt-1 bg-[#0202ff]/10 text-[#0202ff] border-0 text-xs">
                    {scoreLabel(a.overall_pct)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Archetype banner */}
            {hasInsight && storedInsight.archetype && (
              <div className="bg-gradient-to-r from-[#0202ff]/8 to-blue-50 rounded-xl p-4 mb-4 border border-[#0202ff]/10">
                <p className="text-xs text-[#0202ff] font-semibold uppercase tracking-wider mb-1">Your Leadership Archetype</p>
                <p className="text-lg font-bold text-gray-900">{storedInsight.archetype}</p>
                {hasInsight && storedInsight.summary && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{storedInsight.summary}</p>
                )}
              </div>
            )}

            {!hasInsight && !a && (
              <ProcessingPlaceholder label="Complete your assessment to generate your leadership profile." />
            )}
          </div>

          {/* Radar chart */}
          {radarData && (
            <div className="px-6 pb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Competency Scores</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Your Score" dataKey="score" stroke="#0202ff" fill="#0202ff" fillOpacity={0.15} strokeWidth={2} />
                    <RechartsTooltip formatter={(value, name, props) => [`${value}%`, props.payload.fullName]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── AI-Powered Insights ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">AI-Powered Insights</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">Personalized analysis based on your leadership competency scores</p>

          {hasInsight ? (
            <div className="space-y-3">
              {/* Top Strength */}
              {topStrength && (
                <InsightRow
                  icon={Star}
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  label={`Top Strength: ${topStrength.label}`}
                  score={topStrength.pct}
                  sublabel="Your highest-performing leadership competency"
                  content={storedInsight.top_strengths?.[0] || `Your ${topStrength.label} score of ${topStrength.pct}% places you among strong performers. This is a key area to leverage in your leadership role.`}
                  priority="low"
                />
              )}

              {/* Top Development Priority */}
              {topDev && (
                <InsightRow
                  icon={Target}
                  iconBg="bg-red-100"
                  iconColor="text-red-600"
                  label={`Top Development Priority: ${topDev.label}`}
                  score={topDev.pct}
                  sublabel="Focus area for greatest leadership impact"
                  content={storedInsight.development_areas?.[0] || `Developing your ${topDev.label} capabilities will significantly strengthen your overall leadership effectiveness.`}
                  priority="high"
                />
              )}

              {/* Quick Tip */}
              {storedInsight.recommendations?.[0] && (
                <InsightRow
                  icon={Zap}
                  iconBg="bg-purple-100"
                  iconColor="text-purple-600"
                  label="Your Quick Tip"
                  sublabel="Highest-impact action you can take this week"
                  content={storedInsight.recommendations[0]}
                  priority="medium"
                />
              )}

              {/* Risk flags */}
              {storedInsight.risk_flags?.length > 0 && (
                <InsightRow
                  icon={AlertTriangle}
                  iconBg="bg-orange-100"
                  iconColor="text-orange-600"
                  label="Areas to Watch"
                  sublabel="Signals detected in your assessment pattern"
                  content={storedInsight.risk_flags.map(r => r.replace(/_/g, ' ')).join(' · ')}
                  priority="high"
                />
              )}

              {/* Analysis note */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start gap-2">
                <Brain className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  These insights are generated by analyzing your competency scores against leadership effectiveness research. Each recommendation is personalized to your specific profile.
                </p>
              </div>
            </div>
          ) : (
            <ProcessingPlaceholder label="Complete your assessment to unlock AI-powered insights." />
          )}
        </div>
      </motion.div>

      {/* ── Understanding Your Competencies ─────────────────────── */}
      {competencies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-[#0202ff]" />
              <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Understanding Your Competencies</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Each competency reflects specific leadership behaviors and their impact on your effectiveness</p>
            <div className="space-y-3">
              {competencies.map((c) => (
                <CompetencyRow
                  key={c.key}
                  label={c.label}
                  pct={c.pct}
                  definition={c.definition}
                  colorKey={c.colorKey}
                  strengths={
                    c.pct >= 70
                      ? (storedInsight?.top_strengths?.find(s => s.toLowerCase().includes(c.label.toLowerCase().split(' ')[0])) || null)
                      : null
                  }
                  developmentFocus={
                    c.pct < 70
                      ? (storedInsight?.development_areas?.find(d => d.toLowerCase().includes(c.label.toLowerCase().split(' ')[0])) || null)
                      : null
                  }
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Recommended Development Goals ───────────────────────── */}
      {hasInsight && storedInsight.recommendations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-[#0202ff]" />
              <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Recommended Next Steps</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">All suggested actions based on your assessment results</p>
            <div className="space-y-3">
              {storedInsight.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#0202ff]/20 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#0202ff]">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>

            {/* Overall progress bar */}
            {metrics && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Overall Development Progress</span>
                  <span className="text-sm font-bold text-[#0202ff]">{metrics.goalCompletionRate}%</span>
                </div>
                <Progress value={metrics.goalCompletionRate} className="h-2.5" />
                <p className="text-xs text-gray-500 mt-1.5">
                  You're on track · {metrics.goalCompletionRate}% complete across all goals
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={() => window.location.href = createPageUrl('LeadershipAssessment')}
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Retake Assessment
          </Button>
          <Button
            className="bg-[#0202ff] hover:bg-[#0101dd] text-white"
            onClick={() => window.location.href = createPageUrl('Performance')}
          >
            <Target className="w-4 h-4 mr-2" /> Create Development Plan
          </Button>
        </div>
      </motion.div>

    </div>
  );
}