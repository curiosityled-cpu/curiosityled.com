import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import {
  Sparkles, Target, Zap, ChevronRight, Loader2, Star,
  TrendingUp, ArrowRight, CheckCircle2, Clock, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

function InsightCard({ insight }) {
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
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${riskStyle}`}>
            {riskLabel}
          </span>
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

function LearningCard({ assignments }) {
  const pending = assignments.filter(a => a.status !== 'completed');

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-500" />
          Assigned Learning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-6 pb-6">
        {pending.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            All caught up — no pending assignments.
          </div>
        ) : (
          pending.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.priority === 'urgent' ? 'bg-red-500' : a.priority === 'high' ? 'bg-amber-500' : 'bg-blue-400'}`} />
              <p className="text-sm text-gray-800 truncate flex-1">{a.title}</p>
              <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{a.status}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function NoInsightState() {
  return (
    <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
      <CardContent className="py-14 px-6 text-center">
        <div className="w-16 h-16 bg-[#0202ff]/8 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-8 h-8 text-[#0202ff]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Your Assessment</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Take your leadership assessment to unlock your personalized archetype, strengths, and recommended next steps.
        </p>
        <Link to="/Assessments">
          <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white px-6">
            Take Assessment <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
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
  const { user, isLoadingAuth } = useAuth();

  const { data: insight, isLoading: loadingInsight } = useQuery({
    queryKey: ['my-insight-v2', user?.email],
    queryFn: async () => {
      const results = await base44.entities.AssessmentInsights.list('-created_date', 5);
      return results[0] || null;
    },
    enabled: !isLoadingAuth && !!user,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['my-goals-summary-v2', user?.email],
    queryFn: async () => base44.entities.Goal.list('-created_date', 10),
    enabled: !isLoadingAuth && !!user,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assignments-v2', user?.email],
    queryFn: async () => base44.entities.AssignedLearning.list('-created_date', 10),
    enabled: !isLoadingAuth && !!user,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const firstName = user?.full_name?.split(' ')[0] || 'Leader';

  const isLoading = isLoadingAuth || loadingInsight || loadingGoals || loadingAssignments;

  return (
    <MVPPageLayout
      title="My Leadership"
      subtitle={`Welcome back, ${firstName}. Here's your leadership snapshot.`}
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {insight ? <InsightCard insight={insight} /> : <NoInsightState />}
          <GoalsCard goals={goals} />
          <LearningCard assignments={assignments} />
        </>
      )}
    </MVPPageLayout>
  );
}