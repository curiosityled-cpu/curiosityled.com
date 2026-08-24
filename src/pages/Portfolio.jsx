import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, Users, Activity, Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import MVPPageLayout from "@/components/mvp/MVPPageLayout";
import {
  deriveManagerStatus,
  aggregatePortfolioStatus,
  BAND_LABELS,
  TREND_LABELS,
} from "@/lib/portfolio/managerStatus";

export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("resolveHRBPPortfolio", {});
      setData(res.data);
    } catch (e) {
      setError(e.message || "Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const managers = data?.managers || [];
  const interventions = data?.interventions || [];

  // Compute statuses
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
      const status = deriveManagerStatus(ctx);
      return { ...m, status };
    });
  }, [managers]);

  const portfolio = useMemo(
    () => aggregatePortfolioStatus(managerStatuses.map((m) => m.status)),
    [managerStatuses]
  );

  // Sort: high_priority first, then watch, then stable
  const sortedManagers = useMemo(() => {
    const order = { high_priority: 0, watch: 1, stable: 2 };
    return [...managerStatuses].sort((a, b) => {
      const scoreDiff = order[a.status.band] - order[b.status.band];
      if (scoreDiff !== 0) return scoreDiff;
      return b.status.score - a.status.score;
    });
  }, [managerStatuses]);

  // What Changed — derive from trend directions
  const whatChanged = useMemo(() => {
    const items = [];
    const highPriority = managerStatuses.filter((m) => m.status.band === "high_priority");
    if (highPriority.length > 0) {
      items.push({
        text: `${highPriority.length} manager${highPriority.length > 1 ? "s" : ""} escalated to High Priority`,
        type: "negative",
      });
    }
    const improving = managerStatuses.filter((m) => m.status.trend === "improving");
    if (improving.length > 0) {
      items.push({
        text: `${improving.length} manager${improving.length > 1 ? "s" : ""} showing improvement`,
        type: "positive",
      });
    }
    const overloadCount = managerStatuses.filter((m) =>
      m.status.reasons.some((r) => r.key === "overload_rising")
    ).length;
    if (overloadCount > 0) {
      items.push({
        text: `${overloadCount} manager${overloadCount > 1 ? "s" : ""} with rising overload patterns`,
        type: "negative",
      });
    }
    const noCheckin = managerStatuses.filter((m) =>
      m.status.reasons.some((r) => r.key === "disengagement_signal")
    ).length;
    if (noCheckin > 0) {
      items.push({
        text: `${noCheckin} manager${noCheckin > 1 ? "s" : ""} haven't checked in recently`,
        type: "warning",
      });
    }
    return items.slice(0, 4);
  }, [managerStatuses]);

  if (loading) {
    return (
      <MVPPageLayout title="My Portfolio" subtitle="Manager support intelligence">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" />
        </div>
      </MVPPageLayout>
    );
  }

  if (error) {
    return (
      <MVPPageLayout title="My Portfolio" subtitle="Manager support intelligence">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <Button onClick={fetchPortfolio} variant="outline" size="sm">
              Try again
            </Button>
          </CardContent>
        </Card>
      </MVPPageLayout>
    );
  }

  if (managers.length === 0) {
    return (
      <MVPPageLayout title="My Portfolio" subtitle="Manager support intelligence">
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-700 mb-1">No portfolio assigned yet</p>
            <p className="text-sm text-gray-500">
              Your administrator needs to assign managers to your portfolio before you can see
              manager support intelligence.
            </p>
          </CardContent>
        </Card>
      </MVPPageLayout>
    );
  }

  return (
    <MVPPageLayout
      title="My Portfolio"
      subtitle={`${portfolio.support_needed} of ${portfolio.total} managers may need support`}
    >
      <div className="space-y-6">
        {/* Hero — Manager Support Needed */}
        <ManagerSupportHero portfolio={portfolio} />

        {/* What Changed */}
        {whatChanged.length > 0 && <WhatChangedCard items={whatChanged} />}

        {/* Manager Health Watchlist */}
        <ManagerHealthWatchlist
          managers={sortedManagers}
          interventions={interventions}
          onSelectManager={(m) =>
            navigate(`/manager-detail/${m.user.id}`, { state: { manager: m.user, advisorMode: true } })
          }
        />
      </div>
    </MVPPageLayout>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────
function ManagerSupportHero({ portfolio }) {
  const { total, high_priority, watch, stable, support_needed } = portfolio;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Manager Support Needed
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">{support_needed}</span>
                <span className="text-lg text-gray-500">of {total}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Active monitoring</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatusPill label="High Priority" count={high_priority} band="high_priority" />
            <StatusPill label="Watch" count={watch} band="watch" />
            <StatusPill label="Stable" count={stable} band="stable" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatusPill({ label, count, band }) {
  const style = BAND_LABELS[band];
  return (
    <div className={`rounded-xl border p-3 ${style.bg} ${style.border}`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${style.color}`}>{count}</p>
    </div>
  );
}

// ── What Changed ───────────────────────────────────────────────────────
function WhatChangedCard({ items }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-[#0202ff]" />
          <h3 className="text-sm font-semibold text-gray-900">What Changed</h3>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  item.type === "negative"
                    ? "bg-red-500"
                    : item.type === "positive"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              <p className="text-sm text-gray-700">{item.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Watchlist ──────────────────────────────────────────────────────────
function ManagerHealthWatchlist({ managers, interventions, onSelectManager }) {
  const openInterventionsByEmail = useMemo(() => {
    const map = {};
    interventions
      .filter((i) => i.status === "open")
      .forEach((i) => {
        if (!map[i.manager_email]) map[i.manager_email] = 0;
        map[i.manager_email]++;
      });
    return map;
  }, [interventions]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Manager Health Watchlist</h3>
          <span className="text-xs text-gray-500">{managers.length} managers</span>
        </div>

        <div className="space-y-2">
          {managers.map((m, i) => {
            const band = BAND_LABELS[m.status.band];
            const trend = TREND_LABELS[m.status.trend];
            const openCount = openInterventionsByEmail[m.user.email] || 0;
            return (
              <button
                key={m.user.id || i}
                onClick={() => onSelectManager(m)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-600">
                    {(m.user.full_name || m.user.email)[0]}
                  </span>
                </div>

                {/* Name + reasons */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {m.user.full_name || m.user.email}
                    </p>
                    {m.user.department && (
                      <span className="text-xs text-gray-400 truncate">· {m.user.department}</span>
                    )}
                  </div>
                  {m.status.reasons.length > 0 ? (
                    <p className="text-xs text-gray-500 truncate">
                      {m.status.reasons.map((r) => r.label).join(" · ")}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">No active signals</p>
                  )}
                </div>

                {/* Trend */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-xs font-medium ${trend.color}`}>{trend.icon}</span>
                </div>

                {/* Band badge */}
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${band.bg} ${band.color} flex-shrink-0`}>
                  {band.short}
                </div>

                {/* Open interventions */}
                {openCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#0202ff]/10 flex-shrink-0">
                    <span className="text-xs font-medium text-[#0202ff]">{openCount} open</span>
                  </div>
                )}

                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}