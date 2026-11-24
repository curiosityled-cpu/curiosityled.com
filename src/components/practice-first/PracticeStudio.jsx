/**
 * PracticeStudio — the Practice chapter of the combined Practice First page.
 *
 * Two columns: the practice action column, and a left column holding the
 * Leadership Tools rail with recent sessions and assessments beneath it. A
 * started coaching flow takes the full width.
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
import CoachingFlowsCard from "@/components/practice/CoachingFlowsCard";
import WorkoutsSection from "@/components/practice/WorkoutsSection";
import PracticeSessionsLog from "@/components/practice/PracticeSessionsLog";
import AssessmentsCard from "@/components/practice/AssessmentsCard";
import PracticeFlow from "@/components/practice/PracticeFlow";

function ToolTile({ icon: Icon, label, to, accent }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-[14px] border border-[#d3dce2] bg-[#E9EEF2] p-3 transition-[background,box-shadow] duration-200 hover:bg-[#dfe8ee] hover:shadow-[0_4px_10px_rgba(23,40,50,0.1)] active:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B7890]"
    >
      <Icon className={cn("h-[22px] w-[22px]", accent ? "text-[#E1A45E]" : "text-[#3B7890]")} />
      <span className="text-xs font-bold leading-[1.25] text-[#172832]">{label}</span>
    </Link>
  );
}

export default function PracticeStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeFlow, setActiveFlow] = useState(null);
  const { goals, trends, insight, bpoPatterns, crossToolData, weekCount, recentSessionIds, statusText } =
    usePracticeStudio();

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
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* ── Central practice column ── */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
            <div
              className="relative overflow-hidden rounded-[20px] border border-[#3B7890] p-7 text-[#E9EEF2] shadow-[0_10px_26px_rgba(23,40,50,0.1)]"
              style={{ background: "linear-gradient(160deg,#172832,#1f3b4a)" }}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[#E1A45E]" />
              <h2 className="text-[22px] font-extrabold leading-[1.3] tracking-[-0.015em]">Practice sessions</h2>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-[#E9EEF2]/75">{statusText}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <a
                  href="#daily-gym"
                  className="rounded-xl border border-[#E9EEF2]/20 bg-[#E9EEF2]/10 px-3.5 py-2 text-xs font-semibold text-[#E9EEF2] transition-colors duration-200 hover:bg-[#E9EEF2]/20"
                >
                  Daily Gym
                </a>
                <a
                  href="#practice-sessions"
                  className="rounded-xl border border-[#E9EEF2]/20 bg-[#E9EEF2]/10 px-3.5 py-2 text-xs font-semibold text-[#E9EEF2] transition-colors duration-200 hover:bg-[#E9EEF2]/20"
                >
                  Practice sessions · {weekCount} this week
                </a>
              </div>
            </div>

            <PrescribedPracticeCard
              crossToolData={crossToolData}
              bpoPatterns={bpoPatterns}
              trends={trends}
              recentSessionIds={recentSessionIds}
              onSessionLogged={handleSessionLogged}
            />

            <div id="daily-gym" className="scroll-mt-24">
              <WorkoutsSection goals={goals} trends={trends} insight={insight} />
            </div>

            <CoachingFlowsCard onStartFlow={handleStartFlow} />
          </div>

          {/* ── Leadership Tools + practice context ── */}
          <div className="flex flex-col gap-3.5 lg:col-start-1 lg:row-start-1">
            <div className="pf-white rounded-[20px] border border-[#cfd8de] p-4 shadow-[0_10px_26px_rgba(23,40,50,0.1)]">
              <p className="px-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#3B7890]">
                Leadership Tools
              </p>
              <p className="px-1.5 pb-2 pt-1 text-[11px] leading-[1.4] text-[#5c707c]">
                Jump to a structured tool to capture, plan, or review.
              </p>
              <div className="flex flex-col gap-2.5">
                <ToolTile icon={Brain} label="Leadership Support Tool" to="/decision-journal" />
                <ToolTile icon={Users} label="1:1 prep & notes" to="/one-on-ones" />
                <ToolTile icon={Layers} label="Delegation planner" to="/delegation-planner" accent />
              </div>
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