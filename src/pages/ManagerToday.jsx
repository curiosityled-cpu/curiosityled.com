/**
 * ManagerToday — The Daily Companion (Phase 1 shell → Phase 2 full build)
 * Route: /today
 * This is the new home for managers: what matters right now.
 */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link } from "react-router-dom";
import {
  Brain, Target, BookOpen, ArrowRight, ChevronRight,
  Flame, Shield, MessageSquare, TrendingUp, AlertCircle,
  Circle, Info, Eye, Zap, CheckCircle2, SlidersHorizontal, BarChart3, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ManagerCheckIn from "@/components/checkin/ManagerCheckIn";
import TrendSummaryCard from "@/components/checkin/TrendSummaryCard";
import IntentLoopCard from "@/components/checkin/IntentLoopCard";
import ToneOnboarding from "@/components/checkin/ToneOnboarding";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import WeeklyFocusReflection from "@/components/checkin/WeeklyFocusReflection";
import MorningIntentWidget from "@/components/checkin/MorningIntentWidget";
import DecisionJournal from "@/components/intelligence/DecisionJournal";
import MoodRingIndicator from "@/components/rhythm/MoodRingIndicator";
import CheckInHistoryCalendar from "@/components/rhythm/CheckInHistoryCalendar";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

function buildTodayFocus(insight, goals, assignments) {
  const urgentGoal = goals.find(g => g.status === 'active' && (g.progress || 0) < 50);
  if (urgentGoal) return { focus: urgentGoal.title, why: "This active goal is less than halfway complete.", action: "Review your progress", actionPath: '/growth', source: 'Goal tracker' };
  const overdueLearning = assignments.find(a => a.status === 'assigned' && a.due_date && new Date(a.due_date) < new Date());
  if (overdueLearning) return { focus: `Complete: ${overdueLearning.title}`, why: "You have a learning assignment that's past its due date.", action: "Go to Growth", actionPath: '/growth', source: 'Learning tracker' };
  if (insight?.development_areas?.[0]) {
    const area = insight.development_areas[0].split(' (')[0];
    return { focus: `Strengthen ${area}`, why: "A pattern from your recent Leadership Index signals this as your highest-leverage growth area.", action: "See what supports this", actionPath: '/growth', source: 'Leadership Index · AI-interpreted' };
  }
  return { focus: "Prepare one coaching question for your next 1:1", why: "Intentional questions before team conversations are one of the most consistent differentiators of effective managers.", action: "Open Atreus to prep", actionPath: null, atreus: true, source: 'Practice library' };
}

function HeroGreeting({ firstName }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="pt-2 pb-1">
      <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}.</h1>
      <p className="text-sm text-gray-500 mt-1">Here's what matters right now.</p>
    </div>
  );
}

