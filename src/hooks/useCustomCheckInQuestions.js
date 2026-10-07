/**
 * useCustomCheckInQuestions — fetches the active custom KPI questions
 * that apply to the current user for a given check-in type, and, for any
 * question flagged is_ai_generated, replaces its title with a fresh
 * AI-generated question text for today (cached per day).
 *
 * Used by the check-in forms (morning/evening) to render tenant-configured
 * questions alongside the standard Likert measures.
 *
 * @param {string} checkInType - "morning" | "evening" | "both"
 * @returns {{ questions: Array, loading: boolean }}
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getCachedGen(date, checkInType) {
  try {
    const raw = localStorage.getItem(`cl_aiq_${date}_${checkInType}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedGen(date, checkInType, obj) {
  try {
    localStorage.setItem(`cl_aiq_${date}_${checkInType}`, JSON.stringify(obj));
  } catch {
    /* ignore quota errors */
  }
}

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
        let applicable = (all || []).filter((q) => {
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

        // For AI-generated questions, fetch today's generated text (cached per day)
        const aiQuestions = applicable.filter(
          (q) => q.is_ai_generated && q.ai_topic
        );
        if (aiQuestions.length > 0) {
          const date = todayKey();
          const effectiveType = checkInType === "both" ? "morning" : checkInType;
          let generated = getCachedGen(date, effectiveType);
          if (!generated) {
            try {
              const res = await base44.functions.invoke("aiCheckInQuestion", {
                action: "generate",
                check_in_type: effectiveType,
                items: aiQuestions.map((q) => ({
                  question_key: q.question_key,
                  ai_topic: q.ai_topic,
                  response_type: q.response_type,
                  applies_to: q.applies_to,
                })),
              });
              generated = res.data?.generated || {};
              setCachedGen(date, effectiveType, generated);
            } catch (e) {
              console.warn(
                "AI custom question generation failed:",
                e.message
              );
              generated = {};
            }
          }
          applicable = applicable.map((q) =>
            q.is_ai_generated && generated[q.question_key]
              ? { ...q, title: generated[q.question_key] }
              : q
          );
        }

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