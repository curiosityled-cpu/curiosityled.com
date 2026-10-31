import React, { useState, useEffect, useCallback } from "react";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { STAGE_MAP } from "./stageConfig";

/**
 * WhatToDoNext — a pinned panel that reads the active cycle's state and
 * shows the next 1-3 concrete actions with deep-links into the relevant
 * stage/view. Computed client-side from existing list functions.
 */
export default function WhatToDoNext({ activeCycle, role, onNavigate }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      // No cycle yet
      if (!activeCycle) {
        setActions([
          {
            label: "Create a succession cycle to begin",
            stageKey: "frame",
            viewKey: "cycles",
          },
        ]);
        setLoading(false);
        return;
      }

      const stage = activeCycle.process_stage || "frame";

      // Role-specific actions for non-admins
      if (role === "successor") {
        setActions([
          { label: "Submit your self-disclosure", stageKey: "evidence", viewKey: "candidates" },
          { label: "Complete your development actions", stageKey: "accelerate", viewKey: "development-actions" },
          { label: "Review your transition plan", stageKey: "transition", viewKey: "transitions" },
        ]);
        setLoading(false);
        return;
      }
      if (role === "calibrator") {
        setActions([
          { label: "Complete your assigned calibration cases", stageKey: "deliberate", viewKey: "calibration" },
        ]);
        setLoading(false);
        return;
      }
      if (role === "manager") {
        setActions([
          { label: "Submit evidence for your direct report", stageKey: "evidence", viewKey: "evidence-queue" },
          { label: "Update development actions", stageKey: "accelerate", viewKey: "development-actions" },
        ]);
        setLoading(false);
        return;
      }

      // Admin: fetch counts to compute concrete actions
      const safe = async (fn, resKey) => {
        try {
          const { data } = await base44.functions.invoke(fn, {});
          return data?.[resKey]?.length ?? 0;
        } catch {
          return 0;
        }
      };

      const [rolesCount, criticalCount, blueprintCount, candidateCount] =
        await Promise.all([
          safe("successionListOrgRoles", "org_roles"),
          safe("successionListCriticalRoles", "critical_roles"),
          safe("successionListBlueprints", "blueprints"),
          safe("successionListCandidacies", "candidacies"),
        ]);

      const newActions = [];

      switch (stage) {
        case "frame":
          newActions.push({
            label: "Review cycle scope and advance to Focus",
            stageKey: "frame",
            viewKey: "cycles",
          });
          break;
        case "focus":
          if (rolesCount === 0)
            newActions.push({ label: "Define organizational roles", stageKey: "focus", viewKey: "roles" });
          if (criticalCount === 0)
            newActions.push({ label: "Designate critical roles", stageKey: "focus", viewKey: "critical-roles" });
          if (rolesCount > 0 && criticalCount > 0)
            newActions.push({ label: "Review critical roles and advance to Blueprint", stageKey: "focus", viewKey: "critical-roles" });
          break;
        case "blueprint":
          if (blueprintCount === 0)
            newActions.push({ label: "Draft role success blueprints", stageKey: "blueprint", viewKey: "blueprints" });
          else
            newActions.push({ label: "Publish effective snapshots", stageKey: "blueprint", viewKey: "snapshots" });
          break;
        case "discover":
          if (candidateCount === 0)
            newActions.push({ label: "Add candidates to talent pools", stageKey: "discover", viewKey: "candidates" });
          else
            newActions.push({ label: "Review candidates and advance to Evidence", stageKey: "discover", viewKey: "candidates" });
          break;
        case "evidence":
          newActions.push({ label: "Review evidence submissions", stageKey: "evidence", viewKey: "evidence-queue" });
          newActions.push({ label: "Add evidence for candidates", stageKey: "evidence", viewKey: "candidates" });
          break;
        case "deliberate":
          newActions.push({ label: "Review readiness proposals", stageKey: "deliberate", viewKey: "readiness-proposals" });
          newActions.push({ label: "Complete calibration sessions", stageKey: "deliberate", viewKey: "calibration" });
          newActions.push({ label: "Ratify readiness conclusions", stageKey: "deliberate", viewKey: "ratification" });
          break;
        case "accelerate":
          newActions.push({ label: "Create development plans", stageKey: "accelerate", viewKey: "development-plans" });
          newActions.push({ label: "Track development actions", stageKey: "accelerate", viewKey: "development-actions" });
          break;
        case "transition":
          newActions.push({ label: "Review transition initiations", stageKey: "transition", viewKey: "transitions" });
          break;
        case "monitor":
          newActions.push({ label: "Review operational alerts", stageKey: "monitor", viewKey: "operational-monitor" });
          newActions.push({ label: "Schedule follow-up reviews", stageKey: "monitor", viewKey: "review-queue" });
          break;
        default:
          newActions.push({ label: "Start with the Frame stage", stageKey: "frame", viewKey: "cycles" });
      }

      setActions(newActions.slice(0, 3));
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [activeCycle?.id, activeCycle?.process_stage, role]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white px-4 py-3 flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Finding your next steps…
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="border border-[#0202ff]/15 rounded-lg bg-[#0202ff]/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#0202ff]/10 bg-[#0202ff]/[0.02]">
        <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          What to do next
        </h3>
      </div>
      <div className="p-3 space-y-1.5">
        {actions.map((action, i) => {
          const stage = STAGE_MAP[action.stageKey];
          return (
            <button
              key={i}
              onClick={() => onNavigate(action.stageKey, action.viewKey)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white transition-colors text-left group"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0202ff]/10 flex items-center justify-center text-[11px] font-semibold text-[#0202ff]">
                {i + 1}
              </div>
              <span className="text-sm text-gray-700 flex-1">{action.label}</span>
              {stage && (
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  {stage.label}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0202ff] flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}