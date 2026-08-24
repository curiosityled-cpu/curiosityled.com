import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Users, Brain, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  deriveManagerStatus,
  aggregatePortfolioStatus,
  BAND_LABELS,
} from "@/lib/portfolio/managerStatus";

/**
 * Portfolio-scoped insights view for the HRBP — rendered as a tab in the
 * Leadership Intelligence Hub. Shows the same portfolio data as the /portfolio
 * page but in the Hub's strategic-context style.
 */
export default function PortfolioInsightsView({ user, onMetricsUpdate }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await base44.functions.invoke("resolveHRBPPortfolio", {});
        setData(res.data);
        if (onMetricsUpdate) {
          const managers = res.data?.managers || [];
          const statuses = managers.map((m) =>
            deriveManagerStatus({
              trends: m.trends,
              latestDecisionDqi: m.latestDecisionDqi,
              dqiCompleteness: m.dqiCompleteness,
              daysSinceLast1on1: m.daysSinceLast1on1,
              stalledGoalCount: m.stalledGoalCount,
              overdueGoalCount: m.overdueGoalCount,
              daysSinceLastCheckIn: m.daysSinceLastCheckIn,
            })
          );
          const agg = aggregatePortfolioStatus(statuses);
          onMetricsUpdate({
            totalInsights: managers.length,
            actionItems: agg.support_needed,
            completionRate: agg.total > 0 ? Math.round((agg.stable / agg.total) * 100) : 0,
          });
        }
      } catch (e) {
        setError(e.message || "Failed to load portfolio data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const managers = data?.managers || [];
  const interventions = data?.interventions || [];

  const managerStatuses = useMemo(() => {
    return managers.map((m) => {
      const status = deriveManagerStatus({
        trends: m.trends,
        latestDecisionDqi: m.latestDecisionDqi,
        dqiCompleteness: m.dqiCompleteness,
        daysSinceLast1on1: m.daysSinceLast1on1,
        stalledGoalCount: m.stalledGoalCount,
        overdueGoalCount: m.overdueGoalCount,
        daysSinceLastCheckIn: m.daysSinceLastCheckIn,
      });
      return { ...m, status };
    });
  }, [managers]);

  const portfolio = useMemo(
    () => aggregatePortfolioStatus(managerStatuses.map((m) => m.status)),
    [managerStatuses]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (managers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-base font-medium text-gray-700 mb-1">No portfolio assigned yet</p>
          <p className="text-sm text-gray-500">
            Your administrator needs to assign managers to your portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Portfolio pulse */}
      <div className="grid grid-cols-3 gap-3">
        {["high_priority", "watch", "stable"].map((band) => {
          const style = BAND_LABELS[band];
          const count = portfolio[band];
          return (
            <Card key={band} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="text-xs font-medium text-gray-500">{style.label}</span>
                </div>
                <p className={`text-2xl font-bold ${style.color}`}>{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick link to full Portfolio page */}
      <Card className="border-0 shadow-sm bg-[#0202ff]/5 border-[#0202ff]/15">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#0202ff]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Portfolio Case Management</p>
              <p className="text-xs text-gray-500">
                {portfolio.support_needed} of {portfolio.total} managers may need support
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/portfolio")}
            className="bg-[#0202ff] hover:bg-[#0101dd]"
          >
            Open Portfolio <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Mini watchlist */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Managers Needing Attention</h3>
          <div className="space-y-2">
            {managerStatuses
              .filter((m) => m.status.band !== "stable")
              .sort((a, b) => b.status.score - a.status.score)
              .slice(0, 5)
              .map((m, i) => {
                const band = BAND_LABELS[m.status.band];
                return (
                  <button
                    key={m.user.id || i}
                    onClick={() =>
                      navigate(`/manager-detail/${m.user.id || encodeURIComponent(m.user.email)}`, {
                        state: { manager: m.user, advisorMode: true, managerBundle: m },
                      })
                    }
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-600">
                        {(m.user.full_name || m.user.email)[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.user.full_name || m.user.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {m.status.reasons.map((r) => r.label).join(" · ")}
                      </p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${band.bg} ${band.color} flex-shrink-0`}>
                      {band.short}
                    </div>
                  </button>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}