import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useSuccessionNextSteps — reads the active cycle's state and returns the
 * concrete steps that move it forward, most urgent first. Shared by the
 * "What to do next" panel and the current-step action under each stage, so
 * the two can never disagree about what is needed next.
 */
export default function useSuccessionNextSteps(activeCycle, role) {
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

  return { actions, loading };
}