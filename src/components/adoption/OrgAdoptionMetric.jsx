import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Repeat, TrendingUp, Users, AlertCircle } from "lucide-react";

export default function OrgAdoptionMetric({ clientId }) {
  const { data: allTrends = [], isLoading } = useQuery({
    queryKey: ["adoption-org", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const rows = await base44.entities.ManagerTrends.filter({ client_id: clientId }, "-last_trend_computed_at", 200);
      return rows;
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const withCommitments = allTrends.filter(t => (t.behavioral_committed_count ?? 0) > 0);
    const totalCommitted = withCommitments.reduce((sum, t) => sum + (t.behavioral_committed_count ?? 0), 0);
    const totalDemonstrated = withCommitments.reduce((sum, t) => sum + (t.behavioral_demonstrated_count ?? 0), 0);
    const totalSelfReport = withCommitments.reduce((sum, t) => sum + (t.behavioral_self_report_only_count ?? 0), 0);
    const orgRate = totalCommitted > 0 ? Math.round((totalDemonstrated / totalCommitted) * 100) : null;
    const managersWithCommitments = withCommitments.length;
    const managersWithData = allTrends.length;

    // Distribution buckets
    const distribution = { "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0, "no data": 0 };
    for (const t of allTrends) {
      const r = t.behavioral_adoption_rate;
      if (r == null) distribution["no data"]++;
      else if (r <= 25) distribution["0-25%"]++;
      else if (r <= 50) distribution["26-50%"]++;
      else if (r <= 75) distribution["51-75%"]++;
      else distribution["76-100%"]++;
    }

    return { totalCommitted, totalDemonstrated, totalSelfReport, orgRate, managersWithCommitments, managersWithData, distribution };
  }, [allTrends]);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-[#0202ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (stats.managersWithData === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Repeat className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Behavioral Adoption</p>
        </div>
        <p className="text-sm text-slate-500">No adoption data available yet. The nightly trend computation will populate this once managers have behavioral commitments.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
      <div className="h-0.5 w-full" style={{ backgroundColor: "#0202ff" }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Repeat className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Behavioral Adoption</p>
            <p className="text-[10px] text-slate-400">Platform headline outcome — behaviors demonstrated in real situations</p>
          </div>
        </div>

        {/* Headline */}
        <div className="flex items-baseline gap-3 mb-4">
          <p className="text-4xl font-bold text-slate-900">{stats.orgRate != null ? `${stats.orgRate}%` : "—"}</p>
          <p className="text-xs text-slate-500">
            {stats.totalDemonstrated} of {stats.totalCommitted} behaviors demonstrated across {stats.managersWithCommitments} {stats.managersWithCommitments === 1 ? "manager" : "managers"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Distribution */}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Distribution
            </p>
            <div className="space-y-1">
              {Object.entries(stats.distribution).map(([bucket, count]) => (
                <div key={bucket} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{bucket}</span>
                  <span className="text-[10px] font-semibold text-slate-700 tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Awaiting corroboration */}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Awaiting Corroboration
            </p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalSelfReport}</p>
            <p className="text-[10px] text-slate-500">behaviors with self-report only</p>
          </div>
        </div>
      </div>
    </div>
  );
}