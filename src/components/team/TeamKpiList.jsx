import React from "react";
import { Gauge, Link2 } from "lucide-react";

function ownerLabel(ownerEmail, members) {
  if (!ownerEmail) return "Org-wide";
  const m = members.find(x => x.email === ownerEmail);
  return m?.full_name || ownerEmail;
}

export default function TeamKpiList({ kpis, members }) {
  if (!kpis || kpis.length === 0) {
    return (
      <div className="px-5 py-8 text-center">
        <Gauge className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No team KPIs yet.</p>
        <p className="text-xs text-gray-400 mt-1">KPIs with an owner on your team will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {kpis.map(k => {
        const pct = k.progress != null ? Math.round(k.progress) : (k.target_value ? Math.round((k.current_value || 0) / k.target_value * 100) : 0);
        const capped = Math.min(100, Math.max(0, pct));
        return (
          <div key={k.id} className="px-5 py-3.5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{k.title}</p>
                {k.linked_goal_ids?.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                    <Link2 className="w-3 h-3" /> {k.linked_goal_ids.length} goal{k.linked_goal_ids.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {ownerLabel(k.owner_email, members)} · {k.current_value ?? "—"}{k.unit ? ` ${k.unit}` : ""} / {k.target_value ?? "—"}{k.unit ? ` ${k.unit}` : ""}
              </p>
            </div>
            <div className="w-28 flex-shrink-0">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0202ff] rounded-full" style={{ width: `${capped}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">{capped}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}