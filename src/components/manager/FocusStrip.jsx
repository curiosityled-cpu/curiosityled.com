/**
 * FocusStrip — The top-of-page command surface.
 * Answers: "What should I focus on now?" and "What can I do this week?"
 * Surfaces 1-2 development priorities and 1 primary action.
 */
import React from "react";
import { ArrowRight, Zap, Target, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const COMPETENCY_LABELS = {
  si_pct: "Situational Intelligence",
  dm_pct: "Decision Making",
  comm_pct: "Communication",
  rm_pct: "Resource Management",
  sm_pct: "Stakeholder Management",
  pm_pct: "Performance Management",
};

const MICRO_ACTIONS = {
  rm_pct: "Before Friday, identify one task you're holding that a team member could own. Delegate it with a clear brief.",
  pm_pct: "In your next 1:1, share one specific piece of feedback with a concrete example and a suggestion — not a verdict.",
  sm_pct: "Pick one key stakeholder. Write one sentence about what they need from you this month, then send a brief check-in.",
  dm_pct: "Set a decision deadline for yourself on one open question. Define your criteria before you decide.",
  comm_pct: "Before your next update to leadership, state the outcome you want them to take away in one sentence first.",
  si_pct: "Before your next team meeting, predict what each person's biggest concern is. Notice how accurate you are.",
};

export default function FocusStrip({ assessment, insight }) {
  const { openWithContext } = useAtreusChat();

  if (!assessment) return null;

  const scores = {
    rm_pct: assessment.rm_pct,
    pm_pct: assessment.pm_pct,
    sm_pct: assessment.sm_pct,
    dm_pct: assessment.dm_pct,
    comm_pct: assessment.comm_pct,
    si_pct: assessment.si_pct,
  };

  const ranked = Object.entries(scores)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => a - b);

  const [primaryKey, primaryScore] = ranked[0] || [];
  const [secondaryKey, secondaryScore] = ranked[1] || [];
  const primaryLabel = COMPETENCY_LABELS[primaryKey] || primaryKey;
  const secondaryLabel = COMPETENCY_LABELS[secondaryKey] || secondaryKey;
  const microAction = MICRO_ACTIONS[primaryKey] || "Identify one concrete leadership experiment you can run this week.";

  const assessmentDate = assessment.submission_ts || assessment.created_date;
  const formattedDate = assessmentDate
    ? new Date(assessmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider mb-1">Your Focus This Week</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              Build on <span className="text-[#0202ff]">{primaryLabel}</span>
              {secondaryLabel && <span className="text-gray-500 font-normal"> · then {secondaryLabel}</span>}
            </h2>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-gray-400">Based on Leadership Index</p>
            {formattedDate && <p className="text-xs text-gray-400">{formattedDate}</p>}
          </div>
        </div>
      </div>

      {/* Priority focus areas */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {primaryKey && (
          <div className="flex items-start gap-3 p-3 bg-[#0202ff]/5 border border-[#0202ff]/15 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{primaryLabel}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your score: <span className="font-medium text-[#0202ff]">{primaryScore}%</span>
                <span className="text-gray-400"> · Sector-adjusted target: ~70–80%</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5 italic">Primary development focus</p>
            </div>
          </div>
        )}
        {secondaryKey && (
          <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{secondaryLabel}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your score: <span className="font-medium text-gray-700">{secondaryScore}%</span>
                <span className="text-gray-400"> · Secondary focus area</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* This week's micro-action */}
      <div className="mx-5 mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <div className="flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-1">One Realistic Action This Week</p>
            <p className="text-sm text-gray-800 leading-relaxed">{microAction}</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-5 pb-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs"
          onClick={() =>
            openWithContext({
              pageType: "my-leadership",
              starter_message: `Help me build a focused development plan for ${primaryLabel}. My current score is ${primaryScore}%. Walk me through what that means for my leadership level and what I can do in the next 4 weeks.`,
              primary_focus: primaryLabel,
              assessment_score: primaryScore,
            })
          }
        >
          <Target className="w-3 h-3 mr-1.5" /> Build My Plan
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-gray-200 text-gray-600"
          onClick={() =>
            openWithContext({
              pageType: "my-leadership",
              starter_message: `Help me explain my ${primaryLabel} development priority to my manager or coach. What language should I use that's accurate but not alarming?`,
              primary_focus: primaryLabel,
            })
          }
        >
          Discuss With Coach <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* Benchmark note */}
      <div className="px-5 pb-4">
        <div className="flex items-start gap-1.5 text-xs text-gray-400">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Benchmarks shown are sector- and level-adjusted estimates. Expectations vary by role, scope, and experience. Use these as directional guidance, not precise targets.</span>
        </div>
      </div>
    </div>
  );
}