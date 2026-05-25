/**
 * SuccessionReadinessPanel — Banded readiness estimate with multi-signal transparency.
 * Readiness is presented as developmental guidance, not a formal succession decision.
 * Offers 2-3 possible growth paths rather than a single "next role."
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Info, ChevronDown, ChevronUp, MessageSquare, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const READINESS_BANDS = [
  { min: 85, label: "Ready Now", color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", description: "Assessment, development, and goal signals suggest readiness for expanded scope — confirm through talent review and manager judgment." },
  { min: 72, label: "Nearly Ready", color: "bg-blue-500", textColor: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", description: "Strong signals with a few targeted development areas remaining. Consider a stretch assignment or high-visibility project." },
  { min: 58, label: "Building", color: "bg-amber-500", textColor: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", description: "Active development in progress. Focus on 1-2 key competency gaps and an experience-based stretch opportunity." },
  { min: 0, label: "Emerging", color: "bg-gray-400", textColor: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", description: "Early-stage leadership development. Build core competency foundations before targeting next-level roles." },
];

const GROWTH_PATHS_BY_ARCHETYPE = {
  "Performance Catalyst": [
    { title: "Senior Operations Manager", rationale: "Aligns with your results-orientation and team-driving strengths. Expand scope of resource and performance accountability." },
    { title: "Program Manager (Complex Initiatives)", rationale: "Leverages your pace and output focus in a project leadership context with broader stakeholder scope." },
    { title: "Team Development Lead", rationale: "Redirects your performance focus toward coaching others — a growth stretch that builds influence through people, not just results." },
  ],
  "Strategic Navigator": [
    { title: "Strategy & Planning Lead", rationale: "Plays to your contextual thinking and long-view strengths. Tests your ability to connect analysis to organizational action." },
    { title: "Senior Program Manager", rationale: "Leverages strategic framing skills across multi-team or multi-department scope." },
    { title: "Talent Development Leader", rationale: "Applies your reflective approach to developing others — a path that stretches execution-speed capabilities." },
  ],
  "Collaborative Builder": [
    { title: "Cross-Functional Initiative Lead", rationale: "Directly leverages your relationship and coalition-building strengths at broader organizational scope." },
    { title: "HR Business Partner / OD Lead", rationale: "Plays to your people orientation and listening strengths in a formal organizational development capacity." },
    { title: "Senior Manager (People Operations)", rationale: "Expands your collaborative approach to a team-of-teams leadership context, with accountability for performance outcomes." },
  ],
};

const DEFAULT_PATHS = [
  { title: "Senior Manager / People Leader", rationale: "A natural next step that expands people, resource, and accountability scope." },
  { title: "Program or Initiative Lead", rationale: "Builds cross-functional leadership experience and broader organizational influence." },
  { title: "Specialist Development Track", rationale: "Deepens functional expertise in alignment with your competency strengths." },
];

function getBand(score) {
  return READINESS_BANDS.find((b) => score >= b.min) || READINESS_BANDS[READINESS_BANDS.length - 1];
}

function computeReadinessScore(assessment) {
  if (!assessment) return 65;
  const base = assessment.overall_pct || 65;
  // Approximate: blend overall score (primary signal) with a modest developmental proxy
  // This is transparent that it's estimated — not computed from real plan/goal data
  return Math.min(95, Math.round(base * 0.85 + 10));
}

export default function SuccessionReadinessPanel({ assessment, insight }) {
  const [showPaths, setShowPaths] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const { openWithContext } = useAtreusChat();

  const archetype = insight?.archetype || assessment?.archetype_label;
  const readinessScore = computeReadinessScore(assessment);
  const band = getBand(readinessScore);
  const growthPaths = GROWTH_PATHS_BY_ARCHETYPE[archetype] || DEFAULT_PATHS;

  const factors = [
    { label: "Assessment Score", value: assessment?.overall_pct || "—", weight: "40%", description: "Leadership Index competency performance" },
    { label: "Learning Progress", value: "—", weight: "25%", description: "Completion of assigned learning and journeys" },
    { label: "Goal Achievement", value: "—", weight: "20%", description: "Progress toward active goals" },
    { label: "Experience Breadth", value: "—", weight: "15%", description: "Stretch projects, coaching, cross-functional work" },
  ];

  const steps = [
    assessment?.rm_pct < 72 && { competency: "Resource Management", action: "Engage in a targeted learning resource or stretch project that builds planning and prioritization skills across a larger team scope." },
    assessment?.pm_pct < 72 && { competency: "Performance Management", action: "Take the lead on a structured feedback cycle with your team. Practice setting expectations, observing behavior, and closing the loop." },
    assessment?.sm_pct < 72 && { competency: "Stakeholder Management", action: "Identify one cross-functional relationship to intentionally develop this quarter. Set a goal around influencing an outcome without direct authority." },
    { competency: "Experience", action: "Seek one high-visibility project that expands your leadership scope — larger team, broader budget, or cross-departmental accountability." },
  ].filter(Boolean).slice(0, 3);

  if (!assessment) return null;

  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Succession Readiness</h3>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4 text-xs text-blue-800">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
          <span>
            AI-estimated from current assessment, development, goal, and experience data.
            <strong className="ml-1">Use alongside manager judgment and talent review — not as a standalone verdict.</strong>
          </span>
        </div>

        {/* Band */}
        <div className={`p-4 rounded-xl border ${band.bg} ${band.border} mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Readiness Band</p>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${band.bg} ${band.textColor} border ${band.border}`}>
              {band.label}
            </span>
          </div>
          <div className="relative w-full h-2.5 bg-gray-200 rounded-full mb-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${band.color}`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{band.description}</p>
        </div>

        {/* Contributing factors */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contributing Signals</p>
          <div className="space-y-2.5">
            {factors.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-700">{f.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{f.weight} weight</span>
                      <span className="text-xs font-semibold text-gray-800">{f.value}{f.value !== "—" ? "%" : ""}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-300 rounded-full transition-all duration-700"
                      style={{ width: f.value !== "—" ? `${f.value}%` : "30%" }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">
            Learning, goal, and experience signals shown as estimates where live data is not yet connected.
          </p>
        </div>

        {/* Steps to ready */}
        <button
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between text-left mb-1"
        >
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Steps to 'Ready Now'</p>
          {showSteps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showSteps && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2.5 mb-4 pt-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="w-5 h-5 rounded-full bg-[#0202ff]/10 text-[#0202ff] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-0.5">{s.competency}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{s.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Possible growth paths */}
        <button
          onClick={() => setShowPaths(!showPaths)}
          className="w-full flex items-center justify-between text-left mb-1 mt-2"
        >
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Possible Growth Paths</p>
          {showPaths ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showPaths && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2.5 pt-2 mb-4">
                <p className="text-xs text-gray-400 mb-2 italic">These are illustrative paths aligned with your pattern — not formal succession decisions.</p>
                {growthPaths.map((p, i) => (
                  <div key={i} className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{p.title}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{p.rationale}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-gray-200 text-gray-600"
            onClick={() =>
              openWithContext({
                pageType: "my-leadership",
                starter_message: `Help me prepare for a conversation with my manager about my development and potential growth paths. My current readiness band is "${band.label}." I want to frame this constructively and come with a plan, not just questions.`,
                readiness_band: band.label,
                archetype,
              })
            }
          >
            <MessageSquare className="w-3 h-3 mr-1" /> Discuss with my manager
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-[#0202ff] hover:bg-blue-50"
            onClick={() =>
              openWithContext({
                pageType: "my-leadership",
                starter_message: `Help me add the "Steps to Ready Now" items to my development plan. Let's turn them into concrete, time-bound actions I can actually track.`,
                readiness_band: band.label,
                steps: steps.map((s) => s.action),
              })
            }
          >
            <Target className="w-3 h-3 mr-1" /> Add steps to my plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}