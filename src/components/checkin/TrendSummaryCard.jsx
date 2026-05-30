/**
 * TrendSummaryCard — private manager behavioral rhythm card.
 *
 * Shows longitudinal pattern memory from ManagerTrends.
 * Manager-private only. Evidence-labeled. Non-diagnostic language.
 *
 * Evidence labels:
 *   "From your recent check-ins" — self-report fields
 *   "From your recent work rhythm" — calendar/activity signals
 *   "Atreus interpretation" — LLM-generated narrative
 */
import React from "react";
import { TrendingUp, TrendingDown, Minus, Info, Brain, Calendar, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SIEnrichedNarrative from "@/components/intelligence/SIEnrichedNarrative";

const TREND_CONFIG = {
  improving: { label: "Trending up", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  stable: { label: "Holding steady", icon: Minus, color: "text-gray-500", bg: "bg-gray-50" },
  declining: { label: "Worth watching", icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50" },
  insufficient_data: { label: "Building picture", icon: Info, color: "text-gray-400", bg: "bg-gray-50" },
};

function EvidenceTag({ type }) {
  const tags = {
    checkin: { label: "From your recent check-ins", icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
    rhythm: { label: "From your recent work rhythm", icon: Calendar, color: "bg-purple-50 text-purple-600" },
    atreus: { label: "Atreus interpretation", icon: Brain, color: "bg-[#0202ff]/8 text-[#0202ff]" },
  };
  const t = tags[type] || tags.checkin;
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${t.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {t.label}
    </span>
  );
}

function TrendPill({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG.insufficient_data;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function TrendSummaryCard({ trends, onOpenAtreus }) {
  if (!trends || trends.data_points_14d < 3) {
    return (
      <Card className="shadow-sm border border-dashed border-gray-200 bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
              <Brain className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700 mb-0.5">Your rhythm is building</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pattern memory develops with regular check-ins. After 3 or more check-ins, Atreus will begin surfacing observations about your leadership rhythm here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const energyOk = trends.energy_trend && trends.energy_trend !== 'insufficient_data';
  const confidenceOk = trends.confidence_trend && trends.confidence_trend !== 'insufficient_data';
  const stretchHeavy = (trends.stretch_frequency_14d || 0) >= 5;

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff]/8 border border-[#0202ff]/12 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">What Atreus is noticing</p>
            <p className="text-[10px] text-gray-400">Last {trends.data_points_14d} check-ins · Private to you</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-400">Private</Badge>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">

        {/* Trend narrative — SI-enriched */}
        <SIEnrichedNarrative trends={trends} baseNarrative={trends.trend_narrative} />

        {/* 7-day summary */}
        {trends.summary_7d && trends.summary_7d !== 'Not enough signal for a 7-day summary yet.' && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs text-gray-500 leading-relaxed">{trends.summary_7d}</p>
            <EvidenceTag type="checkin" />
          </div>
        )}

        {/* Trend signals row */}
        {(energyOk || confidenceOk) && (
          <div className="grid grid-cols-2 gap-2">
            {energyOk && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="text-[10px] text-gray-400 font-medium">Energy (14 days)</p>
                <TrendPill trend={trends.energy_trend} />
                <EvidenceTag type="checkin" />
              </div>
            )}
            {confidenceOk && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="text-[10px] text-gray-400 font-medium">Confidence (14 days)</p>
                <TrendPill trend={trends.confidence_trend} />
                <EvidenceTag type="checkin" />
              </div>
            )}
          </div>
        )}

        {/* Stretch observation */}
        {stretchHeavy && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-amber-800 leading-relaxed">
                You've reported feeling stretched or drained in {trends.stretch_frequency_14d} of your last {trends.data_points_14d} check-ins. That's a pattern worth noticing.
              </p>
              <EvidenceTag type="checkin" />
            </div>
          </div>
        )}

        {/* CTA */}
        {onOpenAtreus && (
          <button
            onClick={() => onOpenAtreus("I want to understand the patterns Atreus has noticed about my leadership rhythm lately.")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#0202ff]/20 text-xs font-medium text-[#0202ff] hover:bg-[#0202ff]/5 transition-colors"
          >
            <Brain className="w-3.5 h-3.5" />
            Talk through this with Atreus
          </button>
        )}
      </CardContent>
    </Card>
  );
}