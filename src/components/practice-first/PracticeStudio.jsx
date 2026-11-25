/**
 * PracticeStudio — the Practice chapter of My Development.
 *
 * Daily Gym (today's recommended workout plus the rest), recent sessions and
 * assessments, with the Leadership Tools card alongside. A started coaching
 * flow takes the full width. The flow itself is owned by the page so the
 * Practice tiles above can start the same flows.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import usePracticeStudio from "@/hooks/usePracticeStudio";
import LeadershipToolsCard from "@/components/practice-first/LeadershipToolsCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import PracticeSessionsLog from "@/components/practice/PracticeSessionsLog";
import AssessmentsCard from "@/components/practice/AssessmentsCard";
import PracticeFlow from "@/components/practice/PracticeFlow";

export default function PracticeStudio({ activeFlow, onStartFlow, onCloseFlow }) {
  const { goals, trends, insight } = usePracticeStudio();

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
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-3">
          {/* ── Daily Gym ── */}
          <div className="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <div id="daily-gym" className="scroll-mt-24 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pf-muted)]">
                Daily Gym
              </p>
              <p className="mt-0.5 text-xs leading-[1.4] text-[var(--pf-muted)]">
                Short exercises personalised to your active patterns and goals.
              </p>
            </div>

            <WorkoutsSection goals={goals} trends={trends} insight={insight} />

            <div id="practice-sessions" className="mt-2 scroll-mt-24">
              <PracticeSessionsLog />
            </div>
          </div>

          {/* ── Leadership tools + assessments ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <LeadershipToolsCard />
            <AssessmentsCard />
          </div>
        </div>
      )}
    </div>
  );
}