/**
 * ManagerToday — The Daily Companion (Redesigned Lead page)
 * Route: /today
 *
 * Layout: Daily HUD strip → Check-in hero → Today's Playbook (merged card)
 * Companion column (desktop): Upcoming Friction + Intent Loop
 * Removed from Lead: TrendSummaryCard, CheckInHistoryCalendar (→ Patterns)
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Link } from "react-router-dom";
import { Brain, ChevronRight, MessageSquare, SlidersHorizontal, BarChart3, Layers, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ToneOnboarding from "@/components/checkin/ToneOnboarding";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import MorningCheckIn from "@/components/checkin/MorningCheckIn";
import EveningCheckIn from "@/components/checkin/EveningCheckIn";
import MiddayPriorityLoop from "@/components/checkin/MiddayPriorityLoop";
import WeeklyRhythmReflection from "@/components/checkin/WeeklyRhythmReflection";
import UpcomingFrictionCard from "@/components/lead/UpcomingFrictionCard";
import RhythmPulseChart from "@/components/rhythm/RhythmPulseChart";
import TodaysPlaybook from "@/components/lead/TodaysPlaybook";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function HeroGreeting({ firstName, hasCheckedIn, todayPulse, onSettingsToggle }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // After check-in, the greeting reacts to the signal
  let sub = "Let's see what matters right now.";
  if (hasCheckedIn && todayPulse) {
    if (todayPulse.energy_level === 'drained' || todayPulse.perceived_load === 'unsustainable') sub = "It's a heavy one. Let's make it count.";
    else if (todayPulse.energy_level === 'strong') sub = "You're in a good place. Use it well.";
    else if (todayPulse.focus_category) sub = "Intent is set. Let's hold the shape.";
    else if (todayPulse.avoidance_flag === 'yes') sub = "Something's circling. Let's name it.";
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

function ExploreDeeperCard() {
  return (
    <div className="flex gap-2">
      <Link to="/patterns" className="flex-1">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group">
          <BarChart3 className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Patterns</p>
            <p className="text-[10px] text-muted-foreground">What the system sees over time</p>
          </div>
        </div>
      </Link>
      <Link to="/practice" className="flex-1">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors group">
          <Layers className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Practice</p>
            <p className="text-[10px] text-muted-foreground">Prepare, reflect, work through</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function ManagerToday() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
  const [showSettings, setShowSettings] = useState(false);
  const [showWeeklyReflection, setShowWeeklyReflection] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState(null);

  // Load today's DailyCheckIn record
  const { data: todayRecord, refetch: refetchToday } = useQuery({
    queryKey: ['daily-checkin-today', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("saveDailyCheckIn", { action: "get_today" });
        return res.data?.record || null;
      } catch { return null; }
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000,
  });

  // Load recent DailyCheckIn history for the trend chart
  const { data: checkInHistory = [] } = useQuery({
    queryKey: ['daily-checkin-history', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-check_in_date', 14);
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const handleCheckInComplete = () => {
    refetchToday();
    queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['daily-checkin-history', user?.email] });
  };

  const openAtreus = (msg) => openWithContext({
    context: { pageType: 'today', user_name: getFirstName(user) },
    starterMessage: msg || "I'd like to reflect on my leadership this week."
  });

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
    enabled: !!user?.email, staleTime: 0,
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
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 20); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const needsToneOnboarding = tonePref === null;
  const firstName = getFirstName(user);
  const day = new Date().getDay();
  const hour = new Date().getHours();

  const todayKey = localDateKey();
  const todayPulse = recentPulses.find(p => p.created_date?.startsWith(todayKey));

  // Determine which check-in flow to surface based on time of day
  const isMorningWindow = hour >= 5 && hour < 12;
  const isMiddayWindow = hour >= 11 && hour < 14;
  const isEveningWindow = hour >= 15;

  const showMorningCheckIn = isMorningWindow && !todayRecord?.morning_completed;
  const showMiddayLoop = isMiddayWindow && todayRecord?.big3_priorities?.length > 0 && !todayRecord?.midday_loop_completed;
  const showEveningCheckIn = isEveningWindow && !todayRecord?.evening_completed;

  const pendingDebrief = recentPulses.find(p =>
    p.prompt_type === 'prepare_debrief_pending' &&
    p.scheduled_for &&
    new Date(p.scheduled_for) <= new Date() &&
    !recentPulses.some(q => q.prompt_type === 'follow_up' && q.focus_intention?.startsWith('Debrief:') && q.created_date > p.created_date)
  );

  // ── Main column ─────────────────────────────────────────────────────────────
  const mainContent = !needsToneOnboarding ? (
    <div className="space-y-4">
      {/* Rhythm trend chart — merges history + today's record for immediate feedback */}
      {(() => {
        const historyIds = new Set(checkInHistory.map(r => r.id));
        const merged = todayRecord && !historyIds.has(todayRecord.id)
          ? [todayRecord, ...checkInHistory]
          : checkInHistory;
        return merged.length >= 1 ? <RhythmPulseChart checkIns={merged} /> : null;
      })()}

      {/* Pending debrief prompt */}
      {pendingDebrief && (
        <div className="bg-gradient-to-br from-[#0202ff]/5 to-transparent rounded-2xl border border-[#0202ff]/15 px-4 py-4 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#0202ff] uppercase tracking-wide mb-0.5">Debrief ready</p>
            <p className="text-sm font-semibold text-foreground leading-snug mb-1">
              How did it go? — {pendingDebrief.focus_intention?.replace('Debrief: ', '').slice(0, 60)}
            </p>
            <p className="text-xs text-muted-foreground">You prepared for this earlier. Close the loop with a quick debrief.</p>
            <button
              className="mt-2 text-xs font-medium text-[#0202ff] hover:underline"
              onClick={() => openAtreus(`Earlier I prepared for: "${pendingDebrief.focus_intention?.replace('Debrief: ', '')}". Now I'd like to debrief — how did it go? What surprised me? What would I do differently?`)}
            >
              Debrief with Atreus →
            </button>
          </div>
        </div>
      )}

      {/* ── RHYTHM CHECK-IN FLOWS ────────────────────────────────────────── */}
      {/* Morning check-in (5am–noon, not yet done) */}
      {(showMorningCheckIn || todayRecord?.morning_completed) && (
        <MorningCheckIn
          todayRecord={todayRecord}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* Midday priority loop (11am–2pm, Big 3 set, not yet done) */}
      {(showMiddayLoop || todayRecord?.midday_loop_completed) && (
        <MiddayPriorityLoop
          todayRecord={todayRecord}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* Evening check-in (3pm+, not yet done) */}
      {(showEveningCheckIn || todayRecord?.evening_completed) && (
        <EveningCheckIn
          todayRecord={todayRecord}
          goals={goals}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* Big 3 display — when set from evening, show tomorrow's plan in the morning */}
      {isMorningWindow && todayRecord?.big3_priorities?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Big 3 today</p>
          <div className="space-y-1.5">
            {todayRecord.big3_priorities.map((p, i) => (
              <div key={p.id} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#0202ff] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-foreground leading-snug">{p.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Playbook */}
      {todayPulse && (
        <TodaysPlaybook
          pulse={todayPulse}
          trends={trends}
          goals={goals}
          assignments={assignments}
          pulses={recentPulses}
          onOpenAtreus={openAtreus}
        />
      )}

      {/* Weekly rhythm summary shortcut */}
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

      {/* Mobile: Go deeper links */}
      <div className="md:hidden">
        <ExploreDeeperCard />
      </div>
    </div>
  ) : null;

  // ── Desktop companion column ─────────────────────────────────────────────────
  const companionColumn = !needsToneOnboarding ? (
    <div className="space-y-4">
      <UpcomingFrictionCard
        trends={trends}
        goals={goals}
        pulses={recentPulses}
        onOpenAtreus={openAtreus}
      />
      <ExploreDeeperCard />
    </div>
  ) : null;

  return (
    <div className="px-4 py-6">
      {/* Tone onboarding gate */}
      {needsToneOnboarding && (
        <div className="max-w-2xl mx-auto">
          <HeroGreeting firstName={firstName} />
          <div className="mt-4 bg-card rounded-2xl border border-[#0202ff]/20 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">One quick thing before we start</p>
                <p className="text-xs text-muted-foreground">Choose how Atreus speaks with you.</p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <ToneOnboarding existingTone={null} onComplete={() => queryClient.invalidateQueries({ queryKey: ['ml-tone', user?.email] })} />
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      {!needsToneOnboarding && (
        <>
          {/* Mobile: single column */}
          <div className="md:hidden max-w-2xl mx-auto space-y-4">
            <HeroGreeting firstName={firstName} hasCheckedIn={!!todayPulse} todayPulse={todayPulse} onSettingsToggle={todayPulse ? () => setShowSettings(s => !s) : null} />
            {mainContent}
          </div>

          {/* Desktop: two column */}
          <div className="hidden md:block max-w-6xl mx-auto">
            <HeroGreeting firstName={firstName} hasCheckedIn={!!todayPulse} todayPulse={todayPulse} onSettingsToggle={todayPulse ? () => setShowSettings(s => !s) : null} />
            <div className="mt-4 grid grid-cols-[1fr_340px] gap-6 items-start">
              <div className="space-y-4">{mainContent}</div>
              <div className="sticky top-4">{companionColumn}</div>
            </div>
          </div>
        </>
      )}

      <WeeklyRhythmReflection
        isOpen={showWeeklyReflection}
        onClose={() => setShowWeeklyReflection(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] })}
        userEmail={user?.email}
        assessmentInsight={insight}
      />

      {/* Atreus Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setShowSettings(false)}
            />
            {/* Panel */}
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
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
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