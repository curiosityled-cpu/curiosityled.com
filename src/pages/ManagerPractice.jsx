/**
 * ManagerPractice — The active coaching studio.
 * Route: /practice
 *
 * Redesigned to mirror the Lead page (/today) visual rhythm:
 *   - Animated "training room at dusk + energy pulse" hero with inline streak ring
 *   - Two-column grid: action zone (left) | context sidebar (right)
 *   - Prescribed-practice card (pattern → recommended workout)
 *   - Recent sessions log with all-time history
 */
import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Brain, Users, Layers, ChevronRight, SlidersHorizontal, X,
} from "lucide-react";
import PracticeFlow from "@/components/practice/PracticeFlow";
import CoachingFlowsCard from "@/components/practice/CoachingFlowsCard";
import RequestCoachingCard from "@/components/practice/RequestCoachingCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import PracticeHeroHeader from "@/components/practice/PracticeHeroHeader";
import PrescribedPracticeCard from "@/components/practice/PrescribedPracticeCard";
import PracticeSessionsLog from "@/components/practice/PracticeSessionsLog";
import { runBpoPatternEngine } from "@/components/patterns/bpoPatternEngine";
import CheckInSettings from "@/components/checkin/CheckInSettings";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

function getFirstName(user) {
  const raw = user?.display_name || user?.data?.display_name || user?.full_name;
  return raw && raw.trim() && !raw.includes("@") ? raw.split(" ")[0] : "there";
}

function isPracticeSession(p) {
  const focus = (p.focus_intention || "").toLowerCase();
  return (
    focus.startsWith("workout completed") ||
    focus.startsWith("practice session") ||
    focus.startsWith("flow completed") ||
    p.prompt_type === "practice_session"
  );
}

