/**
 * PrescribedPracticeCard — the Practice-page equivalent of TopPatternsMoveCard.
 *
 * Surfaces ONE recommended workout, derived in priority order:
 *   1. Connected-stack patterns (getCrossToolPatterns) — "prescribed for: <pattern>"
 *   2. Active BPO patterns/trends (runBpoPatternEngine) — pattern → matching workout
 *   3. Streak / consistency gap fallback — a workout the user hasn't done recently
 *
 * Styled like the Lead page's "best next move" row. Starting it opens Atreus with
 * the workout prompt; marking done logs a ManagerPulse practice session (which
 * feeds the sessions log + streak ring).
 */
import React, { useMemo, useState } from "react";
import { Sparkles, Brain, CheckCircle2, ArrowRight, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";

// Re-export the exercise library shape so the prescription can map a pattern → workout.
// Kept in sync with WorkoutsSection's EXERCISE_LIBRARY themes.
const PRESCRIPTION_LIBRARY = [
  {
    id: "delegation_audit",
    title: "Delegation audit",
    duration: "5 min",
    themes: ["delegation", "overload", "team"],
    description: "List everything you did this week that someone on your team could have done. Pick one. Hand it off next week.",
    prompt: "Help me think through what I should delegate. I want to do a quick delegation audit.",
  },
  {
    id: "conflict_prep",
    title: "Hard conversation prep",
    duration: "7 min",
    themes: ["conflict", "confidence", "communication"],
    description: "Name the conversation you've been putting off. Write the one thing you actually need to say — in one sentence.",
    prompt: "I want to prepare for a difficult conversation I've been avoiding. Help me think it through.",
  },
  {
    id: "energy_map",
    title: "Energy drain map",
    duration: "5 min",
    themes: ["energy", "overload", "resilience"],
    description: "Write down what drained you most this week and what gave you energy. Look for the pattern.",
    prompt: "Help me map what's draining my energy right now and where I can find more.",
  },
  {
    id: "commitment_review",
    title: "Commitment review",
    duration: "3 min",
    themes: ["follow_through", "goals", "accountability"],
    description: "Review your last three commitments. Did they happen? What got in the way? Pick one to retry.",
    prompt: "I want to review my recent commitments and understand what's getting in the way of following through.",
  },
  {
    id: "identity_anchor",
    title: "Leadership identity anchor",
    duration: "5 min",
    themes: ["identity", "confidence", "clarity"],
    description: "Write three sentences: what kind of leader you are at your best, what gets in the way, and one thing you want to lead like this week.",
    prompt: "I want to reconnect with my leadership identity and think about who I want to be as a leader this week.",
  },
  {
    id: "decision_capture",
    title: "Decision capture",
    duration: "4 min",
    themes: ["decision", "clarity", "judgment"],
    description: "Capture a decision you're sitting with: what you know, what you don't, and what would make you confident to decide.",
    prompt: "I'm sitting with a decision I need to make. Help me think through the context and what's holding me back.",
  },
  {
    id: "team_pulse",
    title: "Team pulse check",
    duration: "5 min",
    themes: ["team", "delegation", "leadership"],
    description: "Think about each direct report: who's thriving, who's stretched, and who needs a real conversation this week.",
    prompt: "Help me do a quick pulse check on my team — who I should be paying more attention to right now.",
  },
  {
    id: "pattern_interrupt",
    title: "Pattern interrupt",
    duration: "5 min",
    themes: ["overload", "avoidance", "identity"],
    description: "Name one pattern you're caught in right now. What would a different version of you do instead? Write it down.",
    prompt: "I want to interrupt a leadership pattern I keep falling into. Help me name it and think through an alternative.",
  },
];

// Map a cross-tool / BPO pattern name → matching workout themes
function patternToThemes(pattern) {
  const name = (pattern.name || "").toLowerCase();
  const bucket = (pattern.bucket || "").toLowerCase();
  if (name.includes("delegat") || name.includes("overload") || name.includes("reactive"))
    return ["delegation", "overload"];
  if (name.includes("avoid") || name.includes("accountab") || name.includes("commitment"))
    return ["follow_through", "accountability"];
  if (name.includes("conflict") || name.includes("communicat") || name.includes("recognition"))
    return ["conflict", "communication"];
  if (name.includes("decision") || name.includes("metric") || bucket.includes("execution"))
    return ["decision", "clarity"];
  if (name.includes("energy") || name.includes("burnout") || name.includes("resilience"))
    return ["energy", "resilience"];
  if (name.includes("team") || name.includes("attrition") || name.includes("coaching"))
    return ["team", "leadership"];
  if (name.includes("identity") || name.includes("confidence"))
    return ["identity", "confidence"];
  return [];
}

function scoreWorkoutForPattern(workout, pattern) {
  const themes = patternToThemes(pattern);
  if (!themes.length) return 0;
  return workout.themes.filter((t) => themes.includes(t)).length;
}

export default function PrescribedPracticeCard({
  crossToolData,
  bpoPatterns,
  trends,
  recentSessionIds = [],
  onSessionLogged,
}) {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [done, setDone] = useState(false);

  const prescription = useMemo(() => {
    // 1. Connected-stack patterns
    const crossToolPattern = crossToolData?.topPatterns?.[0];
    if (crossToolPattern) {
      const best = [...PRESCRIPTION_LIBRARY]
        .map((w) => ({ workout: w, score: scoreWorkoutForPattern(w, crossToolPattern) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score > 0) {
        return {
          workout: best.workout,
          source: "pattern",
          patternName: crossToolPattern.name,
          sourceLabel: crossToolPattern.sourceLabel || "Connected stack",
        };
      }
    }

    // 2. Active BPO patterns
    const topBpo = bpoPatterns?.[0];
    if (topBpo) {
      const best = [...PRESCRIPTION_LIBRARY]
        .map((w) => ({ workout: w, score: scoreWorkoutForPattern(w, topBpo) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score > 0) {
        return {
          workout: best.workout,
          source: "pattern",
          patternName: topBpo.name,
          sourceLabel: "Active pattern",
        };
      }
    }

    // 3. Streak / consistency gap fallback — a workout not done recently
    const notDoneRecently = PRESCRIPTION_LIBRARY.filter(
      (w) => !recentSessionIds.includes(w.id)
    );
    const fallback = notDoneRecently[0] || PRESCRIPTION_LIBRARY[0];
    return {
      workout: fallback,
      source: "consistency",
      patternName: null,
      sourceLabel: "Consistency",
    };
  }, [crossToolData, bpoPatterns, trends, recentSessionIds]);

  if (!prescription) return null;
  const { workout, source, patternName, sourceLabel } = prescription;

  const handleStart = () => {
    openWithContext({
      context: { pageType: "practice", exercise: workout.id, prescribed_for: patternName },
      starterMessage: workout.prompt,
    });
  };

  const handleDone = async () => {
    if (done) return;
    setDone(true);
    try {
      await base44.entities.ManagerPulse.create({
        user_email: user?.email,
        prompt_type: "practice_session",
        source: "web",
        focus_intention: `Workout completed: ${workout.title}`.slice(0, 500),
      });
      onSessionLogged?.();
    } catch {
      // non-blocking
    }
  };

  if (done) {
    return (
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-card-foreground">Session logged</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Nice work. Your streak and sessions log are updated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-lg bg-[#0202ff] flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-3 h-3 text-white" />
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Today's Prescribed Practice
        </p>
        <span className="text-[9px] text-muted-foreground ml-auto">{sourceLabel}</span>
      </div>

      {/* Prescription */}
      <div className="bg-gradient-to-br from-[#0202ff]/5 to-transparent rounded-xl px-4 py-3.5 border border-[#0202ff]/10">
        {source === "pattern" && patternName && (
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-[#0202ff] flex-shrink-0" />
            <p className="text-[10px] font-medium text-[#0202ff] leading-snug">
              Prescribed for your <span className="font-semibold">{patternName}</span> pattern
            </p>
          </div>
        )}
        {source === "consistency" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <p className="text-[10px] font-medium text-amber-600 leading-snug">
              A workout you haven't done recently — keep your practice consistent
            </p>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-card-foreground leading-tight">{workout.title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              {workout.description}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5">{workout.duration}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
            onClick={handleStart}
          >
            <Brain className="w-3 h-3 mr-1.5" /> Start with Atreus <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 text-muted-foreground"
            onClick={handleDone}
          >
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Done
          </Button>
        </div>
      </div>
    </div>
  );
}