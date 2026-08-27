import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowRight, Users, AlertTriangle, Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  deriveManagerStatus,
  aggregatePortfolioStatus,
  BAND_LABELS,
  TREND_LABELS,
} from "@/lib/portfolio/managerStatus";

export default function HeadOfHRManagementHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getHeadOfHRInsights", {});
      setData(res.data);
    } catch (e) {
      setError(e.message || "Failed to load portfolio health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const managers = data?.managers || [];
  const interventions = data?.interventions || [];

  const managerStatuses = useMemo(() => {
    return managers.map((m) => {
      const ctx = {
        trends: m.trends,
        latestDecisionDqi: m.latestDecisionDqi,
        dqiCompleteness: m.dqiCompleteness,
        daysSinceLast1on1: m.daysSinceLast1on1,
        stalledGoalCount: m.stalledGoalCount,
        overdueGoalCount: m.overdueGoalCount,
        daysSinceLastCheckIn: m.daysSinceLastCheckIn,
      };
      return { ...m, status: deriveManagerStatus(ctx) };
    });
  }, [managers]);

  const portfolio = useMemo(
    () => aggregatePortfolioStatus(managerStatuses.map((m) => m.status)),
    [managerStatuses]
  );

  // Department heat map
  const departmentHeatMap = useMemo(() => {
    const byDept = {};
    managerStatuses.forEach((m) => {
      const dept = m.user.department || "Unassigned";
      if (!byDept[dept]) byDept[dept] = { total: 0, high_priority: 0, watch: 0, stable: 0, managers: [] };
      byDept[dept].total++;
      byDept[dept][m.status.band]++;
      byDept[dept].managers.push(m);
    });
    return Object.entries(byDept).map(([dept, counts]) => ({
      department: dept,
      ...counts,
      support_pct: counts.total > 0 ? Math.round(((counts.high_priority + counts.watch) / counts.total) * 100) : 0,
    }));
  }, [managerStatuses]);

  // Top organizational patterns
  const topPatterns = useMemo(() => {
    const patternCounts = {};
    managerStatuses.forEach((m) => {
      m.status.reasons.forEach((r) => {
        patternCounts[r.label] = (patternCounts[r.label] || 0) + 1;
      });
    });
    return Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }, [managerStatuses]);

  // HRBP engagement
  const hrbpEngagement = useMemo(() => {
    const flaggedEmails = new Set(
      managerStatuses.filter((m) => m.status.band !== "stable").map((m) => m.user.email)
    );
    const flaggedWithIntervention = new Set(
      interventions.filter((i) => flaggedEmails.has(i.manager_email)).map((i) => i.manager_email)
    );
    return {
      flagged: flaggedEmails.size,
      with_action: flaggedWithIntervention.size,
      pct: flaggedEmails.size > 0 ? Math.round((flaggedWithIntervention.size / flaggedEmails.size) * 100) : 0,
    };
  }, [managerStatuses, interventions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#0202ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 mb-6">
        <CardContent className="py-4 text-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (managers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5 mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#0202ff]/10 flex items-center justify-center">
          <Brain className="w-4 h-4 text-[#0202ff]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Portfolio Health</h2>
          <p className="text-xs text-gray-500">Portfolio-wide manager capability and support risk</p>
        </div>
      </div>

      {/* Enterprise indicators row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <EnterpriseIndicator
          label="Managers Requiring Support"
          value={`${portfolio.support_pct}%`}
          subtext={`${portfolio.support_needed} of ${portfolio.total}`}
          trend={portfolio.support_needed > portfolio.total * 0.3 ? "negative" : "neutral"}
        />
        <EnterpriseIndicator
          label="High Priority"
          value={portfolio.high_priority.toString()}
          subtext="managers need intervention"
          trend={portfolio.high_priority > 0 ? "negative" : "positive"}
        />
        <EnterpriseIndicator
          label="HRBP Engagement"
          value={`${hrbpEngagement.pct}%`}
          subtext={`${hrbpEngagement.with_action} of ${hrbpEngagement.flagged} flagged`}
          trend="neutral"
          roadmap
        />
        <EnterpriseIndicator
          label="Stable"
          value={portfolio.stable.toString()}
          subtext={`of ${portfolio.total} managers`}
          trend="positive"
        />
      </div>

      {/* Business Unit heat map */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Business Unit Heat Map</h3>
            <span className="text-xs text-gray-500">Click a unit to drill down</span>
          </div>
          <div className="space-y-2">
            {departmentHeatMap.map((row) => {
              const heatColor =
                row.high_priority > 0
                  ? "bg-red-50 border-red-200"
                  : row.watch > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200";
              return (
                <button
                  key={row.department}
                  onClick={() => navigate(`/portfolio?dept=${encodeURIComponent(row.department)}`)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border ${heatColor} hover:shadow-sm transition-all`}
                >
                  <span className="text-sm font-medium text-gray-900 flex-1">{row.department}</span>
                  <div className="flex items-center gap-2">
                    {row.high_priority > 0 && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
                        {row.high_priority} Priority
                      </Badge>
                    )}
                    {row.watch > 0 && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        {row.watch} Watch
                      </Badge>
                    )}
                    {row.stable > 0 && (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        {row.stable} Stable
                      </Badge>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top organizational patterns */}
      {topPatterns.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Organizational Patterns</h3>
            <div className="space-y-2">
              {topPatterns.map((p, i) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1">{p.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0202ff] rounded-full"
                        style={{ width: `${(p.count / managers.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-6 text-right">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnterpriseIndicator({ label, value, subtext, trend, roadmap }) {
  const trendColor =
    trend === "positive"
      ? "text-emerald-600"
      : trend === "negative"
      ? "text-red-600"
      : "text-gray-500";
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          {roadmap && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 border-amber-200 bg-amber-50">
              Roadmap
            </Badge>
          )}
        </div>
        <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>
      </CardContent>
    </Card>
  );
}