import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Activity, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ManagerRiskCard({ clientId }) {
  const { data: riskProfiles = [], isLoading } = useQuery({
    queryKey: ['manager-risk-card', clientId],
    queryFn: () => clientId
      ? base44.entities.ManagerRiskProfile.filter({ client_id: clientId }).catch(() => [])
      : Promise.resolve([]),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || riskProfiles.length === 0) return null;

  const atRisk = riskProfiles.filter(p => p.risk_level === "At Risk").length;
  const watchlist = riskProfiles.filter(p => p.risk_level === "Watchlist").length;
  const onTrack = riskProfiles.filter(p => p.risk_level === "On Track").length;

  // Aggregate top risk factors
  const factorCounts = {};
  riskProfiles.forEach(p => {
    Object.keys(p.risk_factors || {}).forEach(k => {
      factorCounts[k] = (factorCounts[k] || 0) + 1;
    });
  });
  const topFactors = Object.entries(factorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Card className="border border-gray-100 shadow-sm rounded-2xl">
      <CardHeader className="pb-2 pt-5 px-6">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0202ff]" />
          Behavioral Risk — 1:1 Signals
        </CardTitle>
        <p className="text-xs text-gray-400 mt-0.5">Based on meeting patterns, commitments, and engagement trends</p>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        {/* Risk level summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-600">{atRisk}</p>
            <p className="text-xs text-red-500 font-medium">At Risk</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-600">{watchlist}</p>
            <p className="text-xs text-amber-500 font-medium">Watchlist</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-600">{onTrack}</p>
            <p className="text-xs text-emerald-500 font-medium">On Track</p>
          </div>
        </div>

        {/* Top risk factors */}
        {topFactors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Risk Factors</p>
            {topFactors.map(([key, count]) => (
              <div key={key} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-gray-500 font-medium">{count} manager{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}