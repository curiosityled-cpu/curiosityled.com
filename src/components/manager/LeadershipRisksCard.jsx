/**
 * LeadershipRisksCard — Consolidated blind spots + stress patterns panel.
 * Replaces separate blind spot / stress cards to reduce redundancy.
 * Distinguishes assessment-grounded signals from interpretive guidance.
 * Uses developmental, non-clinical language throughout.
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, FlaskConical, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtreusChat } from "@/components/ai/AtreusContext";

// Per-archetype interpretive signals — these are inferred, not directly scored
const ARCHETYPE_RISK_PROFILES = {
  "Performance Catalyst": {
    watchouts: [
      {
        label: "Pace vs. input tension",
        description: "May be more likely to move faster than the team is ready for, which can reduce buy-in even when direction is right.",
        micro_action: "Before your next decision, ask one team member: 'What would make you more confident about this?' Let their answer inform your timing.",
        source: "interpretive",
      },
      {
        label: "Feedback delivery intensity",
        description: "Under pressure, feedback can come across as harder-edged than intended — focused on the gap rather than the growth.",
        micro_action: "Practice the frame: 'Here's what I noticed. Here's why I think it matters. Here's what I'd like to explore with you.'",
        source: "interpretive",
      },
    ],
    stress_pattern: "Under sustained pressure, this pattern can show up as increased urgency, shorter feedback loops, and reduced patience for process. This is a common response — not a character flaw.",
  },
  "Strategic Navigator": {
    watchouts: [
      {
        label: "Analysis-action gap",
        description: "May be more likely to extend the planning phase longer than the situation requires — which can read as indecision.",
        micro_action: "Set a decision deadline for yourself before you start gathering input. Define 'good enough information' upfront.",
        source: "interpretive",
      },
      {
        label: "Communication of uncertainty",
        description: "When sharing thinking-in-progress, may leave audiences less certain about direction than intended.",
        micro_action: "Separate your exploration mode from your decision mode in communications. Be explicit about which one you're in.",
        source: "interpretive",
      },
    ],
    stress_pattern: "Under pressure, this pattern can show up as more withdrawal into analysis or planning, which can leave teams feeling unsupported or unclear on direction.",
  },
  "Collaborative Builder": {
    watchouts: [
      {
        label: "Consensus dependency",
        description: "May be more likely to defer a decision until more agreement is present — which can slow pace in time-sensitive situations.",
        micro_action: "Identify one upcoming decision that doesn't need consensus. Practice making the call and communicating it with clarity.",
        source: "interpretive",
      },
      {
        label: "Conflict avoidance",
        description: "Under pressure, this pattern can show up as softening difficult feedback or avoiding escalation — which can delay necessary conversations.",
        micro_action: "Before a hard conversation, write out the core message in one sentence. Commit to saying that sentence, even if gently.",
        source: "interpretive",
      },
    ],
    stress_pattern: "Under pressure, this pattern can show up as overextension — trying to support everyone while under-communicating your own boundaries and capacity.",
  },
};

const DEFAULT_RISKS = {
  watchouts: [
    {
      label: "Stress response under pressure",
      description: "Most leaders have a pattern of response under sustained pressure. Understanding yours — and its effect on the team — is foundational to sustained performance.",
      micro_action: "Ask a trusted colleague or your manager: 'What do you notice about how I show up when things are high-stakes?' Use that input.",
      source: "interpretive",
    },
  ],
  stress_pattern: "Individual stress patterns vary. The most useful development question is: what does your team see when you're under pressure, and how does that affect them?",
};

const SOURCE_BADGE = {
  interpretive: { label: "Interpretive guidance", color: "bg-amber-50 text-amber-700 border-amber-200" },
  scored: { label: "Assessment-grounded", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

export default function LeadershipRisksCard({ assessment, insight }) {
  const [expanded, setExpanded] = useState(false);
  const { openWithContext } = useAtreusChat();

  const archetype = insight?.archetype || assessment?.archetype_label;
  const profile = ARCHETYPE_RISK_PROFILES[archetype] || DEFAULT_RISKS;

  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-900">Leadership Risks & Watchouts</h3>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          These patterns are inferred from how you responded to complex, ambiguous scenarios in the Leadership Index.
        </p>
        <p className="text-xs text-gray-400 mb-4 italic flex items-center gap-1">
          <FlaskConical className="w-3 h-3" />
          Interpretive guidance — developmental use only, not clinical assessment
        </p>

        {/* Watchouts */}
        <div className="space-y-3 mb-4">
          {profile.watchouts.map((w, i) => {
            const badge = SOURCE_BADGE[w.source];
            return (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{w.label}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-2.5">
                  Under pressure, you <span className="font-medium text-gray-800">may be more likely</span> to experience: {w.description}
                </p>
                <div className="bg-white border border-emerald-100 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Micro-action
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">{w.micro_action}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stress pattern — expandable */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left p-3 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-50/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-900">Stress Pattern</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 bg-amber-50/60 border border-amber-100 border-t-0 rounded-b-xl">
                <p className="text-sm text-gray-700 leading-relaxed mb-2">{profile.stress_pattern}</p>
                <p className="text-xs text-gray-400 italic border-t border-amber-100 pt-2">
                  Stress patterns reflect common leadership responses observed in assessment data. They are not clinical diagnoses and are intended for developmental use only.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-gray-200 text-gray-600"
            onClick={() =>
              openWithContext({
                pageType: "my-leadership",
                starter_message: `I want to work on my leadership watchouts from the assessment. My pattern is "${archetype}." Help me turn these into daily practices I can actually use — keep it practical and non-judgmental.`,
                archetype,
              })
            }
          >
            <Plus className="w-3 h-3 mr-1" /> Add daily practice
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-[#0202ff] hover:bg-blue-50"
            onClick={() =>
              openWithContext({
                pageType: "my-leadership",
                starter_message: `Help me start a coaching conversation about my stress patterns and blind spots. I want to approach this with curiosity, not defensiveness. My archetype is "${archetype}."`,
                archetype,
              })
            }
          >
            Start a coaching conversation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}