function startOfWeekET() {
  // Monday as start of week, in America/New_York
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = now.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function ManagerPractice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
  const [activeFlow, setActiveFlow] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const firstName = getFirstName(user);
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "numeric", hour12: false,
    }).format(new Date()),
    10
  );
  const greeting = hour < 12
    ? "Ready for a morning workout"
    : hour < 17
      ? "Ready to practice"
      : "Time for an evening workout";
  const day = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric",
  });

  // ── Data queries ──
  const { data: goals = [] } = useQuery({
    queryKey: ["mp-goals", user?.email],
    queryFn: async () => {
      try {
        const r = await base44.entities.Goal.filter({ user_email: user.email }, "-created_date", 20);
        if (r.length) return r;
        return await base44.entities.Goal.filter({ created_by: user.email }, "-created_date", 20);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: pulses = [] } = useQuery({
    queryKey: ["mp-pulses", user?.email],
    queryFn: async () => {
      try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, "-created_date", 30); }
      catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ["mp-trends", user?.email],
    queryFn: async () => {
      try { const r = await base44.entities.ManagerTrends.filter({ user_email: user.email }, "-last_trend_computed_at", 1); return r[0] || null; }
      catch { return null; }
    },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: insight = null } = useQuery({
    queryKey: ["mp-insight", user?.email],
    queryFn: async () => {
      try { const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, "-created_date", 1); return rows[0] || null; }
      catch { return null; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["mp-checkins", user?.email],
    queryFn: async () => {
      try { return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, "-check_in_date", 30); }
      catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  // ── Pattern engine (active BPO patterns) ──
  const bpoPatterns = useMemo(
    () => runBpoPatternEngine({ trends, checkIns, goals, activities: [], pulses }),
    [trends, checkIns, goals, pulses]
  );

  // ── Cross-tool patterns (connected stack) ──
  const { data: crossToolData = null } = useQuery({
    queryKey: ["mp-cross-tool-patterns", user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getCrossToolPatterns", {
          inAppPatterns: bpoPatterns,
        });
        return res.data?.data || null;
      } catch { return null; }
    },
    enabled: !!user?.email && bpoPatterns.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // ── Practice sessions (for streak ring + consistency fallback) ──
  const { data: sessions = [] } = useQuery({
    queryKey: ["mp-sessions", user?.email],
    queryFn: async () => {
      try {
        const all = await base44.entities.ManagerPulse.filter(
          { user_email: user.email }, "-created_date", 100
        );
        return all.filter(isPracticeSession);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 60 * 1000,
  });

  const weekStart = useMemo(() => startOfWeekET(), []);
  const weekCount = useMemo(
    () => sessions.filter((s) => new Date(s.created_date) >= weekStart).length,
    [sessions, weekStart]
  );

  // recentSessionIds: derive workout ids from recent session focus_intention text
  const recentSessionIds = useMemo(() => {
    const ids = new Set();
    const knownTitles = [
      "delegation audit", "hard conversation prep", "energy drain map",
      "commitment review", "leadership identity anchor", "decision capture",
      "team pulse check", "pattern interrupt",
    ];
    sessions.slice(0, 10).forEach((s) => {
      const focus = (s.focus_intention || "").toLowerCase();
      const colonIdx = focus.indexOf(":");
      const title = colonIdx >= 0 ? focus.slice(colonIdx + 1).trim() : "";
      knownTitles.forEach((kt) => {
        if (title.includes(kt)) ids.add(kt.replace(/\s+/g, "_"));
      });
    });
    return [...ids];
  }, [sessions]);

  // ── Hero status pill ──
  const statusText = useMemo(() => {
    if (weekCount === 0) return "No sessions yet this week — pick a workout and start a streak.";
    if (weekCount >= 5) return `${weekCount} sessions this week — strong consistency. Keep it going.`;
    return `${weekCount} session${weekCount === 1 ? "" : "s"} this week — keep the rhythm.`;
  }, [weekCount]);

  const handleStartFlow = (flowKey) => {
    setActiveFlow(flowKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSessionLogged = () => {
    queryClient.invalidateQueries({ queryKey: ["mp-sessions", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["practice-sessions", user?.email] });
  };

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      {/* ── Animated hero ── */}
      <PracticeHeroHeader
        firstName={firstName}
        greeting={greeting}
        day={day}
        statusText={statusText}
        weekCount={weekCount}
        onSettingsClick={() => setShowSettings((s) => !s)}
        onStreakClick={() => setShowSessions(true)}
      />

      {/* Active flow overlay — full width, dismissible */}
      <AnimatePresence>
        {activeFlow && (
          <motion.div
            key="flow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <PracticeFlow flowKey={activeFlow} onClose={() => setActiveFlow(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main grid: Action zone (left) | Context sidebar (right) ── */}
      {!activeFlow && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left — Action zone */}
          <div className="space-y-4">
            <PrescribedPracticeCard
              crossToolData={crossToolData}
              bpoPatterns={bpoPatterns}
              trends={trends}
              recentSessionIds={recentSessionIds}
              onSessionLogged={handleSessionLogged}
            />

            <CoachingFlowsCard onStartFlow={handleStartFlow} />

            {/* Leadership Tools */}
            <div className="space-y-3">
              <div className="px-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Leadership Tools</p>
                <p className="text-xs text-muted-foreground mt-0.5">Jump to a structured tool to capture, plan, or review.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="divide-y divide-border">
                  <ActionTile
                    icon={Brain}
                    iconBg="bg-rose-50 dark:bg-rose-950/40"
                    iconColor="text-rose-600"
                    title="Decision journal"
                    description="Capture a high-stakes decision and review outcomes later."
                    to="/decision-journal"
                  />
                  <ActionTile
                    icon={Users}
                    iconBg="bg-sky-50 dark:bg-sky-950/40"
                    iconColor="text-sky-600"
                    title="1:1 prep & notes"
                    description="Prepare questions, review commitments, track notes."
                    to="/one-on-ones"
                  />
                  <ActionTile
                    icon={Layers}
                    iconBg="bg-orange-50 dark:bg-orange-950/40"
                    iconColor="text-orange-600"
                    title="Delegation planner"
                    description="Identify what to hand off and set your team up to win."
                    to="/delegation-planner"
                  />
                </div>
              </div>
            </div>

            {/* Request Support */}
            <RequestCoachingCard />
          </div>

          {/* Right — Context sidebar */}
          <div className="space-y-4 md:sticky md:top-20 md:self-start">
            <div className="space-y-2">
              <div className="px-1 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Daily Gym
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  3–7 min exercises personalised to your active patterns and goals.
                </p>
              </div>
              <WorkoutsSection goals={goals} trends={trends} insight={insight} />
            </div>

            <PracticeSessionsLog />
          </div>
        </div>
      )}

      {/* ── Sessions drawer (opened from the streak ring) ── */}
      <Sheet open={showSessions} onOpenChange={setShowSessions}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Practice sessions</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8">
            <PracticeSessionsLog />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Settings slide-out ── */}
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
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
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

function ActionTile({ icon: Icon, iconBg, iconColor, title, description, to }) {
  const content = (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors active:bg-muted/60 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
  if (to) return <Link to={to} className="block">{content}</Link>;
  return content;
}