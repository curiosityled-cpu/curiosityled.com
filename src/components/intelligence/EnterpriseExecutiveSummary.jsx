import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  AlertTriangle,
  Info,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * EnterpriseExecutiveSummary — the single consolidated executive briefing
 * for the Enterprise lens. Combines the former standalone "Executive Summary"
 * (what changed / evidence / context / next steps) with the former in-card
 * "Executive AI Briefing" (AI synthesis + risks + opportunities).
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
  executiveBriefing,
  generatingBriefing,
  generatingAll,
  onRefreshBriefing,
  strategicRisks,
  strategicOpportunities,
  onPromptAtreus,
}) {
  const [showFullBriefing, setShowFullBriefing] = useState(false);

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

  // ── Risks & opportunities (from AI synthesis, with fallbacks) ────────────
  const allRisks = strategicRisks?.length > 0 ? strategicRisks : (() => {
    const derived = [];
    if (metrics.atRiskLeaders > 0) derived.push({ title: "Leaders Below Performance Threshold", description: `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? "s are" : " is"} scoring below 60%.`, severity: "High" });
    if (metrics.competencyAverages.dm < 65) derived.push({ title: "Decision-Making Gap Detected", description: `Org-wide DM average is ${metrics.competencyAverages.dm}%, below the 65% target.`, severity: "Medium" });
    return derived.slice(0, 3);
  })();

  const allOpps = strategicOpportunities?.length > 0 ? strategicOpportunities : (() => {
    const derived = [];
    if (metrics.highPotentialLeaders > 0) derived.push({ title: "High-Potential Leaders Ready for Advancement", description: `${metrics.highPotentialLeaders} leader${metrics.highPotentialLeaders !== 1 ? "s are" : " is"} scoring 85%+.`, potential: "High" });
    if (metrics.competencyAverages.comm >= 70) derived.push({ title: "Communication Strength to Leverage", description: `Communication averages ${metrics.competencyAverages.comm}% — above target.`, potential: "Medium" });
    return derived.slice(0, 3);
  })();

  const hasRisksOpps = allRisks.length > 0 || allOpps.length > 0;
  const briefingPreview = executiveBriefing ? executiveBriefing.split("\n\n")[0] : "";

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
        <CardContent className="px-5 py-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900">Executive Briefing</h3>
                <Badge className="text-[10px] border bg-purple-100 text-purple-700 border-purple-200 flex-shrink-0">AI synthesis</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                A concise readout for leadership — what changed, evidence, context, and next steps
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
              {onRefreshBriefing && (
                <button
                  onClick={onRefreshBriefing}
                  disabled={generatingAll}
                  className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
                  title="Regenerate AI briefing"
                >
                  {generatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* AI Strategic Context — featured narrative */}
          <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
            {generatingBriefing && !executiveBriefing ? (
              <div className="flex items-center gap-2 text-purple-600 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Generating strategic briefing…
              </div>
            ) : executiveBriefing ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />Strategic Context
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {showFullBriefing ? executiveBriefing : briefingPreview}
                </p>
                {executiveBriefing.length > briefingPreview.length && (
                  <button
                    onClick={() => setShowFullBriefing((v) => !v)}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    {showFullBriefing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showFullBriefing ? "Show less" : "Read full briefing"}
                  </button>
                )}
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  AI-generated synthesis from {metrics.totalAssessments} assessments, {metrics.totalGoals} goals, {metrics.totalLearning} learning records. Intended for development conversation prep — not sole decision criteria.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                No briefing generated yet. {onRefreshBriefing ? "Click the refresh icon above to generate a strategic briefing from your data." : ""}
              </p>
            )}
          </div>

          {/* Four narrative blocks */}
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

          {/* Risks & Opportunities */}
          {hasRisksOpps && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allRisks.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-red-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />Top Risks
                    </p>
                    <div className="space-y-1.5">
                      {allRisks.map((risk, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-2.5 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                          onClick={() => onPromptAtreus?.(`Strategic risk: "${risk.title}". ${risk.description || ""} Help me develop an action plan.`)}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">{risk.severity}</Badge>
                            <span className="text-xs font-semibold text-red-800 line-clamp-1">{risk.title}</span>
                          </div>
                          {risk.description && <p className="text-[10px] text-red-600 line-clamp-1">{risk.description}</p>}
                          <p className="text-[10px] text-red-400 mt-0.5">Ask Atreus →</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {allOpps.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />Top Opportunities
                    </p>
                    <div className="space-y-1.5">
                      {allOpps.map((opp, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                          onClick={() => onPromptAtreus?.(`Strategic opportunity: "${opp.title}". ${opp.description || ""} Help me create a plan.`)}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">{opp.potential}</Badge>
                            <span className="text-xs font-semibold text-emerald-800 line-clamp-1">{opp.title}</span>
                          </div>
                          {opp.description && <p className="text-[10px] text-emerald-600 line-clamp-1">{opp.description}</p>}
                          <p className="text-[10px] text-emerald-400 mt-0.5">Ask Atreus →</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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