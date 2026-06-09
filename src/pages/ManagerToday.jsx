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
import { Brain, ChevronRight, MessageSquare, SlidersHorizontal, BarChart3, Layers, X } from "lucide-react";
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
import CheckInTrendDashboard from "@/components/patterns/CheckInTrendDashboard";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes('@') ? raw.split(' ')[0] : 'there';
}

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function HeroGreeting({ firstName, hasCheckedIn, todayRecord, onSettingsToggle }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // After check-in, the greeting reacts to the DailyCheckIn signal
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

  const { data: latestAssessment = null } = useQuery({
    queryKey: ['ml-assessment-latest', user?.email],
    queryFn: async () => { try { const rows = await base44.entities.Assessment.filter({ email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 0,
  });

  const needsToneOnboarding = tonePref === null;
  const firstName = getFirstName(user);
  const hour = new Date().getHours();

  // Determine which check-in flow to surface based on time of day
  const isMorningWindow = hour >= 5 && hour < 12;
  const isMiddayWindow = hour >= 11 && hour < 14;
  const isEveningWindow = hour >= 15;

  const showMorningCheckIn = isMorningWindow && !todayRecord?.morning_completed;
  const showMiddayLoop = isMiddayWindow && !todayRecord?.midday_loop_completed;
  const showEveningCheckIn = isEveningWindow && !todayRecord?.evening_completed;

  // Day complete: all relevant windows done
  const allDone = todayRecord?.morning_completed && todayRecord?.evening_completed;

  // Has any check-in data at all (for gating weekly reflection)
  const hasHistoricalData = checkInHistory.length >= 2;

  // Nothing actionable right now (outside all windows, no record yet)
  const isQuietZone = !isMorningWindow && !isMiddayWindow && !isEveningWindow && !todayRecord;


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

      {/* ── [3] Quiet zone / nothing yet state ───────────────────────────── */}
      {isQuietZone && (
        <div className="bg-card rounded-2xl border border-dashed border-border px-5 py-8 text-center">
          <Brain className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Check back this morning</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Your morning check-in opens at 5 am. Come back then to set your intent for the day.
          </p>
        </div>
      )}

      {/* ── [4] Playbook even without check-in (goals/assignments available) */}
      {!todayRecord && !isQuietZone && (goals.length > 0 || assignments.length > 0) && (
        <TodaysPlaybook
          todayRecord={null}
          trends={trends}
          goals={goals}
          assignments={assignments}
          pulses={recentPulses}
          onOpenAtreus={openAtreus}
        />
      )}

      {/* ── RHYTHM CHECK-IN FLOWS ────────────────────────────────────────── */}
      {/* Morning check-in (5am–noon, not yet done) */}
      {(showMorningCheckIn || todayRecord?.morning_completed) && (
        <MorningCheckIn
          todayRecord={todayRecord}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* Midday priority loop (11am–2pm, not yet done) */}
      {(showMiddayLoop || todayRecord?.midday_loop_completed) && (
        <MiddayPriorityLoop
          todayRecord={todayRecord}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* [2] Midday fallback — window open but no Big 3 set */}
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

      {/* Evening check-in (3pm+, not yet done) */}
      {(showEveningCheckIn || todayRecord?.evening_completed) && (
        <EveningCheckIn
          todayRecord={todayRecord}
          goals={goals}
          onComplete={handleCheckInComplete}
        />
      )}

      {/* Today's Playbook (Goal signal) — shown once check-in exists, directly under check-ins */}
      {todayRecord && (
        <TodaysPlaybook
          todayRecord={todayRecord}
          trends={trends}
          goals={goals}
          assignments={assignments}
          pulses={recentPulses}
          onOpenAtreus={openAtreus}
        />
      )}

      {/* Big 3 display — set last evening, surfaced in morning before check-in */}
      {isMorningWindow && !todayRecord?.morning_completed && (() => {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
        const src = todayRecord?.big3_priorities?.length > 0
          ? todayRecord
          : checkInHistory.find(r => r.check_in_date === yk && r.big3_priorities?.length > 0);
        if (!src?.big3_priorities?.length) return null;
        return (
          <div className="bg-card rounded-2xl border border-border px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Big 3 today</p>
            <div className="space-y-1.5">
              {src.big3_priorities.map((p, i) => (
                <div key={p.id || i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#0202ff] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-foreground leading-snug">{p.title}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── [5] Day complete celebration ─────────────────────────────────── */}
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

      {/* Weekly rhythm summary shortcut — [6] only shown when enough history exists */}
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

      {/* Trend dashboard — mobile only (desktop gets it in companion column) */}
      <div className="md:hidden">
        <CheckInTrendDashboard checkIns={checkInHistory} assessment={latestAssessment} />
      </div>

      {/* Mobile: Go deeper links */}
      <div className="md:hidden">
        <ExploreDeeperCard />
      </div>
    </div>
  ) : null;

  // ── Desktop companion column ─────────────────────────────────────────────────
  const companionColumn = !needsToneOnboarding ? (
    <div className="space-y-4">
      {/* [1] Pre-check-in nudge when nothing done yet */}
      {!todayRecord && !isQuietZone && (
        <div className="bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-2xl px-4 py-4">
          <p className="text-xs font-semibold text-[#0202ff] mb-1">Before you dive in</p>
          <p className="text-xs text-foreground leading-relaxed">
            A quick check-in takes 60 seconds and helps the system give you sharper signals throughout the day.
          </p>
        </div>
      )}
      {/* Leadership rhythm trends — above Watch this */}
      <CheckInTrendDashboard checkIns={checkInHistory} assessment={latestAssessment} />
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
            <HeroGreeting firstName={firstName} hasCheckedIn={!!todayRecord} todayRecord={todayRecord} onSettingsToggle={todayRecord ? () => setShowSettings(s => !s) : null} />
            {mainContent}
          </div>

          {/* Desktop: two column */}
          <div className="hidden md:block max-w-6xl mx-auto">
            <HeroGreeting firstName={firstName} hasCheckedIn={!!todayRecord} todayRecord={todayRecord} onSettingsToggle={todayRecord ? () => setShowSettings(s => !s) : null} />
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
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['ml-pulses', user?.email] });
          queryClient.invalidateQueries({ queryKey: ['daily-checkin-history', user?.email] });
        }}
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