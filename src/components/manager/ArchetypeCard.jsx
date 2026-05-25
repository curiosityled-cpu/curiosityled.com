/**
 * ArchetypeCard — Identity panel with coaching-safe language.
 * Archetype is presented as a practical pattern, not a verdict.
 * Uses probabilistic, developmental framing throughout.
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const ARCHETYPE_PATTERNS = {
  "Performance Catalyst": {
    tendency: "tends to prioritize results and team output, and may be more likely to push for pace over process",
    strength_context: "This pattern can be a significant asset in turnaround situations, high-output environments, and when a team needs direction and momentum.",
    backfire: "Under pressure, this pattern can show up as over-directing or under-investing in team input — which can reduce buy-in and long-term engagement.",
    practice: "Experiment with: Before your next team decision, ask what level of challenge feels right to each person. Notice whether your pace assumptions match theirs.",
  },
  "Strategic Navigator": {
    tendency: "tends to take a longer view, connecting decisions to broader context — and may be more likely to pause before acting",
    strength_context: "This pattern tends to show up well in planning cycles, ambiguous environments, and when stakeholders need confidence in direction.",
    backfire: "In fast-moving or under-resourced situations, this tendency can appear as hesitation or over-analysis, which may frustrate action-oriented peers.",
    practice: "Experiment with: Set a decision deadline for yourself on one open question this week. Note what feels different about moving faster.",
  },
  "Collaborative Builder": {
    tendency: "tends to invest in relationships and collective ownership, and may be more likely to seek consensus before moving",
    strength_context: "This pattern creates strong team trust and tends to generate durable results in change initiatives and cross-functional environments.",
    backfire: "Under pressure, the tendency toward consensus can slow decision-making and make it harder to deliver unpopular-but-necessary messages.",
    practice: "Experiment with: Identify one upcoming decision that doesn't need consensus. Practice making the call, communicating it clearly, and noting the team's response.",
  },
};

const DEFAULT_PATTERN = {
  tendency: "currently shows up with a distinct pattern of leadership behaviors across complex, ambiguous situations",
  strength_context: "This pattern reflects how you've tended to respond to leadership challenges in your assessment. It can be an asset in the right contexts.",
  backfire: "Every leadership pattern has conditions where it becomes less effective. Look for the situations where your natural approach may not be the best fit.",
  practice: "Experiment with: Identify one recent situation where your instinct was to respond one way. Reflect on whether a different approach might have worked better.",
};

export default function ArchetypeCard({ insight, assessment }) {
  const [expanded, setExpanded] = useState(false);
  const { openWithContext } = useAtreusChat();

  const archetype = insight?.archetype || assessment?.archetype_label;
  const pattern = ARCHETYPE_PATTERNS[archetype] || DEFAULT_PATTERN;

  const assessmentDate = assessment?.submission_ts || assessment?.created_date;
  const formattedDate = assessmentDate
    ? new Date(assessmentDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  if (!archetype) return null;

  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        {/* Identity header */}
        <div className="p-5 bg-gradient-to-br from-[#0202ff]/8 to-indigo-50 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <p className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Your Leadership Pattern
              </p>
              <h3 className="text-2xl font-bold text-gray-900">{archetype}</h3>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 italic flex items-start gap-1.5">
            <FlaskConical className="w-3 h-3 flex-shrink-0 mt-0.5 text-indigo-400" />
            Based on your Leadership Index response patterns
            {formattedDate && <span> · {formattedDate}</span>}
          </p>
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">
            In your assessment, your responses <span className="font-medium">{pattern.tendency}</span>.
            This is a current pattern, not a fixed trait — it reflects where you are right now, and it can shift as your development, role, and experience evolve.
          </p>
        </div>

        {/* Where it helps */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Where this pattern tends to help</p>
          <p className="text-sm text-gray-700 leading-relaxed">{pattern.strength_context}</p>
        </div>

        {/* Expandable: where it can backfire + practice */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pt-2 pb-2">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Where it can backfire</p>
                <p className="text-sm text-gray-700 leading-relaxed">{pattern.backfire}</p>
              </div>
              <div className="mx-5 mb-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-semibold text-emerald-800 mb-1.5">A micro-practice based on this pattern</p>
                <p className="text-sm text-gray-700 leading-relaxed">{pattern.practice}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-700 px-0 mt-2 hover:bg-transparent hover:underline"
                  onClick={() =>
                    openWithContext({
                      pageType: "my-leadership",
                      starter_message: `I want to explore my leadership pattern — I've been identified as a "${archetype}." Help me understand where this pattern helps in my current role and where I might need to adapt it. Let's keep it practical and developmental.`,
                      archetype,
                    })
                  }
                >
                  Add this to my daily practices <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="px-5 pb-5 pt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs border-gray-200 text-gray-600"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3 mr-1" /> Show less</>
            ) : (
              <><ChevronDown className="w-3 h-3 mr-1" /> See where this pattern helps and backfires</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-[#0202ff] hover:bg-blue-50"
            onClick={() =>
              openWithContext({
                pageType: "my-leadership",
                starter_message: `Help me start a development plan based on my "${archetype}" leadership pattern. What are the most important things to work on given this pattern?`,
                archetype,
              })
            }
          >
            Start a plan based on this pattern <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}