import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * EnterpriseExecutiveSummary — concise narrative card at the top of the
 * Enterprise lens. Answers four questions for a CPO/CEO audience:
 *  1. What changed?
 *  2. How confident are we in the evidence?
 * 3. What is the relevant organizational context?
 * 4. What should leadership examine or try next?
 *
 * Provenance-aware: every claim cites its supporting signal and sample size.
 * Never asserts causation; describes associations as directional context.
 */
export default function EnterpriseExecutiveSummary({
  metrics,
  assessments,
  workforceMetrics,
  pulseAggregates,
  dataConfidence,
  activeLifecycleStage,
  onScrollTo,
}) {
  // ── Derive narrative inputs ──────────────────────────────────────────────
  const assessmentCount = assessments.length;
  const hasCapabilityData = assessmentCount > 0;
  const hasWellbeingData = pulseAggregates && !pulseAggregates.suppressed && pulseAggregates.meta;
  const hasWorkforceData = workforceMetrics?.length > 0;
  const hasEngagementData = hasWorkforceData && workforceMetrics[0]?.enps_score != null;

  // Capability narrative
  const meIndex = hasCapabilityData
    ? Math.round(
        metrics.competencyAverages.dm * 0.35 +
          metrics.competencyAverages.si * 0.30 +
          metrics.competencyAverages.comm * 0.20 +
          metrics.competencyAverages.pm * 0.15
      )
    : null;

  const capabilityTrend = meIndex !== null
    ? meIndex >= 75 ? { dir: "up", label: "above benchmark" }
    : meIndex >= 65 ? { dir: "neutral", label: "building toward benchmark" }
    : { dir: "down", label: "below benchmark threshold" }
    : null;

  // Wellbeing narrative
  const wellbeingTrend = hasWellbeingData
    ? (() => {
        const energyDist = pulseAggregates.energy?.distribution || {};
        const declining = (energyDist.declining || 0) + (energyDist.insufficient_data || 0);
        const improving = energyDist.improving || 0;
        const stable = energyDist.stable || 0;
        if (improving > stable && improving > declining) return { dir: "up", label: "improving" };
        if (declining > improving && declining > stable) return { dir: "down", label: "under pressure" };
        return { dir: "neutral", label: "stable" };
      })()
    : null;

  // ── Build the four narrative blocks ─────────────────────────────────────
  const blocks = [];

  // 1. What changed
  if (hasCapabilityData) {
    blocks.push({
      icon: capabilityTrend.dir === "up" ? TrendingUp : capabilityTrend.dir === "down" ? TrendingDown : Minus,
      iconColor: capabilityTrend.dir === "up" ? "text-emerald-600" : capabilityTrend.dir === "down" ? "text-red-500" : "text-amber-600",
      label: "What changed",
      body: `Leadership capability averages ${meIndex}% ME Index — ${capabilityTrend.label}. ${metrics.atRiskLeaders > 0 ? `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? "s" : ""} score below 60%, warranting coaching review. ` : ""}${metrics.highPotentialLeaders > 0 ? `${metrics.highPotentialLeaders} high-potential leader${metrics.highPotentialLeaders !== 1 ? "s" : ""} identified at 85%+. ` : ""}Based on ${assessmentCount} assessment${assessmentCount !== 1 ? "s" : ""}.`,
    });
  } else {
    blocks.push({
      icon: Info,
      iconColor: "text-gray-400",
      label: "What changed",
      body: "No assessment data yet. Run leadership assessments to populate capability insights. In the meantime, manager wellbeing signals may still be available below.",
    });
  }

  // 2. Evidence & confidence
  const confidenceParts = [
    { label: "Capability", connected: hasCapabilityData, sample: assessmentCount },
    { label: "Wellbeing", connected: hasWellbeingData, sample: pulseAggregates?.meta?.total_managers || 0 },
    { label: "Workforce", connected: hasWorkforceData, sample: workforceMetrics?.length || 0 },
    { label: "Engagement", connected: hasEngagementData, sample: hasEngagementData ? 1 : 0 },
  ];
  const connectedCount = confidenceParts.filter((p) => p.connected).length;
  const confidenceLabel =
    connectedCount >= 3 ? "Decision-ready" : connectedCount >= 1 ? "Directional only" : "Insufficient data";

  blocks.push({
    icon: Shield,
    iconColor: connectedCount >= 3 ? "text-emerald-600" : connectedCount >= 1 ? "text-amber-600" : "text-red-500",
    label: "Evidence & confidence",
    body: `${confidenceLabel} — ${connectedCount} of 4 signal domains connected: ${confidenceParts.filter((p) => p.connected).map((p) => p.label).join(", ") || "none yet"}. ${assessmentCount < 5 ? "Capability findings are directional with a small sample. " : ""}${hasWellbeingData ? `Wellbeing covers ${pulseAggregates?.meta?.total_managers ?? 0} managers (min group size ${pulseAggregates?.meta?.minimum_group_size || 5}). ` : ""}Treat all findings as context for investigation, not definitive conclusions.`,
  });

  // 3. Organizational context
  if (hasWellbeingData || hasWorkforceData) {
    const contextParts = [];
    if (wellbeingTrend) {
      contextParts.push(`Manager wellbeing is ${wellbeingTrend.label} (energy trend, ${pulseAggregates?.meta?.total_managers ?? 0} managers)`);
    }
    if (hasWorkforceData) {
      const w = workforceMetrics[0];
      contextParts.push(`Workforce: ${w.turnover_rate != null ? `${w.turnover_rate}% turnover` : "turnover data connected"}`);
    }
    blocks.push({
      icon: Info,
      iconColor: "text-blue-500",
      label: "Organizational context",
      body: `${contextParts.join(". ")}. These are associations, not proven causes — they suggest where to look, not what to conclude.`,
    });
  }

  // 4. What to examine next
  const prompts = [];
  if (metrics.atRiskLeaders > 0) prompts.push(`Review the ${metrics.atRiskLeaders} at-risk leader${metrics.atRiskLeaders !== 1 ? "s" : ""} for coaching support`);
  if (wellbeingTrend?.dir === "down") prompts.push("Investigate workload and support conditions behind the declining wellbeing signal");
  if (meIndex !== null && meIndex < 70) prompts.push("Prioritise Decision Making and Situational Intelligence development — primary ME drivers");
  if (hasCapabilityData && assessmentCount < 5) prompts.push("Expand assessment coverage to strengthen confidence in these findings");
  if (prompts.length === 0) prompts.push("Sustain current strengths and monitor for emerging pressure points");

  blocks.push({
    icon: ArrowRight,
    iconColor: "text-[#0202ff]",
    label: "What to examine next",
    body: prompts.join(". ") + ".",
  });

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Executive Summary</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                A concise readout for leadership — what changed, evidence, context, and next steps
              </p>
            </div>
            <Badge
              className={`text-[11px] border ${
                connectedCount >= 3
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : connectedCount >= 1
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {confidenceLabel}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blocks.map((block, idx) => {
              const Icon = block.icon;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${block.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                      {block.label}
                    </p>
                    <p className="text-xs text-gray-700 leading-relaxed">{block.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy boundary — always visible */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2">
            <Shield className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Wellbeing signals are aggregate and anonymised (Category B). No individual manager data is shown.
              These signals support organisational planning and development conversations — not performance
              evaluation or employment decisions.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}