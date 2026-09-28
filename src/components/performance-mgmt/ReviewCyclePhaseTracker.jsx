import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, Circle, Clock, SkipForward, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const BASE_PHASES = [
  { name: "Foundation", desc: "Goals & competencies configured" },
  { name: "Cycle Launch", desc: "Roster assigned & announced" },
  { name: "Self-Assessment", desc: "Employees self-reflect" },
  { name: "Manager Review", desc: "Managers assess performance" },
  { name: "Calibration", desc: "Rating alignment session" },
  { name: "Acknowledgment", desc: "Employees acknowledge reviews" },
  { name: "Development Plan", desc: "Growth plans created from reviews" },
  { name: "Results & Close", desc: "Communicated & cycle closed" },
  { name: "Post-Review Follow-Up", desc: "30/60/90 day check-ins" },
  { name: "Next Cycle Planning", desc: "Lessons learned & next setup" },
];

const SKIP_LEVEL_PHASE = { name: "Skip-Level Review", desc: "Skip-level manager approves" };

export default function ReviewCyclePhaseTracker({ cycle, user }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const settings = cycle.settings || {};
  const phases = settings.skip_level_review_enabled
    ? [...BASE_PHASES.slice(0, 4), SKIP_LEVEL_PHASE, ...BASE_PHASES.slice(4)]
    : BASE_PHASES;

  useEffect(() => {
    loadProgress();
  }, [cycle.id]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const [participants, submissions, calibrations] = await Promise.all([
        base44.entities.ReviewParticipant.filter({ review_cycle_id: cycle.id }),
        base44.entities.CustomFormSubmission.filter({ review_cycle_id: cycle.id }),
        base44.entities.ReviewCalibration.filter({ review_cycle_id: cycle.id }),
      ]);

      const total = participants.length;
      const selfDone = participants.filter(p =>
        ["self_submitted", "manager_submitted", "completed", "acknowledged"].includes(p.status)
      ).length;
      const mgrDone = participants.filter(p =>
        ["manager_submitted", "completed", "acknowledged"].includes(p.status)
      ).length;
      const acked = participants.filter(p => p.status === "acknowledged").length;
      const calDone = calibrations.some(c => c.status === "completed");
      const devPlans = submissions.filter(s => s.created_entity_type === "DevelopmentPlan").length;

      setProgress({ total, selfDone, mgrDone, acked, calDone, devPlans });
    } catch (e) {
      console.error("Phase tracker load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const computeCurrentPhase = () => {
    if (cycle.status === "draft") return 0;
    if (cycle.status === "closed") return phases.length - 1;
    if (!progress || progress.total === 0) return 1;

    const p = progress;
    const all = p.total > 0 && p.acked === p.total;

    if (all && p.devPlans > 0) return 7;
    if (all) return 6;
    if (p.calDone) return phases.findIndex(ph => ph.name === "Acknowledgment");
    if (p.mgrDone === p.total && p.total > 0) {
      const calIdx = phases.findIndex(ph => ph.name === "Calibration");
      return calIdx === -1 ? 5 : calIdx;
    }
    if (p.selfDone === p.total && p.total > 0) {
      return phases.findIndex(ph => ph.name === "Manager Review");
    }
    if (p.selfDone > 0) return phases.findIndex(ph => ph.name === "Self-Assessment");
    return 2;
  };

  const computePhaseProgress = (idx) => {
    if (!progress || progress.total === 0) return 0;
    const p = progress;
    const phase = phases[idx];

    if (phase.name === "Self-Assessment") return Math.round((p.selfDone / p.total) * 100);
    if (phase.name === "Manager Review") return Math.round((p.mgrDone / p.total) * 100);
    if (phase.name === "Skip-Level Review") return p.mgrDone === p.total ? 100 : Math.round((p.mgrDone / p.total) * 50);
    if (phase.name === "Calibration") return p.calDone ? 100 : (p.mgrDone === p.total ? 50 : 0);
    if (phase.name === "Acknowledgment") return Math.round((p.acked / p.total) * 100);
    if (phase.name === "Development Plan") return p.acked > 0 ? Math.round((p.devPlans / p.acked) * 100) : 0;
    return 0;
  };

  const currentPhase = computeCurrentPhase();

  const getPhaseStatus = (idx) => {
    if (idx < currentPhase) return "completed";
    if (idx === currentPhase) return "current";
    return "upcoming";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          11-Phase Cycle Progress
        </h4>
        <span className="text-xs text-gray-400">
          Phase {currentPhase} of {phases.length - 1}
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <Progress
          value={Math.round((currentPhase / (phases.length - 1)) * 100)}
          className="h-1.5"
        />
      </div>

      {/* Phase list */}
      <div className="space-y-1">
        {phases.map((phase, idx) => {
          const status = getPhaseStatus(idx);
          const phasePct = computePhaseProgress(idx);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`flex items-start gap-3 rounded-lg p-2 ${
                status === "current" ? "bg-blue-50/60" : ""
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0 mt-0.5">
                {status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : status === "current" ? (
                  <div className="relative">
                    <Clock className="w-4 h-4 text-[#0202ff]" />
                    <span className="absolute inset-0 rounded-full animate-ping bg-[#0202ff]/20" />
                  </div>
                ) : (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}
              </div>

              {/* Phase content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono w-4 ${
                      status === "completed" ? "text-green-600" :
                      status === "current" ? "text-[#0202ff]" : "text-gray-400"
                    }`}>
                      {idx}
                    </span>
                    <span className={`text-xs font-medium ${
                      status === "upcoming" ? "text-gray-400" : "text-gray-700"
                    }`}>
                      {phase.name}
                    </span>
                    {phase.name === "Skip-Level Review" && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                        OPTIONAL
                      </span>
                    )}
                  </div>
                  {status === "current" && phasePct > 0 && phasePct < 100 && (
                    <span className="text-[10px] font-medium text-[#0202ff]">
                      {phasePct}%
                    </span>
                  )}
                </div>
                <p className={`text-[10px] mt-0.5 ${
                  status === "upcoming" ? "text-gray-300" : "text-gray-400"
                }`}>
                  {phase.desc}
                </p>
                {status === "current" && phasePct > 0 && phasePct < 100 && (
                  <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0202ff] rounded-full transition-all"
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary footer */}
      {progress && progress.total > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3 text-[10px] text-gray-500">
          <span><strong className="text-gray-700">{progress.total}</strong> participants</span>
          <span>·</span>
          <span><strong className="text-gray-700">{progress.selfDone}</strong> self-assessed</span>
          <span>·</span>
          <span><strong className="text-gray-700">{progress.mgrDone}</strong> manager reviews</span>
          <span>·</span>
          <span><strong className="text-gray-700">{progress.acked}</strong> acknowledged</span>
          {progress.calDone && (
            <>
              <span>·</span>
              <span className="text-green-600 font-medium">Calibration done</span>
            </>
          )}
          {progress.devPlans > 0 && (
            <>
              <span>·</span>
              <span className="text-green-600 font-medium">{progress.devPlans} dev plans</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}