function FocusCard({ focus, insight, onOpenAtreus }) {
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">What matters now</p>
        </div>
        {insight?.created_date && (
          <span className="text-[10px] text-gray-400">Updated {timeAgo(insight.created_date)}</span>
        )}
      </div>
      <CardContent className="px-5 pt-4 pb-5 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-base font-semibold text-gray-900 leading-snug">{focus.focus}</p>
          <p className="text-sm text-gray-500 leading-relaxed">{focus.why}</p>
          <span className="inline-block text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full mt-1">{focus.source}</span>
        </div>
        <div className="flex gap-2">
          {focus.atreus ? (
            <Button size="sm" className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8" onClick={onOpenAtreus}>
              <MessageSquare className="w-3 h-3 mr-1.5" /> {focus.action}
            </Button>
          ) : (
            <Link to={focus.actionPath} className="flex-1">
              <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
                {focus.action} <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </Link>
          )}
          <Button size="sm" variant="outline" className="text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50" onClick={onOpenAtreus}>
            <Brain className="w-3 h-3 mr-1.5 text-[#0202ff]" /> Ask Atreus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsPulseCard({ goals }) {
  const active = goals.filter(g => g.status === 'active');
  const topGoal = [...active].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Active focus</p>
        </div>
        <Link to="/growth"><span className="text-xs text-[#0202ff] hover:underline font-medium">View all →</span></Link>
      </div>
      <CardContent className="px-5 pt-2 pb-5">
        {active.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <p className="text-sm text-gray-500">No active goals yet. <Link to="/growth" className="text-[#0202ff] hover:underline">Set your first →</Link></p>
          </div>
        ) : topGoal ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-800">{topGoal.title}</p>
            <div className="flex items-center gap-2">
              <Progress value={topGoal.progress || 0} className="h-1.5 flex-1" />
              <span className="text-xs text-gray-500 flex-shrink-0">{topGoal.progress || 0}%</span>
            </div>
            {active.length > 1 && <p className="text-xs text-gray-400">+{active.length - 1} more active goal{active.length > 2 ? 's' : ''}</p>}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExploreDeeperCard() {
  const links = [
    { label: 'My leadership rhythm', sub: 'Trends, patterns, and check-in log', path: '/patterns', icon: BarChart3, color: 'text-[#0202ff]' },
    { label: 'Growth & development', sub: 'Goals, learning, journeys', path: '/growth', icon: Layers, color: 'text-blue-600' },
    { label: 'Team & conversations', sub: '1:1 prep, delegation, team focus', path: '/team', icon: Target, color: 'text-emerald-600' },
    { label: 'Deep guidance with Atreus', sub: 'Reflection, coaching, decision journal', path: '/atreus-guide', icon: Brain, color: 'text-purple-600' },
  ];
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <p className="text-sm font-semibold text-gray-900">Explore deeper</p>
        <p className="text-xs text-gray-400 mt-0.5">When you have more time</p>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-1">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.path} to={l.path}>
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <Icon className={`w-4 h-4 flex-shrink-0 ${l.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{l.label}</p>
                  <p className="text-xs text-gray-400">{l.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function ManagerToday() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
  const [privacyDismissed] = useState(() => localStorage.getItem('cl_privacy_banner_dismissed') === '1');
  const [showSettings, setShowSettings] = useState(false);
  const [showWeeklyReflection, setShowWeeklyReflection] = useState(false);

  const openAtreus = (msg) => openWithContext({ context: { pageType: 'today', user_name: getFirstName(user) }, starterMessage: msg || "I'd like to reflect on my leadership this week." });

  const { data: insight } = useQuery({
    queryKey: ['ml-insight', user?.email],
    queryFn: async () => {
      try {
        const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1);
        if (rows[0]) return rows[0];
      } catch {}
      try {
        const assessments = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1);
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
        return { id: a.id, created_date: a.created_date, archetype: a.archetype_label, top_strengths: competencies.slice(0, 2).map(c => `${c.key} (${c.pct}%)`), development_areas: competencies.slice(-2).reverse().map(c => `${c.key} (${c.pct}%)`) };
      } catch {}
      return null;
    },
    enabled: !!user?.email,
    staleTime: 0,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: async () => {
      try {
        const byEmail = await base44.entities.Goal.filter({ user_email: user.email }, '-created_date', 15);
        if (byEmail.length > 0) return byEmail;
        return await base44.entities.Goal.filter({ created_by: user.email }, '-created_date', 15);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['ml-assignments', user?.email],
    queryFn: async () => { try { return await base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date', 10); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: devPlans = [] } = useQuery({
    queryKey: ['ml-devplans', user?.email],
    queryFn: async () => { try { return await base44.entities.DevelopmentPlan.filter({ user_email: user.email }, '-created_date', 5); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: tonePref = null } = useQuery({
    queryKey: ['ml-tone', user?.email],
    queryFn: async () => { const rows = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1); return rows[0] || null; },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ['ml-trends', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: recentPulses = [] } = useQuery({
    queryKey: ['ml-pulses', user?.email],
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 20); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const needsToneOnboarding = tonePref === null;
  const firstName = getFirstName(user);
  const todayFocus = buildTodayFocus(insight, goals, assignments);
  const day = new Date().getDay();
  const hour = new Date().getHours();
  const todayPromptType = (() => {
    if (day === 5) return 'weekly_reflection';
    if ((day === 1 || day === 2) && hour < 11) return 'morning_intent';
    const rotation = ['baseline_energy', 'confidence_check', 'motivation_check', 'overload_check', 'avoidance_check', 'clarity_check', 'optimism_check'];
    return rotation[day % rotation.length];
  })();

  const todayPulse = recentPulses.find(p => p.created_date?.startsWith(new Date().toISOString().split("T")[0]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <HeroGreeting firstName={firstName} />
      {todayPulse && <MoodRingIndicator todayPulse={todayPulse} />}

      {/* Tone onboarding gate */}
      {needsToneOnboarding && (
        <div className="bg-white rounded-2xl border border-[#0202ff]/20 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">One quick thing before we start</p>
              <p className="text-xs text-gray-400">Choose how Atreus speaks with you.</p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <ToneOnboarding existingTone={null} onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-tone', user?.email] })} />
          </div>
        </div>
      )}

      {/* Settings toggle */}
      {!needsToneOnboarding && (
        <div className="flex justify-end">
          <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showSettings ? 'Close settings' : 'Atreus settings'}
          </button>
        </div>
      )}
      {showSettings && <CheckInSettings />}

      {/* Morning intent */}
      {!needsToneOnboarding && <MorningIntentWidget userEmail={user?.email} />}

      {/* 1. What matters now */}
      {!needsToneOnboarding && <FocusCard focus={todayFocus} insight={insight} onOpenAtreus={() => openAtreus()} />}

      {/* 2. Daily check-in */}
      {!needsToneOnboarding && <ManagerCheckIn promptType={todayPromptType} onComplete={() => {}} />}

      {/* 3. Trend memory */}
      {!needsToneOnboarding && <TrendSummaryCard trends={trends} onOpenAtreus={openAtreus} />}

      {/* 4. Intent loop */}
      {!needsToneOnboarding && <IntentLoopCard pulses={recentPulses} trends={trends} onOpenAtreus={openAtreus} />}

      {/* 5. Goals pulse */}
      {!needsToneOnboarding && <GoalsPulseCard goals={goals} />}

      {/* 6. Weekly reflection */}
      {!needsToneOnboarding && (
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowWeeklyReflection(true)}>
          <CardContent className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Weekly focus reflection</p>
                <p className="text-xs text-gray-500">Reflect on this week's wins and learnings</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </CardContent>
        </Card>
      )}

      {/* 7. Rhythm calendar */}
      {!needsToneOnboarding && recentPulses.length > 0 && (
        <CheckInHistoryCalendar pulses={recentPulses} />
      )}

      {/* 8. Explore deeper */}
      {!needsToneOnboarding && <ExploreDeeperCard />}

      <WeeklyFocusReflection
        isOpen={showWeeklyReflection}
        onClose={() => setShowWeeklyReflection(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })}
        userEmail={user?.email}
      />
    </div>
  );
}