/**
 * TeamOverviewSection — the manager's quick team read on the Lead page.
 *
 * Pulse (how the team is doing), then the roster — as a flat list or as an
 * indented org chart of the reporting tree — and the talent scorecard, all from
 * the same getTeamRollup payload the Team page uses.
 */
import React, { useState } from "react";
import { List, Network } from "lucide-react";
import TeamPulseHero from "@/components/team/TeamPulseHero";
import TeamRosterCard from "@/components/team/TeamRosterCard";
import TeamPeopleList from "@/components/team/TeamPeopleList";
import TeamHierarchyView from "@/components/team/TeamHierarchyView";
import TeamTalentScorecard from "@/components/team/TeamTalentScorecard";

function ViewToggle({ view, onChange }) {
  const options = [
    { id: "list", label: "List", Icon: List },
    { id: "chart", label: "Hierarchy", Icon: Network },
  ];
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-full p-0.5">
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
            view === id
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function TeamOverviewSection({ rollup }) {
  const [view, setView] = useState("list");
  if (!rollup) return null;

  const members = rollup.members || [];
  const hierarchy = rollup.hierarchy || [];
  const atRisk = rollup.at_risk || [];
  const detailLevel = rollup.detail_level || "full";
  const scopeSize = rollup.scope_size || 0;
  const isAggregatedOnly = detailLevel === "aggregated";
  const canChart = hierarchy.length > 0;
  const showingChart = canChart && view === "chart";
  const peopleCount = hierarchy.length || members.length;

  const listContent = (
    <TeamPeopleList
      hierarchy={hierarchy}
      members={isAggregatedOnly ? [] : members}
      atRisk={isAggregatedOnly ? [] : atRisk}
    />
  );

  return (
    <div className="space-y-4">
      {/* Team Pulse — synthesized situational read */}
      {rollup.team_pulse && <TeamPulseHero rollup={rollup} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <TeamRosterCard
          count={peopleCount}
          atRisk={isAggregatedOnly ? [] : atRisk}
        >
          <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2.5 border-b border-border/70">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {showingChart ? "Reporting structure" : "Roster"}
            </p>
            {canChart && <ViewToggle view={view} onChange={setView} />}
          </div>
          {showingChart ? <TeamHierarchyView nodes={hierarchy} /> : listContent}
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