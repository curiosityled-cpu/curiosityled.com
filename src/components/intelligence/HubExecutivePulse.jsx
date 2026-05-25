import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Layers, Shield, Database, ChevronDown, ChevronRight, TrendingUp, TrendingDown, ArrowRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Top Executive Pulse — 4 headline scorecards + priority alert rail
 * Each card has a one-line interpretation and a clear trend delta.
 * Priority chips are active controls: clicking them scrolls AND highlights.
 */
export default function HubExecutivePulse({ metrics, assessments = [], workforceMetrics = [], onScrollTo }) {
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [openHowMeasuredTop, setOpenHowMeasuredTop] = useState(null);

  const meIndex = Math.round(
    metrics.competencyAverages.dm * 0.35 +
    metrics.competencyAverages.si * 0.30 +
    metrics.competencyAverages.comm * 0.20 +
    metrics.competencyAverages.pm * 0.15
  );

  const hasWorkforceData = workforceMetrics?.length > 0;
  const hasEngagementData = hasWorkforceData && workforceMetrics[0]?.enps_score != null;

  const readyNowCount = assessments.filter(a => (a.overall_pct ?? a.data?.overall_pct ?? 0) >= 85).length;
  const readySoonCount = assessments.filter(a => { const s = a.overall_pct ?? a.data?.overall_pct ?? 0; return s >= 70 && s < 85; }).length;
  const benchCoverage = assessments.length > 0
    ? Math.round(((readyNowCount + readySoonCount * 0.5) / assessments.length) * 100)
    : null;

  const dataConnected = [
    assessments.length > 0,
    metrics.totalGoals > 0,
    metrics.totalJourneys > 0,
    hasWorkforceData,
    hasEngagementData,
  ];
  const dataConfidencePct = Math.round((dataConnected.filter(Boolean).length / 5) * 100);
  const connectedSignals = ["Capability", "Execution", "Development", "Workforce", "Engagement"].filter((_, i) => dataConnected[i]);

  // One-line interpretations
  const meInterpretation =
    meIndex >= 80 ? "Strong — above benchmark" :
    meIndex >= 65 ? "Building — targeted coaching recommended" :
                    "Needs attention — review urgently";

  const riskInterpretation =
    metrics.atRiskLeaders > 3 ? `${metrics.atRiskLeaders} require immediate manager review` :
    metrics.atRiskLeaders > 0 ? `${metrics.atRiskLeaders} require${metrics.atRiskLeaders === 1 ? "s" : ""} manager review this cycle` :
                                 "All leaders above performance threshold";

  const successionInterpretation =
    benchCoverage === null ? "No assessment data available" :
    benchCoverage >= 40 ? `${readyNowCount} ready now, ${readySoonCount} ready soon` :
    benchCoverage >= 20 ? "Coverage building — accelerate ready-soon cohort" :
                          "Thin bench — prioritise succession slate review";

  const confidenceInterpretation =
    dataConfidencePct >= 80 ? "Full platform signals connected" :
    dataConfidencePct >= 40 ? `Platform-native only — ${5 - connectedSignals.length} signal${5 - connectedSignals.length > 1 ? "s" : ""} not connected` :
                               "Limited data — connect HRIS and engagement for full picture";

  const scorecards = [
    {
      id: "health",
      icon: Shield,
      iconColor: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-200",
      valueBg: "text-indigo-700",
      label: "Leadership Health",
      value: meIndex > 0 ? `${meIndex}%` : "—",
      sub: "Manager Effectiveness Index",
      interpretation: meInterpretation,
      howMeasured: "Weighted average of capability scores across assessed leaders: Decision Making (35%), Situational Intelligence (30%), Communication (20%), Performance Management (15%).",
      trend: meIndex >= 70 ? "up" : "down",
      trendColor: meIndex >= 70 ? "text-emerald-600" : "text-red-500",
      scrollTo: "org-health",
      size: "large",
    },
    {
      id: "risk",
      icon: AlertTriangle,
      iconColor: metrics.atRiskLeaders > 0 ? "text-red-600" : "text-emerald-600",
      bg: metrics.atRiskLeaders > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200",
      valueBg: metrics.atRiskLeaders > 0 ? "text-red-700" : "text-emerald-700",
      label: "Immediate Risk",
      value: String(metrics.atRiskLeaders),
      sub: "leaders requiring review this cycle",
      interpretation: riskInterpretation,
      howMeasured: "Leaders with capability assessment scores below 60%, indicating a need for targeted coaching or manager review. Not an employment risk classification.",
      trend: metrics.atRiskLeaders === 0 ? "up" : "down",
      trendColor: metrics.atRiskLeaders === 0 ? "text-emerald-600" : "text-red-500",
      scrollTo: "org-health",
      size: "normal",
    },
    {
      id: "succession",
      icon: Layers,
      iconColor: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
      valueBg: "text-purple-700",
      label: "Succession Coverage",
      value: benchCoverage !== null ? `${benchCoverage}%` : "—",
      sub: `weighted bench score · ${assessments.length} assessed leaders`,
      interpretation: successionInterpretation,
      howMeasured: `Weighted formula: Ready Now leaders count fully (85%+ score), Ready Soon leaders count at 50% weight (70–84%). Denominator is all assessed leaders (${assessments.length}). Based on assessed leaders only — does not reflect unassessed population.`,
      trend: benchCoverage !== null && benchCoverage >= 30 ? "up" : "down",
      trendColor: benchCoverage !== null && benchCoverage >= 30 ? "text-emerald-600" : "text-amber-600",
      scrollTo: "talent-pipeline",
      size: "normal",
    },
    {
      id: "confidence",
      icon: Database,
      iconColor: "text-slate-500",
      bg: "bg-slate-50 border-slate-200",
      valueBg: dataConfidencePct >= 60 ? "text-slate-600" : "text-slate-500",
      label: "Data Confidence",
      value: `${dataConfidencePct}%`,
      sub: `${connectedSignals.length} of 5 signals active`,
      interpretation: confidenceInterpretation,
      howMeasured: `Hub-wide signal coverage: ${connectedSignals.length > 0 ? connectedSignals.join(", ") + " connected." : "No signals connected yet."} Missing: ${["Capability","Execution","Development","Workforce","Engagement"].filter((_,i) => !dataConnected[i]).join(", ") || "none"}. Low confidence means all metrics should be treated as directional only.`,
      trend: dataConfidencePct >= 60 ? "up" : "neutral",
      trendColor: "text-slate-400",
      scrollTo: "workforce",
      size: "quiet",
    },
  ];

  // Priority alerts
  const alerts = [
    metrics.atRiskLeaders > 0 && {
      id: "at-risk",
      label: `${metrics.atRiskLeaders} at-risk leader${metrics.atRiskLeaders > 1 ? "s" : ""}`,
      color: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
      activeColor: "bg-red-200 border-red-300",
      dot: "bg-red-500",
      detail: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders > 1 ? "s are" : " is"} scoring below 60% on capability assessments. Recommend immediate coaching review.`,
      action: "View in Leadership Health →",
      scrollTo: "org-health",
    },
    benchCoverage !== null && benchCoverage < 30 && {
      id: "thin-bench",
      label: "Thin succession bench",
      color: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
      activeColor: "bg-amber-200 border-amber-300",
      dot: "bg-amber-500",
      detail: `Only ${benchCoverage}% weighted bench coverage. Prioritise the ready-soon cohort through stretch assignments and leadership validation.`,
      action: "View Talent Pipeline →",
      scrollTo: "talent-pipeline",
    },
    metrics.learningCompletionRate < 50 && metrics.totalLearning > 0 && {
      id: "learning-low",
      label: "Learning velocity low",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
      activeColor: "bg-yellow-200 border-yellow-300",
      dot: "bg-yellow-500",
      detail: `Learning completion at ${metrics.learningCompletionRate}%. Review assignment relevance or remove blockers.`,
      action: "View in Leadership Health →",
      scrollTo: "org-health",
    },
    !hasEngagementData && {
      id: "engagement-unconnected",
      label: "Engagement not connected",
      color: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
      activeColor: "bg-slate-200 border-slate-300",
      dot: "bg-slate-400",
      detail: "Employee sentiment data is not yet connected. Upload eNPS/engagement survey results to enable this signal.",
      action: "View connection module →",
      scrollTo: "engagement",
    },
    metrics.highPotentialLeaders > 0 && {
      id: "high-potential",
      label: `${metrics.highPotentialLeaders} high-potential${metrics.highPotentialLeaders > 1 ? "s" : ""} identified`,
      color: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
      activeColor: "bg-emerald-200 border-emerald-300",
      dot: "bg-emerald-500",
      detail: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders > 1 ? "s are" : " is"} scoring 85%+ on capability. Recommend advancement consideration and stretch assignment.`,
      action: "View Talent Pipeline →",
      scrollTo: "talent-pipeline",
    },
  ].filter(Boolean);

  const handleAlertClick = (alert) => {
    setExpandedAlert(prev => prev === alert.id ? null : alert.id);
  };

  return (
    <div className="space-y-4">
      {/* Scorecard row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {scorecards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === "up" ? TrendingUp : card.trend === "down" ? TrendingDown : null;
          const isQuiet = card.size === "quiet";
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-4 text-left transition-all relative group ${card.bg} ${isQuiet ? "opacity-80" : ""}`}
            >
              <button
                onClick={() => onScrollTo?.(card.scrollTo)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${card.iconColor}`} />
                  {TrendIcon && !isQuiet && <TrendIcon className={`w-3.5 h-3.5 ${card.trendColor}`} />}
                </div>
                <div className={`${isQuiet ? "text-xl" : "text-2xl"} font-bold ${card.valueBg}`}>{card.value}</div>
                <div className={`${isQuiet ? "text-[11px] text-gray-500" : "text-xs font-medium text-gray-700"} mt-0.5`}>{card.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{card.interpretation}</div>
                <div className="text-[11px] text-gray-400 mt-1 leading-snug">{card.sub}</div>
              </button>
              {/* How measured */}
              <button
                onClick={(e) => { e.stopPropagation(); setOpenHowMeasuredTop(prev => prev === card.id ? null : card.id); }}
                className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Info className="w-2.5 h-2.5" />
                How measured
              </button>
              <AnimatePresence>
                {openHowMeasuredTop === card.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-2.5 bg-white border border-gray-200 rounded-lg text-[10px] text-gray-600 leading-relaxed shadow-sm">
                      {card.howMeasured}
                      <button onClick={() => setOpenHowMeasuredTop(null)} className="block mt-1 text-gray-400 hover:text-gray-600">Close ×</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Priority rail */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Priority Areas</p>
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  expandedAlert === alert.id ? alert.activeColor : alert.color
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.dot}`} />
                {alert.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${expandedAlert === alert.id ? "rotate-180" : ""}`} />
              </button>
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
                  <div className="mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 leading-relaxed flex items-start justify-between gap-3 shadow-sm">
                    <p>{alert.detail}</p>
                    {onScrollTo && (
                      <button
                        onClick={() => { onScrollTo(alert.scrollTo); setExpandedAlert(null); }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                      >
                        {alert.action}
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