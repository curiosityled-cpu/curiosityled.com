/**
 * ManagerTeam — role-aware team rollup view.
 * Route: /team
 *
 * Renders differently by the rollup's detail_level:
 *  - full:       aggregate cards + KPIs + roster + at-risk (HRBP, HR/Super Admin, Platform Admin)
 *  - directs:    aggregate cards (full tree) + KPIs + directs roster + at-risk (User Level 2)
 *  - aggregated: aggregate cards + KPIs only — no roster, no at-risk (Analyst, Executive)
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Users, Gauge, AlertTriangle, Loader2, RefreshCw, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamSummaryCards from "@/components/team/TeamSummaryCards";
import TeamMemberRow from "@/components/team/TeamMemberRow";
import TeamKpiList from "@/components/team/TeamKpiList";

function SectionBar({ icon: Icon, label, action }) {
  return (
    <div className="px-5 pt-4 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#0202ff]" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</h2>
      </div>
      {action}
    </div>
  );
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
  const kpis = aggregates?.kpis || [];
  const atRisk = rollup?.at_risk || [];
  const atRiskEmails = new Set(atRisk.map((r) => r.email));

  const scopeLabel = rollup?.scope_label || "Team";
  const scopeSize = rollup?.scope_size || 0;
  const detailSize = rollup?.detail_size || 0;
  const detailLevel = rollup?.detail_level || "full";
  const scopeType = rollup?.scope_type || "vertical";
  const isAggregatedOnly = detailLevel === "aggregated";
  const isDirectsOnly = detailLevel === "directs";

  const subtitle = isDirectsOnly
    ? `${scopeSize} in your reporting tree · ${detailSize} direct ${detailSize === 1 ? "report" : "reports"}`
    : `${scopeSize} ${scopeSize === 1 ? "person" : "people"} in scope`;

  const emptyMessage =
    scopeType === "portfolio" ? "No managers in your portfolio yet."
    : scopeType === "enterprise" ? "No users in your organization yet."
    : "No reports in your tree yet.";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{scopeLabel}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rollup ? subtitle : "Progress and rollups across your scope."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-gray-500 hover:text-gray-800"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

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
      ) : (
        <>
          {/* Scope note for directs-only: aggregates span the full tree */}
          {isDirectsOnly && detailSize < scopeSize && (
            <div className="flex items-start gap-2 px-4 py-2.5 bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl">
              <Info className="w-3.5 h-3.5 text-[#0202ff] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600">
                Aggregates span your full reporting tree of {scopeSize} people. Individual results show your {detailSize} direct {detailSize === 1 ? "report" : "reports"}.
              </p>
            </div>
          )}

          {/* Aggregate summary */}
          <TeamSummaryCards aggregates={aggregates} teamSize={scopeSize} />

          {/* At-risk — only when per-member detail is available */}
          {!isAggregatedOnly && atRisk.length > 0 && (
            <Card className="shadow-sm border border-amber-100 bg-amber-50/40 rounded-2xl overflow-hidden">
              <SectionBar icon={AlertTriangle} label={`At-risk signals · ${atRisk.length}`} />
              <div className="px-5 pb-4 space-y-2">
                {atRisk.map((r) => (
                  <div key={r.email} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.full_name || r.email}</p>
                      <p className="text-xs text-gray-500">{r.reasons.join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* KPIs */}
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
            <SectionBar icon={Gauge} label={`${scopeLabel} KPIs`} />
            <TeamKpiList kpis={kpis} members={members} />
          </Card>

          {/* Roster — only when per-member detail is available */}
          {!isAggregatedOnly && members.length > 0 && (
            <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
              <SectionBar icon={Users} label={`Roster · ${members.length}`} />
              <div>
                {members.map((m) => (
                  <TeamMemberRow key={m.id || m.email} member={m} isAtRisk={atRiskEmails.has(m.email)} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}