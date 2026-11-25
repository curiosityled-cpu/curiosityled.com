/**
 * TeamOverviewSection — the manager's quick team read on the Lead page.
 *
 * Pulse (how the team is doing), the roster or subtree drill-down, and the
 * talent scorecard, all from the same getTeamRollup payload the Team page uses.
 */
import React from "react";
import TeamPulseHero from "@/components/team/TeamPulseHero";
import TeamRosterCard from "@/components/team/TeamRosterCard";
import SubtreeCardGrid from "@/components/team/SubtreeCardGrid";
import TeamMemberRow from "@/components/team/TeamMemberRow";
import TeamTalentScorecard from "@/components/team/TeamTalentScorecard";

export default function TeamOverviewSection({ rollup }) {
  if (!rollup) return null;

  const members = rollup.members || [];
  const subtreeCards = rollup.subtree_cards || [];
  const atRisk = rollup.at_risk || [];
  const atRiskEmails = new Set(atRisk.map((r) => r.email));
  const detailLevel = rollup.detail_level || "full";
  const leaderLevel = rollup.leader_level || 1;
  const scopeSize = rollup.scope_size || 0;
  const isAggregatedOnly = detailLevel === "aggregated";
  const isSubtreeLevel = subtreeCards.length > 0 && leaderLevel >= 3;

  return (
    <div className="space-y-4">
      {/* Team Pulse — synthesized situational read */}
      {rollup.team_pulse && <TeamPulseHero rollup={rollup} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Roster or subtree drill-down */}
        {isSubtreeLevel ? (
          <TeamRosterCard count={subtreeCards.length} atRisk={!isAggregatedOnly ? atRisk : []}>
            <SubtreeCardGrid subtreeCards={subtreeCards} level={leaderLevel} atRisk={atRisk} />
          </TeamRosterCard>
        ) : !isAggregatedOnly && members.length > 0 ? (
          <TeamRosterCard count={members.length} atRisk={atRisk}>
            <div className="divide-y divide-border">
              {members.map((m) => (
                <TeamMemberRow
                  key={m.id || m.email}
                  member={m}
                  isAtRisk={atRiskEmails.has(m.email)}
                />
              ))}
            </div>
          </TeamRosterCard>
        ) : (
          <div />
        )}

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