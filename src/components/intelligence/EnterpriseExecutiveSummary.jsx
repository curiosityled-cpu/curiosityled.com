import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Shield,
  AlertTriangle,
  Info,
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

  // ── Evidence & confidence ───────────────────────────────────────────────
  const confidenceParts = [
    { label: "Capability", connected: hasCapabilityData, sample: assessmentCount },
    { label: "Wellbeing", connected: hasWellbeingData, sample: pulseAggregates?.meta?.total_managers || 0 },
    { label: "Workforce", connected: hasWorkforceData, sample: workforceMetrics?.length || 0 },
    { label: "Engagement", connected: hasEngagementData, sample: hasEngagementData ? 1 : 0 },
  ];
  const connectedCount = confidenceParts.filter((p) => p.connected).length;
  const confidenceLabel =
    connectedCount >= 3 ? "Decision-ready" : connectedCount >= 1 ? "Directional only" : "Insufficient data";

  // ── TL;DR derivations ───────────────────────────────────────────────────
  const headline = hasCapabilityData
    ? `Leadership capability ${capabilityTrend.label} at ${meIndex}% ME Index`
    : "No assessment data yet — run leadership assessments to populate insights";

  const callouts = [];
  if (meIndex !== null) {
    callouts.push({
      label: "ME Index",
      value: `${meIndex}%`,
      tone: capabilityTrend.dir === "up" ? "up" : capabilityTrend.dir === "down" ? "down" : "neutral",
      hint: capabilityTrend.label,
    });
  }
  callouts.push({
    label: "At-risk leaders",
    value: metrics.atRiskLeaders,
    tone: metrics.atRiskLeaders > 0 ? "down" : "neutral",
    hint: "below 60%",
  });
  callouts.push({
    label: "High-potential",
    value: metrics.highPotentialLeaders,
    tone: metrics.highPotentialLeaders > 0 ? "up" : "neutral",
    hint: "85%+",
  });
  callouts.push({
    label: "Assessments",
    value: assessmentCount,
    tone: "neutral",
    hint: assessmentCount < 5 ? "small sample" : "sample",
  });
  if (hasWellbeingData) {
    callouts.push({
      label: "Wellbeing managers",
      value: pulseAggregates?.meta?.total_managers ?? 0,
      tone: "neutral",
      hint: "energy trend",
    });
  }

  const tldrBullets = [];
  if (hasCapabilityData) {
    tldrBullets.push(`ME Index ${meIndex}% — ${capabilityTrend.label} (DM 35% · SI 30% · Comm 20% · PM 15%).`);
  }
  if (metrics.atRiskLeaders > 0) tldrBullets.push(`${metrics.atRiskLeaders} at-risk leader${metrics.atRiskLeaders !== 1 ? "s" : ""} below 60% — coaching review warranted.`);
  if (metrics.highPotentialLeaders > 0) tldrBullets.push(`${metrics.highPotentialLeaders} high-potential leader${metrics.highPotentialLeaders !== 1 ? "s" : ""} at 85%+ — ready for stretch.`);
  if (wellbeingTrend) tldrBullets.push(`Manager wellbeing is ${wellbeingTrend.label}.`);
  if (hasWorkforceData) {
    const w = workforceMetrics[0];
    tldrBullets.push(w.turnover_rate != null ? `Workforce turnover at ${w.turnover_rate}%.` : "Workforce data connected.");
  }
  if (hasCapabilityData && assessmentCount < 5) tldrBullets.push("Small sample — findings are directional.");
  if (tldrBullets.length === 0) tldrBullets.push("Sustain current strengths and monitor for emerging pressure points.");

  const compactParagraph = hasCapabilityData
    ? `Based on ${assessmentCount} assessment${assessmentCount !== 1 ? "s" : ""}, leadership capability averages ${meIndex}% ME Index — ${capabilityTrend.label}. ${metrics.atRiskLeaders > 0 ? `${metrics.atRiskLeaders} leader${metrics.atRiskLeaders !== 1 ? "s" : ""} score below 60%. ` : ""}${metrics.highPotentialLeaders > 0 ? `${metrics.highPotentialLeaders} high-potential leader${metrics.highPotentialLeaders !== 1 ? "s" : ""} identified at 85%+. ` : ""}${connectedCount} of 4 signal domains connected. Treat as context for investigation, not definitive conclusions.`
    : "No assessment data yet. Run leadership assessments to populate capability insights. Manager wellbeing signals may still be available below.";

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

          {/* TL;DR — headline + metric callouts */}
          <div className="mb-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">TL;DR</span>
              <h3 className="text-base font-semibold text-gray-900 leading-snug">{headline}</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {callouts.map((c, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
                  <p className={`text-lg font-bold leading-tight ${
                    c.tone === "up" ? "text-emerald-600" : c.tone === "down" ? "text-red-500" : "text-gray-900"
                  }`}>{c.value}</p>
                  <p className="text-[10px] text-gray-400">{c.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Compact paragraph — the bottom line */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
            <p className="text-xs text-gray-700 leading-relaxed">{compactParagraph}</p>
          </div>

          {/* Bullets — what to examine next */}
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">What to examine next</p>
            <ul className="space-y-1.5">
              {tldrBullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                  <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-[#0202ff]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Strategic Context — expandable synthesis */}
          <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
            {generatingBriefing && !executiveBriefing ? (
              <div className="flex items-center gap-2 text-purple-600 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />Generating strategic briefing…
              </div>
            ) : executiveBriefing ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />AI Strategic Context
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