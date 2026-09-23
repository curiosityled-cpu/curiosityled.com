/**
 * ManagerTeam — Team rollup view for User Level 2 (managers).
 * Route: /team
 *
 * Replaces the former quick-actions page with a real team progress rollup:
 * aggregate KPIs, per-member progress, and at-risk flags — powered by the
 * getTeamRollup backend function.
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Users, Gauge, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  const atRiskEmails = new Set(atRisk.map(r => r.email));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rollup ? `${rollup.team_size} ${rollup.team_size === 1 ? "direct report" : "direct reports"}` : "Progress and rollups across your team."}
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
      ) : !rollup || rollup.team_size === 0 ? (
        <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
          <div className="px-5 py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-800">No direct reports yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Once your team is assigned, you'll see goal progress, assessments, journeys, and check-ins roll up here.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Aggregate summary */}
          <TeamSummaryCards aggregates={aggregates} teamSize={rollup.team_size} />

          {/* At-risk */}
          {atRisk.length > 0 && (
            <Card className="shadow-sm border border-amber-100 bg-amber-50/40 rounded-2xl overflow-hidden">
              <SectionBar icon={AlertTriangle} label={`At-risk signals · ${atRisk.length}`} />
              <div className="px-5 pb-4 space-y-2">
                {atRisk.map(r => (
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

          {/* Team KPIs */}
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
            <SectionBar icon={Gauge} label="Team KPIs" />
            <TeamKpiList kpis={kpis} members={members} />
          </Card>

          {/* Roster */}
          <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
            <SectionBar icon={Users} label={`Roster · ${members.length}`} />
            <div>
              {members.map(m => (
                <TeamMemberRow key={m.id || m.email} member={m} isAtRisk={atRiskEmails.has(m.email)} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}