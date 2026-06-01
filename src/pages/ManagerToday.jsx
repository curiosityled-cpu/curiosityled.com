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
import {
  Brain, MessageSquare, CheckCircle2, SlidersHorizontal, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ManagerCheckIn from "@/components/checkin/ManagerCheckIn";
import ToneOnboarding from "@/components/checkin/ToneOnboarding";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import WeeklyFocusReflection from "@/components/checkin/WeeklyFocusReflection";
import MorningIntentWidget from "@/components/checkin/MorningIntentWidget";
import MoodRingIndicator from "@/components/rhythm/MoodRingIndicator";
import WhatMattersNowCard from "@/components/lead/WhatMattersNowCard";
import NextMoveCard from "@/components/lead/NextMoveCard";
import UpcomingFrictionCard from "@/components/lead/UpcomingFrictionCard";
import FollowThroughCard from "@/components/lead/FollowThroughCard";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}


function HeroGreeting({ firstName }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="pt-2 pb-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Lead</p>
      <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}.</h1>
      <p className="text-sm text-gray-500 mt-1">What matters right now.</p>
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

  // Main column content (shared between mobile and desktop left column)
  const mainContent = !needsToneOnboarding ? (
    <div className="space-y-4">
      {todayPulse && <MoodRingIndicator todayPulse={todayPulse} />}

      {/* Settings toggle */}
      <div className="flex justify-end">
        <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {showSettings ? 'Close settings' : 'Atreus settings'}
        </button>
      </div>
      {showSettings && <CheckInSettings />}

      {/* Morning intent */}
      <MorningIntentWidget userEmail={user?.email} />

      {/* 1. Check-in */}
      <ManagerCheckIn promptType={todayPromptType} onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })} />

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

      {/* 5. Weekly reflection */}
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
    </div>
  ) : null;

  // Desktop right companion column
  const companionColumn = !needsToneOnboarding ? (
    <div className="space-y-4">
      <UpcomingFrictionCard
        trends={trends}
        pulses={recentPulses}
        onOpenAtreus={openAtreus}
      />
    </div>
  ) : null;

  return (
    <div className="px-4 py-6">
      {/* Tone onboarding gate */}
      {needsToneOnboarding && (
        <div className="max-w-2xl mx-auto">
          <HeroGreeting firstName={firstName} />
          <div className="mt-4 bg-white rounded-2xl border border-[#0202ff]/20 shadow-sm overflow-hidden">
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
              <div>{companionColumn}</div>
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