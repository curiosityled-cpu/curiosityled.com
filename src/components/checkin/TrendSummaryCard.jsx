/**
 * TrendSummaryCard — private manager trend display.
 *
 * Shows longitudinal behavioral patterns from ManagerTrends.
 * Always private — never visible to HR or admin roles.
 * Evidence labels distinguish self-report from AI interpretation.
 */
import React from "react";
import { TrendingUp, TrendingDown, Minus, Brain, Eye, Clock, AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function TrendArrow({ trend }) {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-amber-500" />;
  if (trend === 'stable') return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  return <Info className="w-3.5 h-3.5 text-gray-300" />;
}

function TrendBadge({ trend }) {
  const map = {
    improving: { label: 'Improving', color: 'bg-emerald-50 text-emerald-700' },
    stable: { label: 'Stable', color: 'bg-gray-100 text-gray-600' },
    declining: { label: 'Worth watching', color: 'bg-amber-50 text-amber-700' },
    insufficient_data: { label: 'Still learning', color: 'bg-gray-100 text-gray-400' },
  };
  const config = map[trend] || map.insufficient_data;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

function SignalRow({ label, trend, detail }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <TrendArrow trend={trend} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-gray-400">{detail}</span>}
        <TrendBadge trend={trend} />
      </div>
    </div>
  );
}

export default function TrendSummaryCard({ trends, onOpenAtreus }) {
  if (!trends) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-6 text-center">
          <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600 mb-1">Patterns build over time</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            After a few check-ins, Atreus will start noticing patterns in how your weeks feel.
            The more consistently you check in, the richer this becomes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasEnoughData = (trends.data_points_14d || 0) >= 3;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">What Atreus is noticing</p>
            <p className="text-[10px] text-gray-400">From your recent check-ins · Private to you</p>
          </div>
        </div>
        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" /> Only you
        </span>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {/* Trend narrative */}
        {trends.trend_narrative && hasEnoughData && (
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <Brain className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{trends.trend_narrative}"
              </p>
            </div>
            <span className="text-[10px] text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full inline-block">
              Atreus interpretation · from your recent check-ins
            </span>
          </div>
        )}

        {!hasEnoughData && (
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              I'm still learning your rhythms — check back after a few more check-ins.
            </p>
          </div>
        )}

        {/* Signal rows — only show when data exists */}
        {hasEnoughData && (
          <div className="divide-y divide-gray-50">
            {trends.confidence_trend && trends.confidence_trend !== 'insufficient_data' && (
              <SignalRow
                label="Confidence"
                trend={trends.confidence_trend}
                detail={`${trends.data_points_14d || 0} check-ins`}
              />
            )}
            {trends.energy_trend && trends.energy_trend !== 'insufficient_data' && (
              <SignalRow
                label="Energy"
                trend={trends.energy_trend}
                detail={trends.stretch_frequency_14d > 0 ? `${trends.stretch_frequency_14d} stretched days` : null}
              />
            )}
            {trends.operator_risk_trajectory && trends.operator_risk_trajectory !== 'insufficient_data' && (
              <SignalRow
                label="Load pattern"
                trend={trends.operator_risk_trajectory === 'increasing' ? 'declining' : trends.operator_risk_trajectory === 'decreasing' ? 'improving' : 'stable'}
                detail={trends.operator_risk_trajectory === 'increasing' ? 'Rising' : trends.operator_risk_trajectory === 'decreasing' ? 'Easing' : 'Holding'}
              />
            )}
          </div>
        )}

        {/* Delegation loop summary */}
        {(trends.delegation_intent_count_7d || 0) > 0 && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-medium text-amber-700">Delegation pattern this week</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              You named delegation as your intention {trends.delegation_intent_count_7d}x this week.
              {trends.delegation_gap_count_7d > 0 && (
                ` On ${trends.delegation_gap_count_7d} of those days, your signals suggested operator mode instead.`
              )}
            </p>
            <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full inline-block">
              From your morning intentions + work rhythm
            </span>
          </div>
        )}

        {/* Open Atreus */}
        {onOpenAtreus && hasEnoughData && (
          <button
            onClick={() => onOpenAtreus("I'd like to talk through what you've been noticing about my patterns.")}
            className="w-full flex items-center justify-center gap-2 text-xs text-[#0202ff] font-medium pt-1 hover:underline"
          >
            <Brain className="w-3.5 h-3.5" />
            Talk through this with Atreus →
          </button>
        )}
      </CardContent>
    </Card>
  );
}