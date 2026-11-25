/**
 * PracticeStudio — the Practice chapter of the combined Practice First page.
 *
 * Two columns: the practice action column (today's prescription, coaching flows,
 * Leadership Tools) and a context column (development progress, Daily Gym,
 * recent sessions, assessments). A started coaching flow takes the full width.
 */
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import usePracticeStudio from "@/hooks/usePracticeStudio";
import PrescribedPracticeCard from "@/components/practice/PrescribedPracticeCard";
import CoachingFlowsCard from "@/components/practice/CoachingFlowsCard";
import LeadershipToolsCard from "@/components/practice-first/LeadershipToolsCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import PracticeSessionsLog from "@/components/practice/PracticeSessionsLog";
import AssessmentsCard from "@/components/practice/AssessmentsCard";
import PracticeFlow from "@/components/practice/PracticeFlow";

export default function PracticeStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeFlow, setActiveFlow] = useState(null);
  const { goals, trends, insight, bpoPatterns, crossToolData, recentSessionIds } = usePracticeStudio();

  const handleStartFlow = (flowKey) => {
    setActiveFlow(flowKey);
    // The practice chapter sits below the development lists — bring it back into view.
    requestAnimationFrame(() => {
      document
        .getElementById("practice-tools")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSessionLogged = () => {
    queryClient.invalidateQueries({ queryKey: ["mp-sessions", user?.email] });
    queryClient.invalidateQueries({ queryKey: ["practice-sessions", user?.email] });
  };

  return (
    <div>
      {/* Active flow — full width, dismissible */}
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

      {!activeFlow && (
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
          {/* ── Practice actions ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <PrescribedPracticeCard
              crossToolData={crossToolData}
              bpoPatterns={bpoPatterns}
              trends={trends}
              recentSessionIds={recentSessionIds}
              onSessionLogged={handleSessionLogged}
            />

            <CoachingFlowsCard onStartFlow={handleStartFlow} />

            <LeadershipToolsCard />
          </div>

          {/* ── Practice context ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <div id="daily-gym" className="flex scroll-mt-24 flex-col gap-2">
              <div className="px-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pf-muted)]">
                  Daily Gym
                </p>
                <p className="mt-0.5 text-xs leading-[1.4] text-[var(--pf-muted)]">
                  Short exercises personalised to your active patterns and goals.
                </p>
              </div>
              <WorkoutsSection goals={goals} trends={trends} insight={insight} />
            </div>

            <div id="practice-sessions" className="scroll-mt-24">
              <PracticeSessionsLog />
            </div>

            <AssessmentsCard />
          </div>
        </div>
      )}
    </div>
  );
}