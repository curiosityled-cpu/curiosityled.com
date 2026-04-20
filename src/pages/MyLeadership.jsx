import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ShareResultsModal from "@/components/mvp/ShareResultsModal";
import { Link } from "react-router-dom";
import {
  Sparkles, Target, Zap, ChevronRight, Loader2, Star,
  TrendingUp, ArrowRight, CheckCircle2, Clock, BookOpen, Share2, ExternalLink, Layers, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

function InsightCard({ insight, user }) {
  const [showShare, setShowShare] = useState(false);
  const riskCount = insight.risk_flags?.length || 0;
  const riskLabel = riskCount === 0 ? 'On Track' : riskCount <= 1 ? 'Developing' : 'Needs Focus';
  const riskStyle = riskCount === 0
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : riskCount <= 1
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-red-50 border-red-200 text-red-700';

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0202ff]" />
            My Leadership Insight
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${riskStyle}`}>
              {riskLabel}
            </span>
            <Button variant="outline" size="sm" className="text-xs h-7 border-[#0202ff]/30 text-[#0202ff] hover:bg-blue-50" onClick={() => setShowShare(true)}>
              <Share2 className="w-3 h-3 mr-1" /> Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        {insight.archetype && (
          <div className="bg-gradient-to-br from-[#0202ff]/5 to-blue-50 rounded-xl p-4 border border-[#0202ff]/10">
            <p className="text-xs text-[#0202ff] font-semibold uppercase tracking-wider mb-1">Your Leadership Archetype</p>
            <p className="text-xl font-bold text-gray-900">{insight.archetype}</p>
          </div>
        )}
        {insight.summary && (
          <p className="text-sm text-gray-600 leading-relaxed">{insight.summary}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {insight.top_strengths?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Core Strengths
              </p>
              <ul className="space-y-2">
                {insight.top_strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.development_areas?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Growth Areas
              </p>
              <ul className="space-y-2">
                {insight.development_areas.slice(0, 3).map((d, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />{d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {insight.recommendations?.[0] && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Focus This Week
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{insight.recommendations[0]}</p>
          </div>
        )}
      </CardContent>
      <div className="px-6 pb-5">
        <Link to="/Insights">
          <Button variant="outline" className="w-full text-[#0202ff] border-[#0202ff]/30 hover:bg-blue-50">
            View Full Insights <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
      <ShareResultsModal isOpen={showShare} onClose={() => setShowShare(false)} insight={insight} user={user} />
    </Card>
  );
}

function GoalsCard({ goals }) {
  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'archived' || g.progress === 100);
  const completionRate = goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#0202ff]" />
            My Goals
          </CardTitle>
          <Link to="/my-goals">
            <Button variant="ghost" size="sm" className="text-[#0202ff] text-xs h-7 hover:bg-blue-50">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xl font-bold text-[#0202ff]">{goals.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xl font-bold text-amber-600">{active.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xl font-bold text-emerald-600">{completionRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Complete</p>
          </div>
        </div>
        {active.length > 0 ? (
          <div className="space-y-2">
            {active.slice(0, 3).map(goal => (
              <div key={goal.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate font-medium">{goal.title}</p>
                  {goal.progress > 0 && (
                    <Progress value={goal.progress} className="h-1.5 mt-1.5" />
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{goal.progress || 0}%</span>
              </div>
            ))}
          </div>
        ) : (
          <Link to="/my-goals">
            <div className="flex items-center justify-between p-4 bg-[#0202ff] text-white rounded-xl hover:bg-[#0101dd] transition-colors cursor-pointer">
              <p className="text-sm font-semibold">Set Your First Leadership Goal</p>
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function DevelopmentCard({ assignments, devExperiences }) {
  const [tab, setTab] = useState('active');
  const [section, setSection] = useState('plans'); // 'plans' | 'learning'

  const activePlans = devExperiences.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
  const completedPlans = devExperiences.filter(e => e.status === 'completed');
  const activeLearning = assignments.filter(a => a.status !== 'completed');
  const completedLearning = assignments.filter(a => a.status === 'completed');

  const activeItems = section === 'plans' ? activePlans : activeLearning;
  const completedItems = section === 'plans' ? completedPlans : completedLearning;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            My Development
          </CardTitle>
          <Link to="/my-development">
            <Button variant="ghost" size="sm" className="text-[#0202ff] text-xs h-7 hover:bg-blue-50">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        {/* Section toggle */}
        <div className="flex gap-1 mt-3 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSection('plans')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${section === 'plans' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Layers className="w-3 h-3" /> Plans {activePlans.length > 0 && <span className="text-purple-600">({activePlans.length})</span>}
          </button>
          <button
            onClick={() => setSection('learning')}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${section === 'learning' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <GraduationCap className="w-3 h-3" /> Learning {activeLearning.length > 0 && <span className="text-[#0202ff]">({activeLearning.length})</span>}
          </button>
        </div>
        {/* Active / Completed tabs */}
        <div className="flex gap-1 mt-1 bg-gray-50 border border-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${tab === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Active
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${tab === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Completed
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-6 pb-6">
        {tab === 'active' ? (
          activeItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              No active {section === 'plans' ? 'development plans' : 'learning'} right now.
            </div>
          ) : (
            activeItems.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${section === 'plans' ? 'bg-purple-400' : item.priority === 'urgent' ? 'bg-red-500' : item.priority === 'high' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                <p className="text-sm text-gray-800 truncate flex-1">{item.title}</p>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{item.status?.replace('_', ' ')}</Badge>
              </div>
            ))
          )
        ) : (
          completedItems.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <Clock className="w-4 h-4 flex-shrink-0" />
              No completed {section === 'plans' ? 'plans' : 'learning'} yet.
            </div>
          ) : (
            completedItems.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-gray-800 truncate flex-1">{item.title}</p>
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 flex-shrink-0">Done</Badge>
              </div>
            ))
          )
        )}
      </CardContent>
    </Card>
  );
}

function NoInsightState({ onRefresh }) {
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await onRefresh?.();
    setTimeout(() => setChecking(false), 1500);
  };

  return (
    <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
      <CardContent className="py-14 px-6 text-center">
        <div className="w-16 h-16 bg-[#0202ff]/8 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-8 h-8 text-[#0202ff]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Your Assessment</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Take your leadership assessment to unlock your personalized archetype, strengths, and recommended next steps.
          If you've already submitted, your results may still be processing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/LeadershipAssessment">
            <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white px-6">
              Take Assessment <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Button variant="outline" onClick={handleCheck} disabled={checking} className="border-gray-300">
            {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Check for Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export default function MyLeadership() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Always refetch on mount so fresh results appear after returning from assessment
  useEffect(() => {
    if (user?.email) {
      queryClient.invalidateQueries({ queryKey: ['my-insight', user.email] });
    }
  }, [user?.email]);

  const { data: insight, isLoading: loadingInsight, error: insightError, refetch: refetchInsight } = useQuery({
    queryKey: ['my-insight', user?.email],
    queryFn: async () => {
      // Primary: try AssessmentInsights (AI-generated narratives)
      let insights = [];
      try {
        insights = await base44.entities.AssessmentInsights.filter(
          { user_email: user.email },
          '-created_date',
          1
        );
      } catch (e) {
        console.warn('[MyLeadership] AssessmentInsights fetch failed:', e.message);
      }
      if (insights[0]) return { source: 'insights', ...insights[0] };

      // Fallback: read directly from Assessment (what the webhook populates)
      let assessments = [];
      try {
        assessments = await base44.entities.Assessment.filter(
          { email: user.email },
          '-created_date',
          1
        );
      } catch (e) {
        console.warn('[MyLeadership] Assessment fetch failed:', e.message);
      }
      if (!assessments[0]) return null;
      const a = assessments[0];

      // Map Assessment fields to the same shape InsightCard expects
      const competencies = [
        { key: 'Situational Intelligence', pct: a.si_pct },
        { key: 'Decision Making', pct: a.dm_pct },
        { key: 'Communication', pct: a.comm_pct },
        { key: 'Resource Management', pct: a.rm_pct },
        { key: 'Stakeholder Management', pct: a.sm_pct },
        { key: 'Performance Management', pct: a.pm_pct },
      ].filter(c => c.pct != null).sort((a, b) => b.pct - a.pct);

      const strengths = competencies.slice(0, 2).map(c => `${c.key} (${c.pct}%)`);
      const devAreas = competencies.slice(-2).reverse().map(c => `${c.key} (${c.pct}%)`);

      return {
        source: 'assessment',
        assessment_id: a.id,
        id: a.id,
        archetype: a.archetype_label,
        summary: a.record?.scoring_notes || `Overall score: ${a.overall_pct}% — ${a.band_overall} level`,
        top_strengths: strengths,
        development_areas: devAreas,
        recommendations: [],
        risk_flags: a.overall_pct < 50 ? ['score_below_threshold'] : [],
      };
    },
    enabled: !!user?.email,
    staleTime: 0,
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['my-goals-summary', user?.email],
    queryFn: async () => base44.entities.Goal.filter({ created_by: user.email }, '-created_date', 10),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assignments', user?.email],
    queryFn: async () => base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: devExperiences = [], isLoading: loadingDev } = useQuery({
    queryKey: ['my-dev-experiences', user?.email],
    queryFn: async () => base44.entities.DevelopmentExperience.filter({ user_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // Use full display name; fall back gracefully but never use email prefix
  const displayName = user?.full_name && user.full_name.trim() && !user.full_name.includes('@')
    ? user.full_name.split(' ')[0]
    : 'there';

  return (
    <MVPPageLayout
      title="My Leadership"
      subtitle={`Welcome back, ${displayName}. Here's your leadership snapshot.`}
    >
      {loadingInsight || loadingGoals || loadingAssignments || loadingDev ? (
        <div className="space-y-5">
          <div className="h-64 w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-40 w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-32 w-full rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      ) : (
        <>
          {insight ? <InsightCard insight={insight} user={user} /> : <NoInsightState onRefresh={refetchInsight} />}
          <GoalsCard goals={goals} />
          <DevelopmentCard assignments={assignments} devExperiences={devExperiences} />
        </>
      )}
    </MVPPageLayout>
  );
}