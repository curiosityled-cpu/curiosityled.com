/**
 * PracticeStudio — the Practice chapter of My Development.
 *
 * Two columns: the practice action column (development progress, coaching flows,
 * Leadership Tools) and a context column (today's prescription, Daily Gym,
 * recent sessions, assessments). A started coaching flow takes the full width.
 * The flow itself is owned by the page so the Practice & tools tiles above can
 * start the same flows.
 */
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import usePracticeStudio from "@/hooks/usePracticeStudio";
import PrescribedPracticeCard from "@/components/practice/PrescribedPracticeCard";
import DevelopmentProgressCard from "@/components/practice/DevelopmentProgressCard";
import CoachingFlowsCard from "@/components/practice/CoachingFlowsCard";
import LeadershipToolsCard from "@/components/practice-first/LeadershipToolsCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import PracticeSessionsLog from "@/components/practice/PracticeSessionsLog";
import AssessmentsCard from "@/components/practice/AssessmentsCard";
import PracticeFlow from "@/components/practice/PracticeFlow";

export default function PracticeStudio({ activeFlow, onStartFlow, onCloseFlow }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { goals, trends, insight, bpoPatterns, crossToolData, recentSessionIds } = usePracticeStudio();

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
            <PracticeFlow flowKey={activeFlow} onClose={onCloseFlow} />
          </motion.div>
        )}
      </AnimatePresence>

      {!activeFlow && (
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
          {/* ── Practice actions ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <DevelopmentProgressCard />

            <CoachingFlowsCard onStartFlow={onStartFlow} />

            <LeadershipToolsCard />
          </div>

          {/* ── Development + practice context ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <PrescribedPracticeCard
              crossToolData={crossToolData}
              bpoPatterns={bpoPatterns}
              trends={trends}
              recentSessionIds={recentSessionIds}
              onSessionLogged={handleSessionLogged}
            />

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