/**
 * TeamRollupList — context for a leader whose direct reports each lead people
 * of their own: one row per direct, rolled up across their whole subtree.
 * Individuals appear only at directs depth (PeopleList); above that, teams.
 */
import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import LeadCard from "@/components/lead/ui/LeadCard";

function Metric({ label, value }) {
  return (
    <span className="text-[11px] text-[var(--ld-muted)]">
      {label}{" "}
      <span className="font-semibold text-[var(--ld-text)] tabular-nums">{value}%</span>
    </span>
  );
}

export default function TeamRollupList({ teams = [] }) {
  if (teams.length === 0) return null;

  return (
    <LeadCard padded={false} className="overflow-hidden">
      {teams.map((team) => {
        const size = team.subtree_size ?? 0;
        const atRisk = team.at_risk_count ?? 0;
        return (
          <div key={team.email} className="px-4 py-3 border-b border-[var(--ld-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--ld-panel)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[var(--ld-muted)]">
                  {(team.full_name || "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--ld-text)] truncate">{team.full_name}</p>
                <p className="text-[11px] text-[var(--ld-muted)] truncate">
                  {[team.current_role, `${size} ${size === 1 ? "person" : "people"}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {atRisk > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" /> {atRisk}
                </span>
              )}
            </div>
            <div className="mt-2 pl-11 flex items-center gap-4">
              <Metric label="Goals" value={team.goals?.completion_pct ?? 0} />
              <Metric label="Check-ins" value={team.checkins?.participation_pct ?? 0} />
            </div>
          </div>
        );
      })}
      <div className="px-4 py-2.5">
        <Link
          to="/reviews"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0202ff]"
        >
          Open the review cycle <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </LeadCard>
  );
}