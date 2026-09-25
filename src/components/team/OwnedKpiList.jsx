import React from "react";
import { Gauge } from "lucide-react";

/**
 * OwnedKpiList — compact list of KPIs owned by a person.
 * Used inside subtree cards and member rows to surface KPI
 * ownership within the team hierarchy view.
 */
export default function OwnedKpiList({ kpis }) {
  if (!kpis || kpis.length === 0) {
    return <p className="text-xs text-muted-foreground">No KPIs owned.</p>;
  }
  return (
    <div className="space-y-2">
      {kpis.map((k) => {
        const pct = k.progress != null
          ? Math.round(k.progress)
          : k.target_value
            ? Math.round((k.current_value || 0) / k.target_value * 100)
            : 0;
        const capped = Math.min(100, Math.max(0, pct));
        return (
          <div key={k.id} className="flex items-center gap-2.5">
            <Gauge className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-card-foreground truncate">{k.title}</p>
                <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                  {k.current_value ?? "—"}{k.unit ? ` ${k.unit}` : ""}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                <div className="h-full bg-[#0202ff] rounded-full" style={{ width: `${capped}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}