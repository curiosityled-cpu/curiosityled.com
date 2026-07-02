/**
 * ManagerPractice — The active coaching studio.
 * Route: /practice
 * Single-scroll, intent-driven layout:
 *   1. Lead alerts (patterns/risks from the Lead page)
 *   2. Take Action (coaching flows + workouts + leadership tools)
 *   3. Leadership Pulse (progress summary → /my-performance, /my-development)
 */
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Brain, Users, Layers, ChevronRight
} from "lucide-react";
import PracticeFlow from "@/components/practice/PracticeFlow";
import CoachingFlowsCard from "@/components/practice/CoachingFlowsCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import LeadAlertsSection from "@/components/practice/LeadAlertsSection";
import LeadershipPulse from "@/components/practice/LeadershipPulse";
import DecisionJournalOutcomeReview from "@/components/practice/DecisionJournalOutcomeReview";
import { runBpoPatternEngine } from "@/components/patterns/bpoPatternEngine";

const FLOW_KEYS = {
  Prepare: 'prepare',
  Debrief: 'debrief',
  'Work through something': 'work_through',
  Reflect: 'reflect',
};

function SectionLabel({ children, hint }) {
  return (
    <div className="px-1 pt-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{children}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function ActionTile({ icon: Icon, iconBg, iconColor, title, subtitle, description, prompt, to, onStartFlow }) {
  const { openWithContext } = useAtreusChat();
  const flowKey = FLOW_KEYS[title];

  const handleClick = () => {
    if (flowKey && onStartFlow) {
      onStartFlow(flowKey);
    } else if (prompt) {
      openWithContext({ context: { pageType: 'practice' }, starterMessage: prompt });
    }
  };

  const content = (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer active:scale-[0.99]">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        {subtitle && <p className="text-[10px] font-medium mt-0.5 text-muted-foreground">{subtitle}</p>}
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return <button className="w-full text-left" onClick={handleClick}>{content}</button>;
}

export default function ManagerPractice() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [activeFlow, setActiveFlow] = useState(null);

  const openAtreus = (msg) => openWithContext({ context: { pageType: 'practice', user_name: user?.full_name }, starterMessage: msg });

  // ── Data queries ──
  const { data: goals = [] } = useQuery({
    queryKey: ['mp-goals', user?.email],
    queryFn: async () => {
      try {
        const r = await base44.entities.Goal.filter({ user_email: user.email }, '-created_date', 20);
        if (r.length) return r;
        return await base44.entities.Goal.filter({ created_by: user.email }, '-created_date', 20);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['mp-assignments', user?.email],
    queryFn: async () => { try { return await base44.entities.AssignedLearning.filter({ user_email: user.email }, '-created_date', 10); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: pulses = [] } = useQuery({
    queryKey: ['mp-pulses', user?.email],
    queryFn: async () => { try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, '-created_date', 30); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ['mp-trends', user?.email],
    queryFn: async () => { try { const r = await base44.entities.ManagerTrends.filter({ user_email: user.email }, '-last_trend_computed_at', 1); return r[0] || null; } catch { return null; } },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: insight = null } = useQuery({
    queryKey: ['mp-insight', user?.email],
    queryFn: async () => {
      try { const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, '-created_date', 1); return rows[0] || null; } catch { return null; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['mp-checkins', user?.email],
    queryFn: async () => { try { return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, '-check_in_date', 30); } catch { return []; } },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  // ── Pattern engine for Lead alerts ──
  const patterns = useMemo(() => {
    return runBpoPatternEngine({ trends, checkIns, goals, activities: [], pulses });
  }, [trends, checkIns, goals, pulses]);

  const handleStartFlow = (flowKey) => {
    setActiveFlow(flowKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-10">

      {/* Header */}
      <div className="pb-4">
        <h1 className="text-2xl font-bold text-foreground">Practice</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Prepare, work through, and move the needle on your leadership.</p>
      </div>

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

      {/* Command Center layout */}
      {!activeFlow && (
        <div className="space-y-6">

          {/* Top row: Lead Alerts (full width) */}
          <LeadAlertsSection patterns={patterns} onOpenAtreus={openAtreus} />

          {/* Main grid: Action zone (left) + Context sidebar (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left / center — Action zone */}
            <div className="lg:col-span-2 space-y-6">

              {/* Coaching Flows — scrollable list with expandable popups */}
              <CoachingFlowsCard onStartFlow={handleStartFlow} />

              {/* Leadership Tools */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Leadership Tools</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ActionTile
                    icon={Brain}
                    iconBg="bg-rose-50 dark:bg-rose-950/40"
                    iconColor="text-rose-600"
                    title="Decision journal"
                    description="Capture a high-stakes decision — context, confidence, risks — and review outcomes later."
                    to="/decision-journal"
                  />
                  <ActionTile
                    icon={Users}
                    iconBg="bg-sky-50 dark:bg-sky-950/40"
                    iconColor="text-sky-600"
                    title="1:1 prep & notes"
                    description="Prepare questions, review commitments, and track conversation notes."
                    prompt="Help me prepare for an upcoming 1:1. What questions should I be thinking about?"
                  />
                  <ActionTile
                    icon={Layers}
                    iconBg="bg-orange-50 dark:bg-orange-950/40"
                    iconColor="text-orange-600"
                    title="Delegation planner"
                    description="Identify what to hand off and how to set your team up for success."
                    prompt="I want to think through what I should delegate. Can you help me work through it?"
                  />
                </div>
                <DecisionJournalOutcomeReview />
              </div>
            </div>

            {/* Right — Context sidebar */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20 lg:self-start">
              {/* Daily Gym */}
              <div className="space-y-2">
                <div className="px-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Daily Gym</p>
                  <p className="text-xs text-muted-foreground mt-0.5">3–7 min exercises personalised to your active patterns and goals.</p>
                </div>
                <WorkoutsSection goals={goals} trends={trends} insight={insight} />
              </div>

              {/* Leadership Pulse */}
              <LeadershipPulse goals={goals} pulses={pulses} assignments={assignments} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}