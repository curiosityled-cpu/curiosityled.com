/**
 * CategoryBOrgView — Category B aggregated HR view.
 *
 * Privacy spec: shows ONLY aggregated, non-identifiable signals.
 * No individual drill-down. No raw check-in data.
 * Minimum group size enforced before any metric is surfaced.
 *
 * Visible to: Admin, Platform Admin, Super Administrator.
 * Never shows: individual energy, raw pulses, confidence, identity friction.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Shield, Users, TrendingDown, TrendingUp, Minus, BookOpen, Target, AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MIN_GROUP_SIZE = 5; // never show aggregated data for fewer than 5 managers

function TrendBadge({ trend }) {
  if (!trend || trend === 'insufficient_data') return <Badge variant="outline" className="text-xs text-gray-400">Building</Badge>;
  if (trend === 'improving') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-xs"><TrendingUp className="w-3 h-3 mr-1" />Improving</Badge>;
  if (trend === 'declining') return <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-xs"><TrendingDown className="w-3 h-3 mr-1" />Worth watching</Badge>;
  return <Badge className="bg-gray-50 text-gray-600 border-gray-100 text-xs"><Minus className="w-3 h-3 mr-1" />Stable</Badge>;
}

function MetricRow({ label, value, note }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {note && <span className="text-xs text-gray-400">{note}</span>}
      </div>
    </div>
  );
}

export default function CategoryBOrgView({ clientId }) {
  const { user } = useAuth();

  // Only admins can see this
  const isAdmin = ['admin', 'Admin Level 2', 'Super Administrator', 'Platform Admin'].includes(
    user?.role || user?.data?.app_role || user?.app_role
  );

  // Fetch all manager trends (admin-readable via RLS)
  const { data: allTrends = [], isLoading } = useQuery({
    queryKey: ['org-trends-b', clientId],
    queryFn: async () => {
      const rows = await base44.entities.ManagerTrends.list('-last_trend_computed_at', 500);
      // Filter by client if provided
      if (clientId) return rows.filter(r => r.client_id === clientId);
      return rows;
    },
    enabled: isAdmin,
    staleTime: 30 * 60 * 1000,
  });

  // Fetch tone prefs to get manager count + learning/dev engagement
  const { data: tonePrefs = [] } = useQuery({
    queryKey: ['org-tone-prefs-b', clientId],
    queryFn: () => base44.entities.TonePreference.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 30 * 60 * 1000,
  });

  if (!isAdmin) return null;
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[80, 120, 100].map((h, i) => (
          <div key={i} className="w-full rounded-xl bg-gray-100 animate-pulse" style={{ height: h }} />
        ))}
      </div>
    );
  }

  const n = allTrends.length;

  // Enforce minimum group size
  if (n < MIN_GROUP_SIZE) {
    return (
      <Card className="border border-dashed border-gray-200 rounded-2xl bg-white shadow-sm">
        <CardContent className="px-5 py-6 flex items-start gap-3">
          <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Aggregated signals not yet available</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              A minimum of {MIN_GROUP_SIZE} managers with active check-in data is required before aggregated signals are shown.
              This protects individual privacy. Currently {n} manager{n !== 1 ? 's' : ''} enrolled.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Aggregate computations (Category B only — no individual data exposed) ───

  // Overload signal: % of managers with overload_pattern_strength ≥ 60
  const overloadedCount = allTrends.filter(t => (t.overload_pattern_strength || 0) >= 60).length;
  const overloadPct = Math.round((overloadedCount / n) * 100);

  // Stretch frequency signal: average stretch days per 14d
  const avgStretch = allTrends.length > 0
    ? Math.round(allTrends.reduce((a, t) => a + (t.stretch_frequency_14d || 0), 0) / n)
    : 0;

  // Learning momentum: % with learning_stall_detected
  const stalledCount = allTrends.filter(t => t.learning_stall_detected === true).length;
  const stalledPct = Math.round((stalledCount / n) * 100);

  // Delegation follow-through signal: avg delegation gap vs intent
  const managersWithDelegationData = allTrends.filter(t => (t.delegation_intent_count_7d || 0) > 0);
  const delegationGapRate = managersWithDelegationData.length > 0
    ? Math.round(
        (managersWithDelegationData.reduce((a, t) => a + (t.delegation_gap_count_7d || 0), 0) /
          managersWithDelegationData.reduce((a, t) => a + (t.delegation_intent_count_7d || 0), 0)) * 100
      )
    : null;

  // Engagement with check-ins: % with ≥ 5 data points in 14d
  const activeEngagedCount = allTrends.filter(t => (t.data_points_14d || 0) >= 5).length;
  const engagedPct = Math.round((activeEngagedCount / n) * 100);

  // Trend direction distribution for energy
  const energyImproving = allTrends.filter(t => t.energy_trend === 'improving').length;
  const energyDeclining = allTrends.filter(t => t.energy_trend === 'declining').length;
  const energyStable = n - energyImproving - energyDeclining;

  // Teams onboarding completion
  const teamsComplete = tonePrefs.filter(t => t.teams_onboarding_complete).length;
  const totalManagers = tonePrefs.length;

  // Risk flag: clusters where overload + declining energy coincide
  const highRiskCluster = allTrends.filter(t =>
    (t.overload_pattern_strength || 0) >= 70 &&
    t.energy_trend === 'declining'
  ).length;

  return (
    <div className="space-y-4">

      {/* Privacy header */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
        <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-emerald-800">Category B — Aggregated signals only</p>
          <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
            This view shows only aggregated, non-identifiable patterns across {n} managers.
            Individual energy levels, confidence, identity friction, and raw check-ins are never shown here.
            Minimum group size: {MIN_GROUP_SIZE} managers.
          </p>
        </div>
      </div>

      {/* Engagement with support */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Engagement with support</p>
        </div>
        <CardContent className="px-5 pt-2 pb-5">
          <MetricRow label="Managers enrolled" value={totalManagers} note="with active TonePreference" />
          <MetricRow label="Actively checking in (14d)" value={`${engagedPct}%`} note={`${activeEngagedCount} of ${n}`} />
          <MetricRow label="Teams onboarding complete" value={`${Math.round((teamsComplete / Math.max(totalManagers,1)) * 100)}%`} note={`${teamsComplete} managers`} />
        </CardContent>
      </Card>

      {/* Aggregate workload strain signals */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${overloadPct >= 40 ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
            <AlertCircle className={`w-3.5 h-3.5 ${overloadPct >= 40 ? 'text-amber-500' : 'text-gray-400'}`} />
          </div>
          <p className="text-sm font-semibold text-gray-900">Aggregate workload strain</p>
        </div>
        <CardContent className="px-5 pt-2 pb-5">
          <MetricRow
            label="High overload pattern"
            value={`${overloadPct}%`}
            note={`${overloadedCount} of ${n} managers · score ≥60/100`}
          />
          <MetricRow
            label="Avg stretch/drain days (14d)"
            value={`${avgStretch} days`}
            note="of last 14 check-in days"
          />
          {highRiskCluster >= MIN_GROUP_SIZE && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>{highRiskCluster} managers</strong> show both elevated overload and declining energy trends simultaneously.
                This cluster may benefit from targeted support. No individual data is surfaced here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Development momentum */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Development momentum</p>
        </div>
        <CardContent className="px-5 pt-2 pb-5">
          <MetricRow
            label="Learning momentum stalled"
            value={`${stalledPct}%`}
            note={`${stalledCount} of ${n} managers · no learning in 7+ days`}
          />
          {delegationGapRate !== null && (
            <MetricRow
              label="Delegation follow-through rate"
              value={`${100 - delegationGapRate}%`}
              note="declared intent matched by behavior"
            />
          )}
        </CardContent>
      </Card>

      {/* Broad energy direction */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/8 border border-[#0202ff]/12 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Energy direction — org view</p>
            <p className="text-[10px] text-gray-400">Aggregated trend signals, no individual data</p>
          </div>
        </div>
        <CardContent className="px-5 pt-2 pb-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{energyImproving}</p>
              <p className="text-[10px] text-emerald-600">Trending up</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-600">{energyStable}</p>
              <p className="text-[10px] text-gray-500">Stable</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{energyDeclining}</p>
              <p className="text-[10px] text-amber-600">Worth watching</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Info className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-500 leading-relaxed">
              "Worth watching" means that manager's energy trend has been declining over their last 14 check-ins.
              It does not indicate their absolute state, nor is any individual identified from this view.
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}