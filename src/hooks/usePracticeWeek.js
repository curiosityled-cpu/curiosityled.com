import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Same definition of a practice session the Practice studio uses, so the hub
// and the studio never disagree about how much practice has happened.
const isPracticeSession = (pulse) => {
  const focus = (pulse.focus_intention || "").toLowerCase();
  return (
    focus.startsWith("workout completed") ||
    focus.startsWith("practice session") ||
    focus.startsWith("flow completed") ||
    pulse.prompt_type === "practice_session"
  );
};

function startOfWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  now.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Practice activity for the Develop hub: this week and all time. */
export default function usePracticeWeek() {
  const { user } = useAuth();
  const email = user?.email || user?.data?.email;
  const [state, setState] = useState({ weekCount: 0, total: 0, loading: true });

  useEffect(() => {
    if (!email) {
      setState({ weekCount: 0, total: 0, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await base44.entities.ManagerPulse.filter(
          { user_email: email },
          "-created_date",
          100
        );
        const sessions = (Array.isArray(rows) ? rows : rows?.items || []).filter(isPracticeSession);
        const weekStart = startOfWeek();
        if (!cancelled) {
          setState({
            weekCount: sessions.filter((s) => new Date(s.created_date) >= weekStart).length,
            total: sessions.length,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setState({ weekCount: 0, total: 0, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  return state;
}