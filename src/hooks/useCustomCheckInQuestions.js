/**
 * useCustomCheckInQuestions — fetches the active custom KPI questions
 * that apply to the current user for a given check-in type.
 *
 * Used by the check-in forms (morning/evening) to render tenant-configured
 * questions alongside the standard Likert measures.
 *
 * @param {string} checkInType - "morning" | "evening" | "both"
 * @returns {{ questions: Array, loading: boolean }}
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/components/useAuth";

export function useCustomCheckInQuestions(checkInType = "both") {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        const all = await base44.entities.CheckInCustomQuestion.filter(
          { is_active: true },
          "display_order",
          100
        );
        if (cancelled) return;
        const userRole =
          user?.app_role || user?.data?.app_role || user?.role || "";
        const applicable = (all || []).filter((q) => {
          if (q.target_role && q.target_role !== userRole) return false;
          if (
            checkInType !== "both" &&
            q.applies_to !== "both" &&
            q.applies_to !== checkInType
          ) {
            return false;
          }
          return true;
        });
        if (!cancelled) setQuestions(applicable);
      } catch (e) {
        console.warn("Could not load custom check-in questions:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    user?.email,
    user?.app_role,
    user?.data?.app_role,
    user?.role,
    checkInType,
  ]);

  return { questions, loading };
}

export default useCustomCheckInQuestions;