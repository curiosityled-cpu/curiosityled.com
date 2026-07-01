/**
 * ManagerToday — The Daily Companion + Patterns (unified)
 * Route: /today
 */
import React, { useState, useEffect, useMemo } from "react";
import { loadCheckInHistory } from "@/lib/checkInStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { useAtreusOrchestrator } from "@/components/ai/useAtreusOrchestrator";
import { Link } from "react-router-dom";
import { Brain, ChevronRight, MessageSquare, SlidersHorizontal, Layers, X, Sun, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ToneOnboarding from "@/components/checkin/ToneOnboarding";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import MorningCheckIn from "@/components/checkin/MorningCheckIn";
import EveningCheckIn from "@/components/checkin/EveningCheckIn";
import MiddayPriorityLoop from "@/components/checkin/MiddayPriorityLoop";
import WeeklyRhythmReflection from "@/components/checkin/WeeklyRhythmReflection";
import UpcomingFrictionCard from "@/components/lead/UpcomingFrictionCard";
import TopPatternCard from "@/components/lead/TopPatternCard";
import { runBpoPatternEngine } from "@/components/patterns/bpoPatternEngine";
import TodaysPlaybook from "@/components/lead/TodaysPlaybook";
import CheckInTrendDashboard from "@/components/patterns/CheckInTrendDashboard";
import PerformanceGlanceCard from "@/components/lead/PerformanceGlanceCard";
import DecisionJournalCard from "@/components/lead/DecisionJournalCard";

// Patterns imports
import IntentLoopCard from "@/components/checkin/IntentLoopCard";
import WhatsImprovingCard from "@/components/patterns/WhatsImprovingCard";
import WatchlistCard from "@/components/patterns/WatchlistCard";
import LeadingPatternCard from "@/components/patterns/LeadingPatternCard";
import LeadershipNarrativeCard from "@/components/patterns/LeadershipNarrativeCard";
import SwipeableSections from "@/components/patterns/SwipeableSections";
import BpoHeroPatternCard from "@/components/patterns/BpoHeroPatternCard";
import BpoWatchRow from "@/components/patterns/BpoWatchRow";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}

