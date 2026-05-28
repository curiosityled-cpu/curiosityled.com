/**
 * OrgPulseAggregatesView — Category B privacy-safe aggregate dashboard for HR/admins.
 *
 * Shows ONLY group-level anonymized leadership intelligence signals.
 * Never shows individual manager data.
 * Enforces minimum group size (n≥5) — suppressed otherwise.
 *
 * Accessible by: Admin Level 2+, Super Administrator, Platform Admin
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, TrendingUp, TrendingDown, Minus, Users, BookOpen, Target, Brain, AlertCircle, Info, Zap, BarChart3, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function DistributionBar({ data, total, colorMap }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(data).map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const colors = colorMap[key] || { bar: 'bg-gray-200', text: 'text-gray-500' };
        return (
          <div key={key} className="flex items-center gap-3">
            <span className={`text-xs font-medium w-24 flex-shrink-0 capitalize ${colors.text}`}>
              {key.replace(/_/g, ' ')}
            </span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colors.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-12 text-right flex-shrink-0">
              {count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ icon: Icon, iconBg, title, value, subtitle, note, suppressed }) {
  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
      <CardContent className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 mb-0.5">{title}</p>
            {suppressed ? (
              <p className="text-sm text-gray-400 italic">Suppressed — group too small</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
              </>
            )}
            {note && (
              <p className="text-[10px] text-gray-400 mt-2 leading-relaxed border-t border-gray-50 pt-1.5">{note}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrgPulseAggregatesView() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['org-pulse-aggregates', refreshKey],
    queryFn: async () => {
      const res = await base44.functions.invoke('getOrgPulseAggregates', {});
      return res;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-full h-32 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border border-red-100 bg-red-50 rounded-2xl">
        <CardContent className="px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">Failed to load aggregate data: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data?.suppressed) {
    return (
      <Card className="shadow-sm border border-amber-100 bg-amber-50 rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Data suppressed for privacy</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">{data.reason}</p>
              <p className="text-xs text-amber-600 mt-2">
                Aggregate metrics require at least {data.minimum_required} managers to prevent identification.
                Currently: {data.total_managers}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data?.meta?.total_managers || 0;

  const energyColors = {
    improving: { bar: 'bg-emerald-400', text: 'text-emerald-600' },
    stable: { bar: 'bg-gray-300', text: 'text-gray-500' },
    declining: { bar: 'bg-amber-400', text: 'text-amber-600' },
    insufficient_data: { bar: 'bg-gray-100', text: 'text-gray-400' },
  };

  const riskColors = {
    high: { bar: 'bg-red-400', text: 'text-red-600' },
    moderate: { bar: 'bg-amber-400', text: 'text-amber-600' },
    low: { bar: 'bg-emerald-400', text: 'text-emerald-600' },
  };

  const trajectoryColors = {
    increasing: { bar: 'bg-red-400', text: 'text-red-600' },
    stable: { bar: 'bg-gray-300', text: 'text-gray-500' },
    decreasing: { bar: 'bg-emerald-400', text: 'text-emerald-600' },
  };

  const confidenceColors = {
    improving: { bar: 'bg-emerald-400', text: 'text-emerald-600' },
    stable: { bar: 'bg-gray-300', text: 'text-gray-500' },
    declining: { bar: 'bg-amber-400', text: 'text-amber-600' },
  };

  return (
    <div className="space-y-5">

      {/* Privacy header — always visible */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
        <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-800">Category B — Aggregated signals only</p>
          <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
            No individual manager data is shown here. All metrics represent group trends across {total} managers.
            Groups below {data?.meta?.minimum_group_size || 5} are suppressed. Individual check-in content, confidence
            history, identity friction, and reflections are always private to each manager.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="flex-shrink-0 text-xs text-emerald-700 hover:bg-emerald-100 h-7"
          onClick={() => setRefreshKey(k => k + 1)}
        >
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Users}
          iconBg="bg-[#0202ff]"
          title="Active engagers (14d)"
          value={`${data?.engagement?.check_in_engagement_rate_pct}%`}
          subtitle={`${data?.engagement?.active_engagers} of ${total} managers`}
          note="% of managers with ≥3 check-ins in last 14 days"
        />
        <MetricCard
          icon={Zap}
          iconBg="bg-amber-500"
          title="Stretched frequently"
          value={`${data?.energy?.stretched_frequently_pct}%`}
          subtitle="Reported stretched ≥5x in 14 days"
          note="Aggregate self-report — no individual attribution"
        />
        <MetricCard
          icon={BookOpen}
          iconBg="bg-purple-500"
          title="Learning stall rate"
          value={`${data?.development?.learning_stall_rate_pct}%`}
          subtitle="No learning activity in 7+ days"
          note="Engagement signal — not performance data"
        />
        <MetricCard
          icon={Target}
          iconBg="bg-blue-500"
          title="Delegation gap rate"
          value={`${data?.development?.delegation_gap_rate_pct}%`}
          subtitle="Declared intent didn't match behavior (7d)"
          note="Closed-loop morning intent vs evening actuals"
        />
        {data?.identity_friction?.suppressed ? (
          <MetricCard
            icon={Brain}
            iconBg="bg-gray-400"
            title="Identity friction signals"
            suppressed={true}
            note={data.identity_friction.reason}
          />
        ) : (
          <MetricCard
            icon={Brain}
            iconBg="bg-violet-500"
            title="Identity friction signals"
            value={`${data?.identity_friction?.rate_pct}%`}
            subtitle="Reporting role/identity friction this week"
            note="Always private at individual level. Aggregate only."
          />
        )}
      </div>

      {/* Energy distribution */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Zap className="w-3 h-3 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Energy trends</p>
            <Badge variant="outline" className="ml-auto text-[10px]">14-day window</Badge>
          </div>
          <DistributionBar data={data?.energy?.distribution || {}} total={total} colorMap={energyColors} />
        </CardContent>
      </Card>

      {/* Overload risk bands */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Overload risk distribution</p>
            <Badge variant="outline" className="ml-auto text-[10px]">28-day composite</Badge>
          </div>
          <DistributionBar data={data?.overload?.risk_bands || {}} total={total} colorMap={riskColors} />
          <div className="mt-4 pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-500 mb-2">Operator-mode risk trajectory</p>
            <DistributionBar data={data?.overload?.risk_trajectory || {}} total={total} colorMap={trajectoryColors} />
          </div>
        </CardContent>
      </Card>

      {/* Confidence distribution */}
      <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Confidence & resilience trends</p>
          </div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Confidence (14d)</p>
          <DistributionBar data={data?.confidence?.distribution || {}} total={total} colorMap={confidenceColors} />
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-3 mb-2">Resilience (14d)</p>
          <DistributionBar data={data?.resilience?.distribution || {}} total={total} colorMap={confidenceColors} />
        </CardContent>
      </Card>

      {/* Data notice */}
      <div className="flex items-start gap-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
        <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          {data?.meta?.data_freshness}. These signals are meant for development support and organizational planning — not performance evaluation or disciplinary decisions. See your platform's Privacy Policy for the full taxonomy of what can and cannot be used at the individual level.
        </p>
      </div>

    </div>
  );
}