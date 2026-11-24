/**
 * PracticeStudio — the Practice chapter of the combined Practice First page.
 *
 * Two columns: the practice action column (today's prescription, coaching flows,
 * Leadership Tools) and a context column (development progress, Daily Gym,
 * recent sessions, assessments). A started coaching flow takes the full width.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Users, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import usePracticeStudio from "@/hooks/usePracticeStudio";
import PrescribedPracticeCard from "@/components/practice/PrescribedPracticeCard";
import DevelopmentProgressCard from "@/components/practice/DevelopmentProgressCard";
import CoachingFlowsCard from "@/components/practice/CoachingFlowsCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import PracticeSessionsLog from "@/components/practice/PracticeSessionsLog";
import AssessmentsCard from "@/components/practice/AssessmentsCard";
import PracticeFlow from "@/components/practice/PracticeFlow";

function ToolTile({ icon: Icon, label, to, accent }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-[14px] border border-[var(--pf-soft-border)] bg-[var(--pf-soft)] p-3 transition-[background,box-shadow] duration-200 hover:bg-[var(--pf-soft-hover)] hover:shadow-[0_4px_10px_rgba(23,40,50,0.1)] active:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B7890]"
    >
      <Icon className={cn("h-[22px] w-[22px]", accent ? "text-[#E1A45E]" : "text-[var(--pf-accent)]")} />
      <span className="text-xs font-bold leading-[1.25] text-[var(--pf-text)]">{label}</span>
    </Link>
  );
}

export default function PracticeStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeFlow, setActiveFlow] = useState(null);
  const { goals, trends, insight, bpoPatterns, crossToolData, recentSessionIds } = usePracticeStudio();

  const handleStartFlow = (flowKey) => {
    setActiveFlow(flowKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

            <div className="rounded-[20px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[0_10px_26px_rgba(23,40,50,0.1)]">
              <p className="px-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--pf-accent)]">
                Leadership Tools
              </p>
              <p className="px-1.5 pb-2 pt-1 text-[11px] leading-[1.4] text-[var(--pf-muted)]">
                Jump to a structured tool to capture, plan, or review.
              </p>
              <div className="flex flex-col gap-2.5">
                <ToolTile icon={Brain} label="Leadership Support Tool" to="/decision-journal" />
                <ToolTile icon={Users} label="1:1 prep & notes" to="/one-on-ones" />
                <ToolTile icon={Layers} label="Delegation planner" to="/delegation-planner" accent />
              </div>
            </div>
          </div>

          {/* ── Development + practice context ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <DevelopmentProgressCard />

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