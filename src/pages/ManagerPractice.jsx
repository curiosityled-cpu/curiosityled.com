/**
 * ManagerPractice — The active coaching studio.
 * Route: /practice
 * Three-tab workspace: Action Studio | Daily Gym | Growth Plan
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { motion, AnimatePresence } from "framer-motion";
import PracticeFlow from "@/components/practice/PracticeFlow";
import ActionStudioTab from "@/components/practice/ActionStudioTab";
import DailyGymTab from "@/components/practice/DailyGymTab";
import GrowthPlanTab from "@/components/practice/GrowthPlanTab";

const TABS = [
  { id: 'studio', label: 'Action Studio' },
  { id: 'gym',    label: 'Daily Gym' },
  { id: 'growth', label: 'Growth Plan' },
];

export default function ManagerPractice() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [activeTab, setActiveTab] = useState('studio');
  const [activeFlow, setActiveFlow] = useState(null);

  const openAtreus = (msg) => openWithContext({ context: { pageType: 'practice', user_name: user?.full_name }, starterMessage: msg });

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

  const { data: devPlans = [] } = useQuery({
    queryKey: ['mp-devplans', user?.email],
    queryFn: async () => { try { return await base44.entities.DevelopmentPlan.filter({ user_email: user.email }, '-created_date', 5); } catch { return []; } },
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
    enabled: !!user?.email, staleTime: 0,
  });

  const handleStartFlow = (flowKey) => {
    setActiveFlow(flowKey);
    // Scroll to top so the flow renders at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">

      {/* Header */}
      <div className="pb-4">
        <h1 className="text-2xl font-bold text-foreground">Practice</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Work on your leadership in the moment.</p>
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

      {/* Tab bar — hidden while flow is active */}
      {!activeFlow && (
        <>
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'studio' && (
                <ActionStudioTab onStartFlow={handleStartFlow} />
              )}
              {activeTab === 'gym' && (
                <DailyGymTab
                  goals={goals}
                  assignments={assignments}
                  devPlans={devPlans}
                  trends={trends}
                  insight={insight}
                  onOpenAtreus={openAtreus}
                />
              )}
              {activeTab === 'growth' && (
                <GrowthPlanTab
                  goals={goals}
                  assignments={assignments}
                  pulses={pulses}
                  trends={trends}
                  onOpenAtreus={openAtreus}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}