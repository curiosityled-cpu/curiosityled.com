/**
 * ManagerToday — The Daily Companion (Phase 1 shell → Phase 2 full build)
 * Route: /today
 * This is the new home for managers: what matters right now.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link } from "react-router-dom";
import {
  Brain, Target, ArrowRight, ChevronRight,
  MessageSquare, CheckCircle2, SlidersHorizontal, BarChart3, Layers
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
import MoodRingIndicator from "@/components/rhythm/MoodRingIndicator";
import CheckInHistoryCalendar from "@/components/rhythm/CheckInHistoryCalendar";
import WhatMattersNowCard from "@/components/lead/WhatMattersNowCard";
import NextMoveCard from "@/components/lead/NextMoveCard";
import UpcomingFrictionCard from "@/components/lead/UpcomingFrictionCard";
import FollowThroughCard from "@/components/lead/FollowThroughCard";
import LeadMicroAnalytics from "@/components/lead/LeadMicroAnalytics";

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

function HeroGreeting({ firstName }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="pt-2 pb-1">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Lead</p>
      <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}.</h1>
      <p className="text-sm text-white/50 mt-1">What matters right now.</p>
    </div>
  );
}



function GoalsPulseCard({ goals, openAtreus }) {
  const active = goals.filter(g => g.status === 'active');
  const topGoal = [...active].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

  // Derive a behavioral commitment from the goal (the brief's model)
  const commitment = topGoal?.description
    ? topGoal.description.split('.')[0]
    : topGoal ? `Work on "${topGoal.title}" this week` : null;

  return (
    <div className="bg-[#1c1f2a] rounded-2xl border border-white/8 overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-sm font-semibold text-white/80">Active focus</p>
        </div>
        <Link to="/my-goals"><span className="text-xs text-blue-400 hover:text-blue-300 font-medium">View all →</span></Link>
      </div>
      <div className="px-5 pt-2 pb-5">
        {active.length === 0 ? (
          <div className="py-3 space-y-2">
            <p className="text-sm text-white/40">No active growth focus yet.</p>
            <Link to="/my-goals">
              <button className="text-xs font-medium text-blue-400 hover:text-blue-300">Set a growth goal →</button>
            </Link>
          </div>
        ) : topGoal ? (
          <div className="space-y-3">
            {/* Growth theme */}
            <div>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wide mb-1">Growth theme</p>
              <p className="text-sm font-medium text-white/80">{topGoal.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${topGoal.progress || 0}%` }} />
                </div>
                <span className="text-xs text-white/40 flex-shrink-0">{topGoal.progress || 0}%</span>
              </div>
            </div>
            {/* Behavioral commitment */}
            {commitment && (
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-0.5">This week's commitment</p>
                <p className="text-xs text-emerald-300/80 leading-relaxed">{commitment}</p>
              </div>
            )}
            {/* Practice tie-in */}
            <button
              onClick={() => openAtreus?.(`I want to make progress on my goal: "${topGoal.title}". Help me think through one small step I can take today.`)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/60 hover:bg-white/8 hover:text-white/80 transition-colors"
            >
              <Brain className="w-3.5 h-3.5" /> Work on this with Atreus
            </button>
            {active.length > 1 && <p className="text-xs text-white/30">+{active.length - 1} more active goal{active.length > 2 ? 's' : ''}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExploreDeeperCard() {
  const links = [
    { label: 'Patterns', sub: 'What this system is noticing over time', path: '/patterns', icon: BarChart3, color: 'text-blue-400' },
    { label: 'Practice', sub: 'Prepare, reflect, debrief, work through', path: '/practice', icon: Layers, color: 'text-violet-400' },
    { label: 'You', sub: 'Profile, assessments, preferences, privacy', path: '/you', icon: SlidersHorizontal, color: 'text-emerald-400' },
  ];
  return (
    <div className="bg-[#1c1f2a] rounded-2xl border border-white/8 overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <p className="text-sm font-semibold text-white/80">Explore deeper</p>
        <p className="text-xs text-white/35 mt-0.5">When you have more time</p>
      </div>
      <div className="px-5 pt-2 pb-5 space-y-1">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.path} to={l.path}>
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                <Icon className={`w-4 h-4 flex-shrink-0 ${l.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/70 group-hover:text-white/90">{l.label}</p>
                  <p className="text-xs text-white/35">{l.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/35" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ManagerToday() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
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
  const day = new Date().getDay();
  const hour = new Date().getHours();
  const todayPromptType = (() => {
    if (day === 5) return 'weekly_reflection';
    if ((day === 1 || day === 2) && hour < 11) return 'morning_intent';
    const rotation = ['baseline_energy', 'confidence_check', 'motivation_check', 'overload_check', 'avoidance_check', 'clarity_check', 'optimism_check'];
    return rotation[day % rotation.length];
  })();

  const todayPulse = recentPulses.find(p => p.created_date?.startsWith(new Date().toISOString().split("T")[0]));

  // Pending debrief from a Prepare flow scheduled earlier today/recently
  const pendingDebrief = recentPulses.find(p =>
    p.prompt_type === 'prepare_debrief_pending' &&
    p.scheduled_for &&
    new Date(p.scheduled_for) <= new Date() &&
    !recentPulses.some(q => q.prompt_type === 'follow_up' && q.focus_intention?.startsWith('Debrief:') && q.created_date > p.created_date)
  );

  // Determine if morning intent has been set today
  const todayKey = new Date().toISOString().split('T')[0];
  const hasMorningIntent = recentPulses.some(p => p.prompt_type === 'morning_intent' && p.created_date?.startsWith(todayKey));
  const hasCheckedInToday = !!todayPulse;

  // Main column content (shared between mobile and desktop left column)
  const mainContent = !needsToneOnboarding ? (
    <div className="space-y-4">
      {todayPulse && <MoodRingIndicator todayPulse={todayPulse} />}
      <LeadMicroAnalytics pulse={todayPulse} trends={trends} goals={goals} />

      {/* Settings toggle */}
      <div className="flex justify-end">
        <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {showSettings ? 'Close settings' : 'Atreus settings'}
        </button>
      </div>
      {showSettings && <CheckInSettings />}

      {/* Prepare debrief prompt — surfaces when scheduled time has passed */}
      {pendingDebrief && (
        <div className="bg-[#1c1f2a] rounded-2xl border border-blue-500/20 px-4 py-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-0.5">Debrief ready</p>
            <p className="text-sm font-semibold text-white/85 leading-snug mb-1">
              How did it go? — {pendingDebrief.focus_intention?.replace('Debrief: ', '').slice(0, 60)}
            </p>
            <p className="text-xs text-white/40">You prepared for this earlier. Close the loop with a quick debrief.</p>
            <button
              className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
              onClick={() => openAtreus(`Earlier I prepared for: "${pendingDebrief.focus_intention?.replace('Debrief: ', '')}". Now I'd like to debrief — how did it go? What surprised me? What would I do differently?`)}
            >
              Debrief with Atreus →
            </button>
          </div>
        </div>
      )}

      {/* PRIMARY HERO CARD: single dominant entry point for the day
          - If morning intent not set → show check-in with morning intent mode
          - If check-in not done today → show check-in
          - If both done → collapsed summary (handled inside ManagerCheckIn) */}
      <ManagerCheckIn
        promptType={!hasMorningIntent ? 'morning_intent' : todayPromptType}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })}
      />

      {/* 2. What matters now */}
      <WhatMattersNowCard
        pulse={todayPulse}
        trends={trends}
        goals={goals}
        insight={insight}
        onOpenAtreus={openAtreus}
      />

      {/* 3. Next move */}
      <NextMoveCard
        pulse={todayPulse}
        trends={trends}
        goals={goals}
        assignments={assignments}
        onOpenAtreus={openAtreus}
      />

      {/* 4. Follow-through */}
      <FollowThroughCard
        pulses={recentPulses}
        userEmail={user?.email}
        onDone={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })}
      />

      {/* 5. Goals pulse */}
      <GoalsPulseCard goals={goals} openAtreus={openAtreus} />

      {/* 6. Weekly reflection */}
      <div className="bg-[#1c1f2a] rounded-2xl border border-white/8 overflow-hidden cursor-pointer hover:border-white/15 transition-colors" onClick={() => setShowWeeklyReflection(true)}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/85">Weekly focus reflection</p>
              <p className="text-xs text-white/40">Reflect on this week's wins and learnings</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </div>
      </div>

      {/* 7. Rhythm calendar */}
      {recentPulses.length > 0 && <CheckInHistoryCalendar pulses={recentPulses} />}

      {/* 8. Explore deeper (mobile only — desktop has companion column) */}
      <div className="md:hidden">
        <ExploreDeeperCard />
      </div>
    </div>
  ) : null;

  // Desktop right companion column
  const companionColumn = !needsToneOnboarding ? (
    <div className="space-y-4">
      {/* Upcoming friction */}
      <UpcomingFrictionCard
        trends={trends}
        goals={goals}
        pulses={recentPulses}
        onOpenAtreus={openAtreus}
      />

      {/* Trend memory — compact */}
      <TrendSummaryCard trends={trends} onOpenAtreus={openAtreus} />

      {/* Intent loop */}
      <IntentLoopCard pulses={recentPulses} trends={trends} onOpenAtreus={openAtreus} />

      {/* Explore deeper */}
      <ExploreDeeperCard />
    </div>
  ) : null;

  return (
    <div className="px-4 py-6 min-h-screen bg-[#13151c]">
      {/* Tone onboarding gate */}
      {needsToneOnboarding && (
        <div className="max-w-2xl mx-auto">
          <HeroGreeting firstName={firstName} />
          <div className="mt-4 bg-[#1c1f2a] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/85">One quick thing before we start</p>
                <p className="text-xs text-white/40">Choose how Atreus speaks with you.</p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <ToneOnboarding existingTone={null} onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-tone', user?.email] })} />
            </div>
          </div>
        </div>
      )}

      {/* Main layout: single col mobile, two col desktop */}
      {!needsToneOnboarding && (
        <>
          {/* Mobile: single column */}
          <div className="md:hidden max-w-2xl mx-auto space-y-4">
            <HeroGreeting firstName={firstName} />
            {mainContent}
          </div>

          {/* Desktop: two column */}
          <div className="hidden md:block max-w-6xl mx-auto">
            <HeroGreeting firstName={firstName} />
            <div className="mt-4 grid grid-cols-[1fr_360px] gap-6 items-start">
              <div className="space-y-4">{mainContent}</div>
              <div className="sticky top-4">{companionColumn}</div>
            </div>
          </div>
        </>
      )}

      <WeeklyFocusReflection
        isOpen={showWeeklyReflection}
        onClose={() => setShowWeeklyReflection(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })}
        userEmail={user?.email}
      />
    </div>
  );
}