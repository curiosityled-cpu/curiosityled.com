/**
 * MyLeadership — Manager Command Center
 * Redesigned for the AI HR Council's requirements:
 * - Answers "What should I focus on now?" and "What can I do this week?" at the top
 * - Distinguishes evidence (assessment scores) from interpretation (archetypes, narratives)
 * - Uses developmental, probabilistic, coaching-safe language throughout
 * - Readiness is banded + multi-signal, not a single verdict
 * - Daily practices surfaced prominently, not buried in tabs
 */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ShareResultsModal from "@/components/mvp/ShareResultsModal";
import { Link } from "react-router-dom";
import {
  Target, ChevronRight, Loader2, Clock, ArrowRight,
  CheckCircle2, Layers, GraduationCap, Star, Share2, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";

// New command-center components
import FocusStrip from "@/components/manager/FocusStrip";
import ArchetypeCard from "@/components/manager/ArchetypeCard";
import CompetencyFocusCard from "@/components/manager/CompetencyFocusCard";
import LeadershipRisksCard from "@/components/manager/LeadershipRisksCard";
import SuccessionReadinessPanel from "@/components/manager/SuccessionReadinessPanel";
import DailyPracticeCard from "@/components/manager/DailyPracticeCard";

// ─── Goals summary card (unchanged) ───────────────────────────────────────────
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
                  {goal.progress > 0 && <Progress value={goal.progress} className="h-1.5 mt-1.5" />}
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

// ─── Development summary card (unchanged) ─────────────────────────────────────
function DevelopmentCard({ assignments, devExperiences, devPlans }) {
  const [section, setSection] = useState('plans');
  const activePlans = devPlans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const completedPlans = devPlans.filter(p => p.status === 'completed');
  const activeLearning = assignments.filter(a => a.status !== 'completed');
  const completedLearning = assignments.filter(a => a.status === 'completed');
  const activeExperiences = devExperiences.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
  const completedExperiences = devExperiences.filter(e => e.status === 'completed');

  const [tab, setTab] = useState('active');
  const activeItems = section === 'plans' ? activePlans : section === 'learning' ? activeLearning : activeExperiences;
  const completedItems = section === 'plans' ? completedPlans : section === 'learning' ? completedLearning : completedExperiences;
  const sectionLabel = section === 'plans' ? 'journeys' : section === 'learning' ? 'learning' : 'experiences';
  const dotColor = section === 'plans' ? 'bg-purple-400' : section === 'experiences' ? 'bg-amber-400' : '';

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
        <div className="flex gap-1 mt-3 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setSection('plans')} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${section === 'plans' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Layers className="w-3 h-3" /> Journeys {activePlans.length > 0 && <span className="text-purple-600">({activePlans.length})</span>}
          </button>
          <button onClick={() => setSection('learning')} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${section === 'learning' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <GraduationCap className="w-3 h-3" /> Learning {activeLearning.length > 0 && <span className="text-[#0202ff]">({activeLearning.length})</span>}
          </button>
          <button onClick={() => setSection('experiences')} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1 ${section === 'experiences' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Star className="w-3 h-3" /> Exp. {activeExperiences.length > 0 && <span className="text-amber-600">({activeExperiences.length})</span>}
          </button>
        </div>
        <div className="flex gap-1 mt-1 bg-gray-50 border border-gray-100 rounded-lg p-1">
          <button onClick={() => setTab('active')} className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${tab === 'active' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Active</button>
          <button onClick={() => setTab('completed')} className={`flex-1 text-xs font-medium py-1 rounded-md transition-all ${tab === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Completed</button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-6 pb-6">
        {tab === 'active' ? (
          activeItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              No active {sectionLabel} right now.
            </div>
          ) : (
            activeItems.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${section === 'learning' ? (item.priority === 'urgent' ? 'bg-red-500' : item.priority === 'high' ? 'bg-amber-500' : 'bg-blue-400') : dotColor}`} />
                <p className="text-sm text-gray-800 truncate flex-1">{item.title}</p>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{item.status?.replace('_', ' ')}</Badge>
              </div>
            ))
          )
        ) : (
          completedItems.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <Clock className="w-4 h-4 flex-shrink-0" />
              No completed {sectionLabel} yet.
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

// ─── No assessment state ───────────────────────────────────────────────────────
function NoInsightState({ onRefresh }) {
  const [checking, setChecking] = useState(false);
  const handleCheck = async () => { setChecking(true); await onRefresh?.(); setTimeout(() => setChecking(false), 1500); };

  return (
    <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
      <CardContent className="py-14 px-6 text-center">
        <div className="w-16 h-16 bg-[#0202ff]/8 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <BookOpen className="w-8 h-8 text-[#0202ff]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Your Assessment</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
          Take your leadership assessment to unlock your personalized command center — your focus areas, pattern profile, and recommended practices.
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MyLeadership() {
  const { user, appRole } = useAuth();
  const queryClient = useQueryClient();
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (user?.email) queryClient.invalidateQueries({ queryKey: ['my-insight', user.email] });
  }, [user?.email]);

  const { data: insight, isLoading: loadingInsight, refetch: refetchInsight } = useQuery({
    queryKey: ['my-insight', user?.email],
    queryFn: async () => {
      let insights = [];
      try {
        insights = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1);
      } catch (e) { console.warn('[MyLeadership] AssessmentInsights fetch failed:', e.message); }
      if (insights[0]) return { source: 'insights', ...insights[0] };

      let assessments = [];
      try {
        assessments = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1);
      } catch (e) { console.warn('[MyLeadership] Assessment fetch failed:', e.message); }
      if (!assessments[0]) return null;
      const a = assessments[0];

      const competencies = [
        { key: 'Situational Intelligence', pct: a.si_pct },
        { key: 'Decision Making', pct: a.dm_pct },
        { key: 'Communication', pct: a.comm_pct },
        { key: 'Resource Management', pct: a.rm_pct },
        { key: 'Stakeholder Management', pct: a.sm_pct },
        { key: 'Performance Management', pct: a.pm_pct },
      ].filter(c => c.pct != null).sort((a, b) => b.pct - a.pct);

      return {
        source: 'assessment',
        assessment_id: a.id,
        id: a.id,
        archetype: a.archetype_label,
        summary: a.record?.scoring_notes || `Overall score: ${a.overall_pct}%`,
        top_strengths: competencies.slice(0, 2).map(c => `${c.key} (${c.pct}%)`),
        development_areas: competencies.slice(-2).reverse().map(c => `${c.key} (${c.pct}%)`),
        recommendations: [],
        risk_flags: a.overall_pct < 50 ? ['score_below_threshold'] : [],
      };
    },
    enabled: !!user?.email,
    staleTime: 0,
  });

  // Pull assessment record for competency scores
  const { data: assessmentRecord, isLoading: loadingAssessment } = useQuery({
    queryKey: ['my-assessment-record', user?.email],
    queryFn: async () => {
      const assessments = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1);
      return assessments[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
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

  const { data: devPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['my-dev-plans', user?.email],
    queryFn: async () => base44.entities.DevelopmentPlan.filter({ user_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const rawName = user?.display_name || user?.data?.display_name || user?.full_name;
  const displayName = rawName && rawName.trim() && !rawName.includes('@') ? rawName.split(' ')[0] : 'there';

  const isLoading = loadingInsight || loadingAssessment || loadingGoals || loadingAssignments || loadingDev || loadingPlans;

  // Use assessment record for competency scores (more complete than insight shape)
  const assessment = assessmentRecord;

  return (
    <MVPPageLayout
      title="My Leadership"
      subtitle={`Private command center · ${displayName}`}
      action={
        insight && (
          <Button variant="outline" size="sm" className="text-xs border-gray-200 text-gray-600" onClick={() => setShowShare(true)}>
            <Share2 className="w-3 h-3 mr-1.5" /> Share
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="space-y-5">
          <div className="h-56 w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-40 w-full rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-32 w-full rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      ) : !insight && !assessment ? (
        <NoInsightState onRefresh={refetchInsight} />
      ) : (
        <>
          {/* 1. FOCUS STRIP — answers "what now?" and "what this week?" */}
          <FocusStrip assessment={assessment} insight={insight} />

          {/* 2. TODAY'S PRACTICE — surfaced prominently, not buried in tabs */}
          <DailyPracticeCard assessment={assessment} />

          {/* 3. IDENTITY / ARCHETYPE — pattern language, not verdicts */}
          <ArchetypeCard insight={insight} assessment={assessment} />

          {/* 4. COMPETENCY PROFILE — role-aware, benchmark-contextualized */}
          <CompetencyFocusCard assessment={assessment} />

          {/* 5. GOALS SUMMARY */}
          <GoalsCard goals={goals} />

          {/* 6. DEVELOPMENT SUMMARY */}
          <DevelopmentCard assignments={assignments} devExperiences={devExperiences} devPlans={devPlans} />

          {/* 7. LEADERSHIP RISKS — consolidated blind spots + stress, developmental framing */}
          <LeadershipRisksCard assessment={assessment} insight={insight} />

          {/* 8. SUCCESSION READINESS — banded estimate, multi-signal, growth paths */}
          <SuccessionReadinessPanel assessment={assessment} insight={insight} />
        </>
      )}

      {insight && (
        <ShareResultsModal isOpen={showShare} onClose={() => setShowShare(false)} insight={insight} user={user} />
      )}
    </MVPPageLayout>
  );
}