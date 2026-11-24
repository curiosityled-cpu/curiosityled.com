import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { runBpoPatternEngine } from "@/components/patterns/bpoPatternEngine";

/** A ManagerPulse record that represents a completed practice session. */
export function isPracticeSession(p) {
  const focus = (p.focus_intention || "").toLowerCase();
  return (
    focus.startsWith("workout completed") ||
    focus.startsWith("practice session") ||
    focus.startsWith("flow completed") ||
    p.prompt_type === "practice_session"
  );
}

function startOfWeekET() {
  // Monday as start of week, in America/New_York
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = now.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * The data behind the Practice studio: goals, pulses, trends, check-ins and the
 * pattern engine, plus the derived session streak used by the shared banner.
 */
export default function usePracticeStudio() {
  const { user } = useAuth();

  const { data: goals = [] } = useQuery({
    queryKey: ["mp-goals", user?.email],
    queryFn: async () => {
      try {
        const r = await base44.entities.Goal.filter({ user_email: user.email }, "-created_date", 20);
        if (r.length) return r;
        return await base44.entities.Goal.filter({ created_by: user.email }, "-created_date", 20);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: pulses = [] } = useQuery({
    queryKey: ["mp-pulses", user?.email],
    queryFn: async () => {
      try { return await base44.entities.ManagerPulse.filter({ user_email: user.email }, "-created_date", 30); }
      catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: trends = null } = useQuery({
    queryKey: ["mp-trends", user?.email],
    queryFn: async () => {
      try { const r = await base44.entities.ManagerTrends.filter({ user_email: user.email }, "-last_trend_computed_at", 1); return r[0] || null; }
      catch { return null; }
    },
    enabled: !!user?.email, staleTime: 30 * 60 * 1000,
  });

  const { data: insight = null } = useQuery({
    queryKey: ["mp-insight", user?.email],
    queryFn: async () => {
      try { const rows = await base44.entities.AssessmentInsights.filter({ user_email: user.email }, "-created_date", 1); return rows[0] || null; }
      catch { return null; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["mp-checkins", user?.email],
    queryFn: async () => {
      try { return await base44.entities.DailyCheckIn.filter({ user_email: user.email }, "-check_in_date", 30); }
      catch { return []; }
    },
    enabled: !!user?.email, staleTime: 5 * 60 * 1000,
  });

  // ── Pattern engine (active BPO patterns) ──
  const bpoPatterns = useMemo(
    () => runBpoPatternEngine({ trends, checkIns, goals, activities: [], pulses }),
    [trends, checkIns, goals, pulses]
  );

  // ── Cross-tool patterns (connected stack) ──
  const { data: crossToolData = null } = useQuery({
    queryKey: ["mp-cross-tool-patterns", user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getCrossToolPatterns", {
          inAppPatterns: bpoPatterns,
        });
        return res.data?.data || null;
      } catch { return null; }
    },
    enabled: !!user?.email && bpoPatterns.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // ── Practice sessions (for the weekly streak) ──
  const { data: sessions = [] } = useQuery({
    queryKey: ["mp-sessions", user?.email],
    queryFn: async () => {
      try {
        const all = await base44.entities.ManagerPulse.filter(
          { user_email: user.email }, "-created_date", 100
        );
        return all.filter(isPracticeSession);
      } catch { return []; }
    },
    enabled: !!user?.email, staleTime: 60 * 1000,
  });

  const weekStart = useMemo(() => startOfWeekET(), []);
  const weekCount = useMemo(
    () => sessions.filter((s) => new Date(s.created_date) >= weekStart).length,
    [sessions, weekStart]
  );

  // recentSessionIds: derive workout ids from recent session focus_intention text
  const recentSessionIds = useMemo(() => {
    const ids = new Set();
    const knownTitles = [
      "delegation audit", "hard conversation prep", "energy drain map",
      "commitment review", "leadership identity anchor", "decision capture",
      "team pulse check", "pattern interrupt",
    ];
    sessions.slice(0, 10).forEach((s) => {
      const focus = (s.focus_intention || "").toLowerCase();
      const colonIdx = focus.indexOf(":");
      const title = colonIdx >= 0 ? focus.slice(colonIdx + 1).trim() : "";
      knownTitles.forEach((kt) => {
        if (title.includes(kt)) ids.add(kt.replace(/\s+/g, "_"));
      });
    });
    return [...ids];
  }, [sessions]);

  const statusText = useMemo(() => {
    if (weekCount === 0) return "No sessions yet this week — pick a workout and start a streak.";
    if (weekCount >= 5) return `${weekCount} sessions this week — strong consistency. Keep it going.`;
    return `${weekCount} session${weekCount === 1 ? "" : "s"} this week — keep the rhythm.`;
  }, [weekCount]);

  return { goals, trends, insight, bpoPatterns, crossToolData, sessions, weekCount, recentSessionIds, statusText };
}