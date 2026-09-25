/**
 * ManagerTeam — depth-aware Team Landscape view.
 * Route: /team
 *
 * Layout mirrors the Lead/Practice page rhythm:
 *   - Team hero header with pulse signal
 *   - Two-column grid: main content (left) | context sidebar (right)
 *   - ZoneCard collapsible sections with icons + accent colors
 *   - Action tiles for team-related tools
 *
 * Depth-aware by leader_level (from getTeamRollup):
 *   - Level 1:    empty state (no direct reports)
 *   - Level 2:    IC roster + at-risk
 *   - Level 3-5:  subtree card grid with inline drill-down
 *   - Enterprise/Portfolio: keep existing full/aggregated layout
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Users, AlertTriangle, Loader2, Info,
  TrendingUp, Activity, ChevronRight, Brain, ClipboardList, Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import TeamMemberRow from "@/components/team/TeamMemberRow";
import TeamPulseHero from "@/components/team/TeamPulseHero";
import SubtreeCardGrid from "@/components/team/SubtreeCardGrid";
import TeamHeroHeader from "@/components/team/TeamHeroHeader";
import ZoneCard from "@/components/density/ZoneCard";
import TeamTalentScorecard from "@/components/team/TeamTalentScorecard";
import TeamRosterCard from "@/components/team/TeamRosterCard";

function ActionTile({ icon: Icon, iconBg, iconColor, title, description, to }) {
  const content = (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors active:bg-muted/60 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
  if (to) return <Link to={to} className="block">{content}</Link>;
  return content;
}

export default function ManagerTeam() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["teamRollup", user?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke("getTeamRollup", {});
      return res.data;
    },
    enabled: !!user?.email,
    staleTime: 60_000,
  });

  const rollup = data;
  const aggregates = rollup?.aggregates;
  const members = rollup?.members || [];
  const subtreeCards = rollup?.subtree_cards || [];
  const kpis = aggregates?.kpis || [];
  const atRisk = rollup?.at_risk || [];
  const atRiskEmails = new Set(atRisk.map((r) => r.email));

  const scopeLabel = rollup?.scope_label || "Team";
  const scopeSize = rollup?.scope_size || 0;
  const detailSize = rollup?.detail_size || 0;
  const detailLevel = rollup?.detail_level || "full";
  const scopeType = rollup?.scope_type || "vertical";
  const leaderLevel = rollup?.leader_level || 1;
  const isAggregatedOnly = detailLevel === "aggregated";
  const isDirectsOnly = detailLevel === "directs";

  const isDepthAware = scopeType === "vertical";
  const isICLevel = isDepthAware && leaderLevel <= 1;
  const isSubtreeLevel = isDepthAware && leaderLevel >= 3;

  const subtitle = isDirectsOnly
    ? `${scopeSize} in your reporting tree · ${detailSize} direct ${detailSize === 1 ? "report" : "reports"}`
    : `${scopeSize} ${scopeSize === 1 ? "person" : "people"} in scope`;

  const emptyMessage =
    scopeType === "portfolio" ? "No managers in your portfolio yet."
    : scopeType === "enterprise" ? "No users in your organization yet."
    : "No reports in your tree yet.";

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#0202ff] animate-spin" />
        </div>
      ) : !rollup || scopeSize === 0 ? (
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
          <div className="px-5 py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-800">{emptyMessage}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Once people are assigned, you'll see goal progress, assessments, journeys, and check-ins roll up here.
            </p>
          </div>
        </Card>
      ) : isICLevel ? (
        <>
          <TeamHeroHeader
            scopeLabel={scopeLabel}
            subtitle="Your team landscape"
            pulse={null}
            isFetching={isFetching}
            onRefresh={() => refetch()}
          />
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
            <div className="px-5 py-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-800">You don't have direct reports yet.</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Once your team is assigned, you'll see goal progress, assessments, and check-ins roll up here.
              </p>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* ── Hero header ── */}
          <TeamHeroHeader
            scopeLabel={scopeLabel}
            subtitle={subtitle}
            pulse={rollup?.team_pulse}
            isFetching={isFetching}
            onRefresh={() => refetch()}
          />

          {/* Scope note for directs-only */}
          {isDirectsOnly && detailSize < scopeSize && (
            <div className="flex items-start gap-2 px-4 py-2.5 mb-4 bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl">
              <Info className="w-3.5 h-3.5 text-[#0202ff] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600">
                Aggregates span your full reporting tree of {scopeSize} people. Individual results show your {detailSize} direct {detailSize === 1 ? "report" : "reports"}.
              </p>
            </div>
          )}

          {/* ── Two-column grid: Main (left) | Context sidebar (right) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left — Main content */}
            <div className="space-y-4">
              {/* Team Pulse — synthesized situational read */}
              {rollup?.team_pulse && <TeamPulseHero rollup={rollup} />}

              {/* Combined Team card: roster/subtree + at-risk signals */}
              {isSubtreeLevel && subtreeCards.length > 0 ? (
                <TeamRosterCard count={subtreeCards.length} atRisk={!isAggregatedOnly ? atRisk : []}>
                  <SubtreeCardGrid subtreeCards={subtreeCards} level={leaderLevel} atRisk={atRisk} />
                </TeamRosterCard>
              ) : !isAggregatedOnly && members.length > 0 ? (
                <TeamRosterCard count={members.length} atRisk={atRisk}>
                  <div className="divide-y divide-border">
                    {members.map((m) => (
                      <TeamMemberRow key={m.id || m.email} member={m} isAtRisk={atRiskEmails.has(m.email)} />
                    ))}
                  </div>
                </TeamRosterCard>
              ) : null}
            </div>

            {/* Right — Context sidebar */}
            <div className="space-y-4 md:sticky md:top-20 md:self-start">
              {/* Combined Team Talent Scorecard (Team Health + KPIs) */}
              <TeamTalentScorecard aggregates={aggregates} kpis={kpis} teamSize={scopeSize} />

              {/* Team Tools */}
              <div className="space-y-3">
                <div className="px-1 pt-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Team Tools
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Jump to a structured tool to prepare, plan, or review with your team.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="divide-y divide-border">
                    <ActionTile
                      icon={Users}
                      iconBg="bg-sky-50 dark:bg-sky-950/40"
                      iconColor="text-sky-600"
                      title="1:1 prep & notes"
                      description="Prepare questions, review commitments, track notes."
                      to="/one-on-ones"
                    />
                    <ActionTile
                      icon={Layers}
                      iconBg="bg-orange-50 dark:bg-orange-950/40"
                      iconColor="text-orange-600"
                      title="Delegation planner"
                      description="Identify what to hand off and set your team up to win."
                      to="/delegation-planner"
                    />
                    <ActionTile
                      icon={Brain}
                      iconBg="bg-rose-50 dark:bg-rose-950/40"
                      iconColor="text-rose-600"
                      title="Leadership Support Tool"
                      description="Think through a high-stakes moment and review outcomes later."
                      to="/decision-journal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}