/**
 * DailyPracticeCard — Surfaces today's recommended micro-practice.
 * Prioritized by current development focus. Easy to swap, log, or plan.
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, RefreshCw, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const PRACTICES_BY_COMPETENCY = {
  rm_pct: [
    { time: "5 min · Morning", label: "Resource scan", description: "Before your first meeting, identify your top 3 priorities for the day and check whether your calendar reflects them. Reschedule or decline anything that doesn't." },
    { time: "10 min · End of week", label: "Delegation audit", description: "List 3 tasks you did this week that a team member could have owned. For each one, ask yourself what was in the way of delegating it." },
    { time: "2 min · Before a meeting", label: "Capacity check", description: "Before agreeing to any new request, ask yourself: what would I need to stop, slow, or defer to take this on well?" },
  ],
  pm_pct: [
    { time: "5 min · After a 1:1", label: "Feedback reflection", description: "Write down one specific observation from a direct report this week — something you noticed about how they're working. Decide whether to share it and how." },
    { time: "2 min · Start of 1:1", label: "Check-in framing", description: "Before asking 'how are things going?', ask: 'What's one thing you're proud of since we last spoke, and one thing that's been harder than expected?'" },
    { time: "10 min · Weekly", label: "Progress review", description: "Review the goals your team is working toward. Note which ones have had no recent activity and plan a brief check-in — not to push, but to remove obstacles." },
  ],
  sm_pct: [
    { time: "5 min · Weekly", label: "Stakeholder pulse", description: "Pick one key stakeholder. Write one sentence: what do they need from me this month? Is there anything I should proactively communicate to them?" },
    { time: "2 min · Before a meeting", label: "Perspective mapping", description: "Before entering a meeting with a senior stakeholder, note their likely top concern. Plan to acknowledge it directly, even briefly." },
    { time: "10 min · Monthly", label: "Relationship audit", description: "Map your 5 most important cross-functional relationships. For each, rate the current quality (1-5) and identify one action to strengthen the weakest one." },
  ],
  dm_pct: [
    { time: "2 min · Before a decision", label: "Criteria-first", description: "Before gathering more input on an open decision, write down 2-3 criteria you'll use to evaluate options. Then decide whether you already have enough information." },
    { time: "5 min · End of day", label: "Decisions deferred review", description: "List any decisions you're still holding that could be made today. For each, either set a decision deadline or define what information would unlock the decision." },
    { time: "10 min · Weekly", label: "Decision quality reflection", description: "Pick one recent decision. What information did you have? What did you assume? What would you do differently with the benefit of hindsight?" },
  ],
  comm_pct: [
    { time: "2 min · Before messaging leadership", label: "One-line clarity", description: "Before sending any update upward, write the single most important thing you want them to take away. Lead with that — context can follow." },
    { time: "5 min · Before a difficult conversation", label: "Intent framing", description: "Write one sentence stating your positive intent for the conversation (e.g., 'I want to help this person succeed, and that means being honest with them now')." },
    { time: "5 min · After a meeting", label: "Communication audit", description: "After an important meeting, ask yourself: did people leave with the same understanding I intended? If not, what would I change?" },
  ],
  si_pct: [
    { time: "2 min · Before a meeting", label: "Room read prep", description: "Before entering a group setting, predict what each person's biggest concern is. Notice how accurate you are." },
    { time: "5 min · Mid-day", label: "Energy check", description: "Pause and notice: what's the emotional temperature of your team today? Is there anything happening beneath the surface that you should address?" },
    { time: "5 min · Weekly", label: "Pattern reflection", description: "What dynamics did you observe in your team this week that you hadn't fully articulated? Write one observation you'd want to share with a coach." },
  ],
};

const DEFAULT_PRACTICES = [
  { time: "5 min · Morning", label: "Daily leadership intention", description: "Before you open email, write one sentence: what do you want to do differently as a leader today? Keep it specific and behavioral." },
  { time: "5 min · Mid-day", label: "Check-in with yourself", description: "Pause. What's working today? What's harder than expected? What adjustment would help your afternoon?" },
  { time: "5 min · Evening", label: "Reflection close", description: "Name one thing that went well today as a leader. Name one thing you'd do differently. That's it — no judgment, just noticing." },
];

export default function DailyPracticeCard({ assessment }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAlternates, setShowAlternates] = useState(false);
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

  const lowestKey = Object.entries(scores)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => a - b)[0]?.[0];

  const practices = PRACTICES_BY_COMPETENCY[lowestKey] || DEFAULT_PRACTICES;
  const today = practices[currentIdx % practices.length];
  const alternates = practices.filter((_, i) => i !== currentIdx % practices.length);

  return (
    <Card className="shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-900">Today's Practice</h3>
          </div>
          <button
            onClick={() => setCurrentIdx((prev) => prev + 1)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            title="Try a different practice"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Swap
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Prioritized for your development focus</p>

        {/* Main practice */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-amber-900">{today.label}</p>
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{today.time}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{today.description}</p>
        </div>

        {/* Alternates toggle */}
        {alternates.length > 0 && (
          <>
            <button
              onClick={() => setShowAlternates(!showAlternates)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-3"
            >
              {showAlternates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAlternates ? "Fewer options" : `${alternates.length} alternate practices`}
            </button>

            {showAlternates && (
              <div className="space-y-2 mb-4">
                {alternates.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentIdx(practices.indexOf(p)); setShowAlternates(false); }}
                    className="w-full text-left p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-medium text-gray-800">{p.label}</p>
                      <span className="text-xs text-gray-400">{p.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-gray-200 text-gray-600 w-full"
          onClick={() =>
            openWithContext({
              pageType: "my-leadership",
              starter_message: `I want to build a 7-day streak around this practice: "${today.label}" — "${today.description}". Help me set a simple daily structure and a way to track whether I'm noticing any change.`,
              practice: today.label,
            })
          }
        >
          <Plus className="w-3 h-3 mr-1" /> Add to my plan · Build a 7-day streak
        </Button>
      </CardContent>
    </Card>
  );
}