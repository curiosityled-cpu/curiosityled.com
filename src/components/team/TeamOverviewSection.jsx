/**
 * TeamOverviewSection — the manager's quick team read on the Lead page.
 *
 * Pulse (how the team is doing), the reporting hierarchy as an interactive org
 * chart, and the talent scorecard — all from the same getTeamRollup payload the
 * Team page uses.
 */
import React from "react";
import TeamPulseHero from "@/components/team/TeamPulseHero";
import TeamRosterCard from "@/components/team/TeamRosterCard";
import TeamHierarchyView from "@/components/team/TeamHierarchyView";
import TeamTalentScorecard from "@/components/team/TeamTalentScorecard";

export default function TeamOverviewSection({ rollup }) {
  if (!rollup) return null;

  const hierarchy = rollup.hierarchy || [];
  const atRisk = rollup.at_risk || [];
  const isAggregatedOnly = rollup.detail_level === "aggregated";
  const scopeSize = rollup.scope_size || 0;

  return (
    <div className="space-y-4">
      {/* Team Pulse — synthesized situational read */}
      {rollup.team_pulse && <TeamPulseHero rollup={rollup} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <TeamRosterCard
          count={hierarchy.length || scopeSize}
          atRisk={isAggregatedOnly ? [] : atRisk}
        >
          <TeamHierarchyView nodes={hierarchy} />
        </TeamRosterCard>

        {/* Talent scorecard — team health and KPIs */}
        <TeamTalentScorecard
          aggregates={rollup.aggregates}
          kpis={rollup.aggregates?.kpis || []}
          teamSize={scopeSize}
        />
      </div>
    </div>
  );
}