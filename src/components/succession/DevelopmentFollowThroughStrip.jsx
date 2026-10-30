import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertTriangle, TrendingUp } from "lucide-react";

function Stat({ label, value, tone = "default" }) {
  const toneClass =
    tone === "bad" ? "text-red-600" : tone === "good" ? "text-green-700" : "text-gray-900";
  return (
    <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white">
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

/**
 * DevelopmentFollowThroughStrip — is the development work that was committed to
 * actually closing? Reads the shared follow-through computation on the server so
 * it matches the cycle report exactly.
 *
 * It reports the plan's execution, never the person: an overdue action is work
 * that needs attention.
 */
export default function DevelopmentFollowThroughStrip({ cycleId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await base44.functions.invoke("successionGetDevelopmentFollowThrough", {
          operation_id: `follow-through-${Date.now()}`,
          cycle_id: cycleId || null,
        });
        if (!cancelled) setData(res?.data || null);
      } catch {
        if (!cancelled) setError("Follow-through could not be loaded.");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cycleId]);

  if (error) {
    return <p className="text-sm text-gray-500">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading follow-through…
      </div>
    );
  }

  const { totals, closure, overdue_actions } = data;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Open actions" value={closure.open_of_committed} />
        <Stat label="Overdue" value={totals.overdue} tone={totals.overdue > 0 ? "bad" : "default"} />
        <Stat label="Due in 14 days" value={totals.due_soon} />
        <Stat
          label="Closed on time"
          value={closure.on_time_rate === null ? "—" : `${closure.on_time_rate}%`}
          tone={closure.on_time_rate === null ? "default" : closure.on_time_rate >= 70 ? "good" : "bad"}
        />
      </div>

      {totals.actions === 0 && (
        <p className="text-sm text-gray-500">
          No development actions have been committed yet, so there is nothing to follow through on.
        </p>
      )}

      {overdue_actions.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-medium text-red-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue development work
          </p>
          <ul className="mt-1.5 space-y-1">
            {overdue_actions.slice(0, 5).map((a) => (
              <li key={a.action_id} className="text-xs text-red-900 flex items-center justify-between gap-3">
                <span className="truncate">{a.title}</span>
                <span className="flex-shrink-0">{a.days_overdue}d late</span>
              </li>
            ))}
          </ul>
          {overdue_actions.length > 5 && (
            <p className="text-xs text-red-700 mt-1">and {overdue_actions.length - 5} more</p>
          )}
        </div>
      )}

      {closure.completed > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          {closure.on_time} of {closure.completed} completed actions closed on or before their due date
          {closure.late > 0 ? `, ${closure.late} after it` : ""}.
        </p>
      )}
    </div>
  );
}