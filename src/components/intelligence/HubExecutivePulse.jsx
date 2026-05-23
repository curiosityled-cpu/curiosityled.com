import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Layers, Shield, Database, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Top Executive Pulse — 4 headline scorecards + priority alert rail
 * Summary-first: what needs attention now.
 */
export default function HubExecutivePulse({ metrics, assessments = [], workforceMetrics = [], onScrollTo }) {
  const [expandedAlert, setExpandedAlert] = useState(null);

  const meIndex = Math.round(
    metrics.competencyAverages.dm * 0.35 +
    metrics.competencyAverages.si * 0.30 +
    metrics.competencyAverages.comm * 0.20 +
    metrics.competencyAverages.pm * 0.15
  );

  const hasWorkforceData = workforceMetrics?.length > 0;
  const hasEngagementData = hasWorkforceData && workforceMetrics[0]?.enps_score != null;

  const benchCoverage = assessments.length > 0
    ? Math.round(((assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 70).length) / assessments.length) * 100)
    : null;

  const dataConfidenceParts = [
    assessments.length > 0 ? "capability" : null,
    metrics.totalGoals > 0 ? "execution" : null,
    metrics.totalJourneys > 0 ? "development" : null,
    hasWorkforceData ? "workforce" : null,
    hasEngagementData ? "engagement" : null,
  ].filter(Boolean);
  const dataConfidencePct = Math.round((dataConfidenceParts.length / 5) * 100);

  const scorecards = [
    {
      id: "health",
      icon: Shield,
      iconColor: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-200",
      valueBg: "text-indigo-700",
      label: "Leadership Health",
      value: meIndex > 0 ? `${meIndex}%` : "—",
      trend: meIndex >= 70 ? "strong" : meIndex >= 55 ? "moderate" : "low",
      trendColors: { strong: "text-emerald-600", moderate: "text-amber-600", low: "text-red-600" },
      trendLabels: { strong: "Strong", moderate: "Building", low: "Needs attention" },
      scrollTo: "org-health",
    },
    {
      id: "risk",
      icon: AlertTriangle,
      iconColor: "text-red-600",
      bg: metrics.atRiskLeaders > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200",
      valueBg: metrics.atRiskLeaders > 0 ? "text-red-700" : "text-emerald-700",
      label: "Immediate Risk",
      value: metrics.atRiskLeaders > 0 ? metrics.atRiskLeaders : "0",
      trend: metrics.atRiskLeaders > 3 ? "high" : metrics.atRiskLeaders > 0 ? "medium" : "none",
      trendColors: { high: "text-red-600", medium: "text-amber-600", none: "text-emerald-600" },
      trendLabels: { high: "High risk", medium: "Monitor", none: "Clear" },
      scrollTo: "org-health",
    },
    {
      id: "succession",
      icon: Layers,
      iconColor: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
      valueBg: "text-purple-700",
      label: "Succession Coverage",
      value: benchCoverage !== null ? `${benchCoverage}%` : "—",
      trend: benchCoverage !== null ? (benchCoverage >= 40 ? "strong" : benchCoverage >= 20 ? "moderate" : "low") : "no-data",
      trendColors: { strong: "text-emerald-600", moderate: "text-amber-600", low: "text-red-600", "no-data": "text-gray-400" },
      trendLabels: { strong: "Solid bench", moderate: "Building", low: "Thin bench", "no-data": "No data" },
      scrollTo: "talent-pipeline",
    },
    {
      id: "confidence",
      icon: Database,
      iconColor: "text-slate-600",
      bg: dataConfidencePct >= 60 ? "bg-slate-50 border-slate-200" : "bg-amber-50 border-amber-200",
      valueBg: dataConfidencePct >= 60 ? "text-slate-700" : "text-amber-700",
      label: "Data Confidence",
      value: `${dataConfidencePct}%`,
      trend: dataConfidencePct >= 60 ? "good" : "partial",
      trendColors: { good: "text-slate-600", partial: "text-amber-600" },
      trendLabels: { good: "Directional", partial: "Partial data" },
    },
  ];

  // Priority alerts
  const alerts = [
    metrics.atRiskLeaders > 0 && {
      id: "at-risk",
      label: `${metrics.atRiskLeaders} at-risk leader${metrics.atRiskLeaders > 1 ? "s" : ""}`,
      color: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
      dot: "bg-red-500",
      detail: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders > 1 ? "s are" : " is"} scoring below 60% on capability assessments. Recommend immediate coaching review.`,
      scrollTo: "org-health",
    },
    benchCoverage !== null && benchCoverage < 30 && {
      id: "thin-bench",
      label: "Thin succession bench",
      color: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
      dot: "bg-amber-500",
      detail: `Only ${benchCoverage}% of assessed leaders are at 70%+ readiness. Succession planning may be underprepared for leadership transitions.`,
      scrollTo: "talent-pipeline",
    },
    metrics.learningCompletionRate < 50 && metrics.totalLearning > 0 && {
      id: "learning-low",
      label: "Learning velocity low",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      dot: "bg-yellow-500",
      detail: `Learning completion at ${metrics.learningCompletionRate}%. Consider reviewing assignment relevance or removing blockers.`,
      scrollTo: "org-health",
    },
    !hasEngagementData && {
      id: "engagement-unconnected",
      label: "Engagement not connected",
      color: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
      dot: "bg-slate-400",
      detail: "Employee sentiment data is not yet connected. Upload eNPS/engagement survey results to enable this signal.",
      scrollTo: "engagement",
    },
    metrics.highPotentialLeaders > 0 && {
      id: "high-potential",
      label: `${metrics.highPotentialLeaders} high-potential${metrics.highPotentialLeaders > 1 ? "s" : ""} identified`,
      color: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
      dot: "bg-emerald-500",
      detail: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders > 1 ? "s are" : " is"} scoring 85%+ on capability. Recommend advancement consideration.`,
      scrollTo: "talent-pipeline",
    },
  ].filter(Boolean);

  // One-line interpretations per card
  const interpretations = {
    health: meIndex >= 70 ? `Strong performance across ${metrics.totalAssessments} assessed leaders.`
      : meIndex >= 55 ? `Building — targeted development recommended.`
      : meIndex > 0 ? `Needs attention — coaching review advised.`
      : "No assessment data connected yet.",
    risk: metrics.atRiskLeaders > 3 ? `High — ${metrics.atRiskLeaders} leaders require manager review this cycle.`
      : metrics.atRiskLeaders > 0 ? `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders > 1 ? "s" : ""} flagged — monitor and review.`
      : "No leaders below threshold. Continue monitoring.",
    succession: benchCoverage === null ? "No assessment data to estimate coverage."
      : benchCoverage >= 40 ? `Coverage solid — mostly ready-soon cohort.`
      : benchCoverage >= 20 ? `Building bench. Review ready-soon pipeline.`
      : "Thin bench. Succession planning needs attention.",
    confidence: dataConfidencePct >= 60 ? `${dataConfidenceParts.join(", ")} connected.`
      : dataConfidenceParts.length === 1 ? `Platform-native only; HRIS and engagement not connected.`
      : `Missing: ${["capability","execution","development","workforce","engagement"].filter(s => !dataConfidenceParts.includes(s)).join(", ")}.`,
  };

  return (
    <div className="space-y-4">
      {/* Scorecard row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {scorecards.map((card) => {
          const Icon = card.icon;
          const trendLabel = card.trendLabels[card.trend] || "";
          const trendColor = card.trendColors[card.trend] || "text-gray-500";
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => card.scrollTo && onScrollTo?.(card.scrollTo)}
              className={`rounded-xl border p-4 ${card.bg} ${card.scrollTo ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
                <span className={`text-[11px] font-medium ${trendColor}`}>{trendLabel}</span>
              </div>
              <div className={`text-2xl font-bold ${card.valueBg}`}>{card.value}</div>
              <div className="text-xs font-medium text-gray-700 mt-0.5">{card.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{interpretations[card.id]}</div>
              {card.scrollTo && <div className="text-[10px] text-indigo-500 mt-1.5 font-medium">View section →</div>}
            </motion.div>
          );
        })}
      </div>

      {/* Priority rail */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Priority Areas</p>
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="relative">
                <button
                  onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${alert.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.dot}`} />
                  {alert.label}
                  {expandedAlert === alert.id
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                  }
                </button>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {expandedAlert && (() => {
              const alert = alerts.find(a => a.id === expandedAlert);
              if (!alert) return null;
              return (
                <motion.div
                  key={expandedAlert}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 leading-relaxed flex items-start justify-between gap-3">
                    <p>{alert.detail}</p>
                    {onScrollTo && (
                      <button
                        onClick={() => { onScrollTo(alert.scrollTo); setExpandedAlert(null); }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap flex-shrink-0"
                      >
                        View section →
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}