/**
 * CompetencyFocusCard — Role-aware competency view.
 * Shows top 1-2 priorities visually prominent; full list on expand.
 * Includes benchmark context and source attribution.
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Info, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const COMPETENCY_CONFIG = [
  { key: "si_pct", label: "Situational Intelligence", description: "Reading context, adapting approach, sensing team and organizational dynamics" },
  { key: "dm_pct", label: "Decision Making", description: "Structuring choices, weighing tradeoffs, acting under ambiguity" },
  { key: "comm_pct", label: "Communication", description: "Clarity, influence, adapting message to audience and context" },
  { key: "rm_pct", label: "Resource Management", description: "Allocating time, people, and budget; prioritizing effectively" },
  { key: "sm_pct", label: "Stakeholder Management", description: "Building relationships, managing expectations, navigating influence" },
  { key: "pm_pct", label: "Performance Management", description: "Setting expectations, giving feedback, developing team members" },
];

// Approximate sector/level-adjusted target ranges
// These are presented as ranges, not precise targets
const BENCHMARK_RANGE = { min: 68, max: 80 };

function ScoreBar({ score, isFocus }) {
  const color = isFocus
    ? "bg-[#0202ff]"
    : score >= 75
    ? "bg-emerald-500"
    : score >= 65
    ? "bg-amber-400"
    : "bg-gray-300";

  return (
    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-visible">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
      {/* Benchmark range indicator */}
      <div
        className="absolute top-0 h-2 bg-emerald-200/60 rounded-full pointer-events-none"
        style={{
          left: `${BENCHMARK_RANGE.min}%`,
          width: `${BENCHMARK_RANGE.max - BENCHMARK_RANGE.min}%`,
        }}
        title={`Sector-adjusted target range: ${BENCHMARK_RANGE.min}–${BENCHMARK_RANGE.max}%`}
      />
    </div>
  );
}

export default function CompetencyFocusCard({ assessment }) {
  const [showAll, setShowAll] = useState(false);
  const { openWithContext } = useAtreusChat();

  if (!assessment) return null;

  const scored = COMPETENCY_CONFIG.map((c) => ({
    ...c,
    score: assessment[c.key],
  }))
    .filter((c) => c.score != null)
    .sort((a, b) => a.score - b.score);

  const focusItems = scored.slice(0, 2);
  const restItems = scored.slice(2);

  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0202ff]" />
            <h3 className="text-base font-semibold text-gray-900">Competency Profile</h3>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          From your Leadership Index · Similar organizations and roles at your leadership level
        </p>

        {/* Focus priorities */}
        <div className="space-y-4 mb-3">
          {focusItems.map((c, i) => (
            <div key={c.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-[#0202ff] text-white" : "bg-gray-200 text-gray-600"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.label}</p>
                    <p className="text-xs text-gray-400 truncate">{c.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${i === 0 ? "text-[#0202ff]" : "text-gray-700"}`}>{c.score}%</p>
                  <p className="text-xs text-gray-400">target ~{BENCHMARK_RANGE.min}–{BENCHMARK_RANGE.max}%</p>
                </div>
              </div>
              <ScoreBar score={c.score} isFocus={i === 0} />
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-200/80 inline-block" /> Sector-adjusted target range</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#0202ff] inline-block" /> Your score</span>
        </div>

        {/* Expandable full list */}
        {showAll && restItems.length > 0 && (
          <div className="space-y-3 mb-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Other competencies</p>
            {restItems.map((c) => (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-700">{c.label}</p>
                  <span className={`text-sm font-medium ${c.score >= 75 ? "text-emerald-600" : c.score >= 65 ? "text-amber-600" : "text-gray-500"}`}>
                    {c.score}%
                  </span>
                </div>
                <ScoreBar score={c.score} isFocus={false} />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {restItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-xs border-gray-200 text-gray-600"
            >
              {showAll ? <><ChevronUp className="w-3 h-3 mr-1" /> Fewer competencies</> : <><ChevronDown className="w-3 h-3 mr-1" /> All {scored.length} competencies</>}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#0202ff] hover:bg-blue-50"
            onClick={() =>
              openWithContext({
                pageType: "my-leadership",
                starter_message: `Help me explain my competency results to my manager or coach. I want to frame them in a way that's honest but development-focused, not alarming.`,
                competency_scores: scored.map((c) => ({ label: c.label, score: c.score })),
              })
            }
          >
            Explain results to my manager
          </Button>
        </div>

        {/* Benchmark disclaimer */}
        <div className="mt-4 flex items-start gap-1.5 text-xs text-gray-400 border-t border-gray-50 pt-3">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Benchmarks are sector- and level-adjusted estimates. Expectations vary meaningfully by role, scope, and experience.
            Small differences from the target range are common and expected. Look for sustained patterns, not single-point scores.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}