function HeroGreeting({ firstName, hasCheckedIn, todayRecord, onSettingsToggle }) {
  const etHour = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', hour12: false
  }).format(new Date()), 10);
  const greeting = etHour < 12 ? 'Good morning' : etHour < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });

  let sub = "Let's see what matters right now.";
  if (hasCheckedIn && todayRecord) {
    const energy = todayRecord.energy_score;
    const load = todayRecord.load_score;
    if (energy <= 2 || load >= 4) sub = "It's a heavy one. Let's make it count.";
    else if (energy >= 4 && load <= 2) sub = "You're in a good place. Use it well.";
    else if (todayRecord.big3_priorities?.length > 0) sub = "Intent is set. Let's hold the shape.";
    else sub = "Here's what the system sees right now.";
  }

  return (
    <div className="pt-2 pb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{day}</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{greeting}, {firstName}.</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>
        </div>
        {onSettingsToggle && hasCheckedIn && (
          <button
            onClick={onSettingsToggle}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atreus settings</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PracticeCard() {
  return (
    <Link to="/practice" className="block">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group">
        <Layers className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Practice</p>
          <p className="text-[10px] text-muted-foreground">Prepare, reflect, work through</p>
        </div>
      </div>
    </Link>
  );
}

// Tab pill component
function TabPills({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 bg-muted/60 rounded-xl p-1 w-fit">
      {[
        { id: 'today', label: 'Today', icon: Sun },
        { id: 'patterns', label: 'Patterns', icon: TrendingUp },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ManagerToday() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
  const [showSettings, setShowSettings] = useState(false);
  const [showWeeklyReflection, setShowWeeklyReflection] = useState(false);
  const [activeTab, setActiveTab] = useState('today');

  const todayET = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  const [localBig3Override, setLocalBig3Override] = useState(() => {
    try {
      const saved = sessionStorage.getItem('today_big3_override');
      if (!saved) return null;
      const { date, data } = JSON.parse(saved);
      if (date === todayET) return data;
      sessionStorage.removeItem('today_big3_override');
    } catch {}
    return null;
  });

  const { data: todayData, refetch: refetchToday } = useQuery({
    queryKey: ['daily-checkin-today', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("saveDailyCheckIn", { action: "get_today", client_date: todayET });
        return { record: res.data?.record || null, yesterday_big3: res.data?.yesterday_big3 || [] };
      } catch { return { record: null, yesterday_big3: [] }; }
    },
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const todayRecord = todayData === undefined ? undefined : (todayData?.record ?? null);
  const yesterdayBig3 = todayData?.yesterday_big3 || [];

  const [checkInHistory, setCheckInHistory] = useState([]);
  useEffect(() => {
    if (!user?.email) return;
    const history = loadCheckInHistory(user.email);
    if (history.length > 0) setCheckInHistory(history);
  }, [user?.email]);

  const handleCheckInComplete = (big3Priorities, type, scores) => {
    if (big3Priorities?.length > 0) {
      setLocalBig3Override(big3Priorities);
      try {
        sessionStorage.setItem('today_big3_override', JSON.stringify({ date: todayET, data: big3Priorities }));
      } catch {}
    }
    const update = {};
    if (type === 'morning') { update.morning_completed = true; update.morning_completed_at = new Date().toISOString(); }
    if (type === 'evening') { update.evening_completed = true; update.evening_completed_at = new Date().toISOString(); update.big3_priorities = big3Priorities || []; }
    if (scores) {
      if (scores.energy != null) update.energy_score = scores.energy;
      if (scores.confidence != null) update.confidence_score = scores.confidence;
      if (scores.focus != null) update.focus_score = scores.focus;
      if (scores.load != null) update.load_score = scores.load;
      if (scores.growth != null) update.growth_score = scores.growth;
    }

    const optimisticRecord = { check_in_date: todayET, ...(todayData?.record || {}), ...update };
    queryClient.setQueryData(['daily-checkin-today', user?.email], (old) => {
      const existing = old || { record: null, yesterday_big3: [] };
      return { ...existing, record: optimisticRecord };
    });

    if (user?.email) {
      setCheckInHistory(loadCheckInHistory(user.email));
    }

    queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] });
  };

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
        return {
          id: a.id, created_date: a.created_date, archetype: a.archetype_label,
          top_strengths: competencies.slice(0, 2).map(c => `${c.key} (${c.pct}%)`),
          development_areas: competencies.slice(-2).reverse().map(c => `${c.key} (${c.pct}%)`)
        };
      } catch {}
      return null;
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['ml-goals', user?.email],
    queryFn: async () => {
      try {
        const byCreator = await base44.entities.Goal.filter({ created_by: user.email, status: 'active' }, '-created_date', 15);
        if (byCreator.length > 0) return byCreator;
        return await base44.entities.Goal.filter({ assigned_to_emails: { $in: [user.email] }, status: 'active' }, '-created_date', 15);
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
    queryFn: async () => {
      try {
        const rows = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1);
        return rows[0] || null;
      } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ['ml-trends', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: recentPulses = [] } = useQuery({
    queryKey: ['ml-pulses', user?.email],
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 50); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: latestAssessment = null } = useQuery({
    queryKey: ['ml-assessment-latest', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: pendingDecisions = [], refetch: refetchDecisions } = useQuery({
    queryKey: ['ml-pending-decisions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        return await base44.entities.DecisionJournal.filter(
          { user_email: user.email, status: 'committed' },
          '-created_date',
          50
        );
      } catch (e) {
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Patterns-specific data
  const { data: activities = [] } = useQuery({
    queryKey: ['ml-activities', user?.email],
    queryFn: async () => { try { return await base44.entities.UserActivity.filter({ user_email: user.email }, '-date', 14); } catch { return []; } },
    enabled: !!user?.email && activeTab === 'patterns', staleTime: 15 * 60 * 1000,
  });

  const { data: entityCheckIns = [] } = useQuery({
    queryKey: ['daily-checkin-history', user?.email],
    queryFn: async () => { try { return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-check_in_date', 120); } catch { return []; } },
    enabled: !!user?.email && activeTab === 'patterns', staleTime: 0,
  });

  const { data: memory = null } = useQuery({
    queryKey: ['ml-memory', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.ManagerMemory.filter({ user_email: user.email }, '-last_synthesized_at', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email && activeTab === 'patterns', staleTime: 30 * 60 * 1000,
  });

  // Merged check-in history for patterns tab
  const mergedCheckIns = useMemo(() => {
    const map = new Map();
    entityCheckIns.forEach(r => map.set(r.check_in_date, r));
    checkInHistory.forEach(r => { if (r.check_in_date) map.set(r.check_in_date, r); });
    const sorted = Array.from(map.values()).sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
    if (!todayRecord) return sorted;
    const ids = new Set(sorted.map(r => r.check_in_date));
    const hasScores = todayRecord.energy_score != null || todayRecord.confidence_score != null;
    return (!ids.has(todayET) && hasScores) ? [todayRecord, ...sorted] : sorted;
  }, [entityCheckIns, checkInHistory, todayRecord, todayET]);

  const topPattern = useMemo(() => {
    const patterns = runBpoPatternEngine({ trends, checkIns: checkInHistory, goals, activities: [], pulses: recentPulses });
    return patterns[0] || null;
  }, [trends, checkInHistory, goals, recentPulses]);

  const rankedPatterns = useMemo(() =>
    runBpoPatternEngine({ trends, checkIns: mergedCheckIns, goals, activities, pulses: recentPulses }),
    [trends, mergedCheckIns, goals, activities, recentPulses]
  );
  const heroPattern = rankedPatterns[0] || null;

  const decisionContextForOrchestrator = topPattern && pendingDecisions.length > 0 ? {
    mode: 'pattern_linked_decision',
    pattern_name: topPattern.name,
    pattern_bucket: topPattern.bucket,
  } : null;

  const { orchestratorData } = useAtreusOrchestrator({
    page: 'today',
    active_pattern: topPattern?.name || null,
    check_in_state: todayRecord ? {
      morning_done: !!todayRecord.morning_completed,
      evening_done: !!todayRecord.evening_completed,
      energy_score: todayRecord.energy_score,
      load_score: todayRecord.load_score,
    } : null,
    pending_decisions: pendingDecisions.length > 0 ? {
      count: pendingDecisions.length,
      recent: pendingDecisions.slice(0, 3).map(d => ({
        id: d.id,
        decision_text: d.decision_text,
        pattern_name: d.pattern_name,
        confidence: d.confidence,
        status: d.status,
      }))
    } : null,
    decision_context: decisionContextForOrchestrator,
    enabled: !!user?.email,
  });

  const openAtreus = (msg, decisionContext = null) => {
    openWithContext({
      context: {
        pageType: 'today',
        user_name: getFirstName(user),
        orchestrator_mode: orchestratorData?.mode,
        signal_score: orchestratorData?.signal_score,
        situation: orchestratorData?.situation,
        ...(decisionContext && {
          decision_mode: decisionContext.mode,
          decision_text: decisionContext.decision_text,
          outcome: decisionContext.outcome,
          pattern_name: decisionContext.pattern_name,
          pattern_bucket: decisionContext.pattern_bucket,
          calibration_flag: decisionContext.calibration_flag,
          related_decisions: decisionContext.related_decisions,
        }),
      },
      starterMessage: msg || orchestratorData?.opening_message || "I'd like to reflect on my leadership this week."
    });
  };

  const openAtreusPatterns = (msg) => openWithContext({
    context: { pageType: 'patterns', user_name: user?.full_name },
    starterMessage: msg || "Help me understand my recent patterns."
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['ml-kpis', user?.email],
    queryFn: async () => { try { return await base44.entities.KPI.filter({ status: "active" }, "-updated_date", 10); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: cascadedGoals = [] } = useQuery({
    queryKey: ['ml-cascaded-goals', user?.email],
    queryFn: async () => {
      try {
        const allShared = await base44.entities.Goal.filter({ visibility: "shared", status: "active" }, "-updated_date", 10);
        return allShared.filter(g => g.created_by !== user?.email);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const needsToneOnboarding = tonePref === null;
  const firstName = getFirstName(user);
  const hour = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', hour12: false
  }).format(new Date()), 10);

  const isMorningWindow = hour >= 5 && hour < 15;
  const isMiddayWindow = hour >= 11 && hour < 14;
  const isEveningWindow = hour >= 15 || hour < 5;

  const showMorningCheckIn = isMorningWindow && !todayRecord?.morning_completed;
  const showMiddayLoop = isMiddayWindow && !todayRecord?.midday_loop_completed;
  const showEveningCheckIn = isEveningWindow && !todayRecord?.evening_completed;

  const allDone = todayRecord?.morning_completed && todayRecord?.evening_completed;
  const hasHistoricalData = checkInHistory.length >= 1;

  // ── Today tab content
  const todayMainContent = (
    <div className="space-y-4">
      {(showMorningCheckIn || todayRecord?.morning_completed) && (
        <MorningCheckIn
          todayRecord={todayRecord}
          userEmail={user?.email}
          onComplete={handleCheckInComplete}
        />
      )}

      {(showMiddayLoop || todayRecord?.midday_loop_completed) && (
        <MiddayPriorityLoop
          todayRecord={todayRecord}
          onComplete={handleCheckInComplete}
        />
      )}

      {isMiddayWindow && !todayRecord?.midday_loop_completed && !todayRecord?.big3_priorities?.length && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">📋</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">No priorities set for today</p>
            <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
              Set your Big 3 tonight in the evening check-in so tomorrow's midday loop has something to track.
            </p>
          </div>
        </div>
      )}

      {(showEveningCheckIn || todayRecord?.evening_completed) && (
        <EveningCheckIn
          todayRecord={todayRecord}
          userEmail={user?.email}
          goals={goals}
          onComplete={handleCheckInComplete}
          isActiveWindow={isEveningWindow}
        />
      )}

      {topPattern && (
        <TopPatternCard pattern={topPattern} onOpenAtreus={openAtreus} onDecisionCommitted={refetchDecisions} pendingDecisions={pendingDecisions} />
      )}

      {!!user?.email && (
        <TodaysPlaybook
          todayRecord={localBig3Override ? { ...todayRecord, big3_priorities: localBig3Override } : todayRecord}
          yesterdayBig3={yesterdayBig3}
          pulse={recentPulses[0] || null}
          trends={trends}
          goals={goals}
          assignments={assignments}
          pulses={recentPulses}
          pendingDecisions={pendingDecisions}
          onDecisionOutcomeSaved={async () => { await refetchDecisions(); }}
          onOpenAtreus={openAtreus}
          onBig3Saved={(priorities) => {
            setLocalBig3Override(priorities);
            try {
              sessionStorage.setItem('today_big3_override', JSON.stringify({ date: todayET, data: priorities }));
            } catch {}
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['daily-checkin-today', user?.email] }), 3000);
          }}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['daily-checkin-today', user?.email] });
            refetchToday();
          }}
          userEmail={user?.email}
        />
      )}

      {allDone && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">You've completed today's rhythm</p>
            <p className="text-xs text-emerald-700 leading-relaxed mt-0.5">
              Morning intent, midday check, and evening reflection — all done. See you tomorrow.
            </p>
          </div>
        </div>
      )}

      {hasHistoricalData && (
        <button
          onClick={() => setShowWeeklyReflection(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-card border border-border hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-4 h-4 text-[#0202ff] flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Weekly rhythm summary</p>
              <p className="text-[10px] text-muted-foreground">Charts, AI narrative, risks, recognition & next steps</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
        </button>
      )}

      {/* Mobile-only: trend dashboard, performance, friction, practice, decisions */}
      <div className="md:hidden">
        <CheckInTrendDashboard checkIns={(() => {
          const ids = new Set(checkInHistory.map(r => r.check_in_date));
          const hasToday = ids.has(todayET);
          const hasScores = todayRecord && (todayRecord.energy_score != null || todayRecord.confidence_score != null);
          return (!hasToday && hasScores) ? [todayRecord, ...checkInHistory] : checkInHistory;
        })()} assessment={latestAssessment} />
      </div>
      <div className="md:hidden">
        <PerformanceGlanceCard kpis={kpis} cascadedGoals={cascadedGoals} goals={goals} />
      </div>
      <div className="md:hidden">
        <UpcomingFrictionCard trends={trends} goals={goals} pulses={recentPulses} onOpenAtreus={openAtreus} />
      </div>
      <div className="md:hidden">
        <PracticeCard />
      </div>
      <div className="md:hidden">
        <DecisionJournalCard />
      </div>
    </div>
  );

  // ── Today tab companion column (desktop)
  const todayCompanionColumn = (
    <div className="space-y-4">
      {needsToneOnboarding && (
        <div className="bg-card rounded-2xl border border-[#0202ff]/20 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <p className="text-xs font-semibold text-foreground">How should Atreus talk to you?</p>
          </div>
          <div className="px-4 pb-4">
            <ToneOnboarding existingTone={null} onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-tone', user?.email] })} />
          </div>
        </div>
      )}
      <PerformanceGlanceCard kpis={kpis} cascadedGoals={cascadedGoals} goals={goals} />
      <CheckInTrendDashboard checkIns={(() => {
        const ids = new Set(checkInHistory.map(r => r.check_in_date));
        const hasToday = ids.has(todayET);
        const hasScores = todayRecord && (todayRecord.energy_score != null || todayRecord.confidence_score != null);
        return (!hasToday && hasScores) ? [todayRecord, ...checkInHistory] : checkInHistory;
      })()} assessment={latestAssessment} />
      <UpcomingFrictionCard trends={trends} goals={goals} pulses={recentPulses} onOpenAtreus={openAtreus} />
      <DecisionJournalCard />
    </div>
  );

  // ── Patterns tab content (left column)
  const big3DaysCount = checkInHistory.filter(c => c.big3_priorities?.length > 0).length;

  const patternsLeftColumn = (
    <div className="space-y-4">
      {heroPattern ? (
        <>
          <BpoHeroPatternCard pattern={heroPattern} onOpenAtreus={openAtreusPatterns} />
          <BpoWatchRow patterns={rankedPatterns} onOpenAtreus={openAtreusPatterns} />
        </>
      ) : (
        <LeadingPatternCard
          trends={trends}
          pulses={recentPulses}
          goals={goals}
          recentCheckIns={checkInHistory}
          recentPulses={recentPulses}
          onOpenAtreus={openAtreusPatterns}
        />
      )}
      <LeadershipNarrativeCard trends={trends} insight={insight} goals={goals} onOpenAtreus={openAtreusPatterns} />
      {big3DaysCount >= 5 && (
        <IntentLoopCard pulses={recentPulses} trends={trends} onOpenAtreus={openAtreusPatterns} />
      )}
      <WhatsImprovingCard trends={trends} pulses={recentPulses} goals={goals} />
      <DecisionJournalCard />
    </div>
  );

  // ── Patterns tab content (right column)
  const patternsRightColumn = (
    <div className="space-y-4">
      <PerformanceGlanceCard kpis={kpis} cascadedGoals={cascadedGoals} goals={goals} />
      <CheckInTrendDashboard checkIns={mergedCheckIns} assessment={latestAssessment} />
      <WatchlistCard trends={trends} pulses={recentPulses} goals={goals} onOpenAtreus={openAtreusPatterns} />
    </div>
  );

  return (
    <div className="px-4 py-6">
      {/* Mobile: tone onboarding banner */}
      {needsToneOnboarding && activeTab === 'today' && (
        <div className="md:hidden max-w-2xl mx-auto mb-4 bg-card rounded-2xl border border-[#0202ff]/20 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <p className="text-xs font-semibold text-foreground">How should Atreus talk to you?</p>
          </div>
          <div className="px-4 pb-4">
            <ToneOnboarding existingTone={null} onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-tone', user?.email] })} />
          </div>
        </div>
      )}

      {/* Mobile: single column */}
      <div className="md:hidden max-w-2xl mx-auto space-y-4">
        <HeroGreeting firstName={firstName} hasCheckedIn={!!todayRecord} todayRecord={todayRecord} onSettingsToggle={todayRecord ? () => setShowSettings(s => !s) : null} />
        <TabPills activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'today' && todayMainContent}

        {activeTab === 'patterns' && (
          <SwipeableSections
            sections={[
              { label: "Patterns", content: patternsLeftColumn },
              { label: "Signals", content: patternsRightColumn },
            ]}
          />
        )}
      </div>

      {/* Desktop: two column */}
      <div className="hidden md:block max-w-6xl mx-auto">
        <HeroGreeting firstName={firstName} hasCheckedIn={!!todayRecord} todayRecord={todayRecord} onSettingsToggle={todayRecord ? () => setShowSettings(s => !s) : null} />
        <div className="mt-3 mb-5">
          <TabPills activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {activeTab === 'today' && (
          <div className="grid grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-4">{todayMainContent}</div>
            <div className="sticky top-4">{todayCompanionColumn}</div>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="grid grid-cols-[1fr_360px] gap-6 items-start">
            <div>{patternsLeftColumn}</div>
            <div className="sticky top-4">{patternsRightColumn}</div>
          </div>
        )}
      </div>

      <WeeklyRhythmReflection
        isOpen={showWeeklyReflection}
        onClose={() => setShowWeeklyReflection(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] });
          queryClient.invalidateQueries({ queryKey: ['daily-checkin-history', user?.email] });
        }}
        userEmail={user?.email}
        assessmentInsight={insight}
      />

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#0202ff]" />
                  <p className="text-sm font-semibold text-foreground">Atreus settings</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <CheckInSettings />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}