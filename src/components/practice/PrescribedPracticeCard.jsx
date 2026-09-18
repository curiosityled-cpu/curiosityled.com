/**
 * PrescribedPracticeCard — the Practice-page "best next move" row.
 *
 * Prescribes ONE workout, in priority order:
 *   1. The top generated workout (pattern-driven ConversationalLearningModule)
 *      whose source_pattern_id matches the user's top active pattern.
 *   2. A static-library workout theme-matched to the top pattern (fallback when
 *      no generated workout targets the top pattern).
 *   3. A consistency-gap workout (a static one not done recently).
 *
 * Starting a generated workout opens Atreus with the workout coaching_flow;
 * marking it done runs completeWorkout (logs session, marks recommendation
 * accepted, awards points). Static workouts keep the lightweight log behavior.
 */
import React, { useMemo, useState, useEffect } from "react";
import { Sparkles, Brain, CheckCircle2, ArrowRight, Dumbbell, Target, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import {
  loadActiveWorkouts, buildWorkoutCoachingFlow, buildWorkoutStarterMessage, completeWorkout,
} from "@/components/practice/workoutUtils";

// ── Static fallback library (theme-matched to the top pattern when no
// generated workout targets it) ────────────────────────────────────────────
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

// Map a cross-tool / BPO pattern name → the pattern_id used by the workout
// engine (buildPatternBriefs). Used to match generated workouts to patterns.
function patternNameToId(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("identity")) return "identity_friction";
  if (n.includes("overload")) return "overload";
  if (n.includes("delegat")) return "delegation_gap";
  if (n.includes("confidence")) return "declining_confidence";
  return null;
}

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
  const [busy, setBusy] = useState(false);
  const [activeWorkouts, setActiveWorkouts] = useState([]);

  // Load the user's active pattern-driven workouts (generated modules)
  useEffect(() => {
    if (!user?.email) return;
    let mounted = true;
    (async () => {
      try {
        const w = await loadActiveWorkouts(user.email);
        if (mounted) setActiveWorkouts(w);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [user?.email]);

  const prescription = useMemo(() => {
    // Ranked active patterns (cross-tool first, then in-app BPO), each tagged
    // with the workout-engine pattern_id it maps to.
    const rankedPatterns = [
      ...(crossToolData?.topPatterns || []),
      ...(bpoPatterns || []),
    ]
      .map((p) => ({ ...p, _pid: patternNameToId(p.name) }));

    // 1. Top generated workout impacting the top pattern that has a match.
    for (const p of rankedPatterns) {
      if (!p._pid) continue;
      const matches = activeWorkouts.filter((w) => w.module?.source_pattern_id === p._pid);
      if (matches.length > 0) {
        const top = matches.sort(
          (a, b) => (b.recommendation?.relevance_score || 0) - (a.recommendation?.relevance_score || 0)
        )[0];
        return {
          kind: "generated",
          module: top.module,
          recommendation: top.recommendation,
          patternName: p.name,
          sourceLabel: p.sourceLabel || "Pattern-driven",
        };
      }
    }

    // 2. Static-library workout theme-matched to the top pattern.
    const topPattern = rankedPatterns[0];
    if (topPattern) {
      const best = [...PRESCRIPTION_LIBRARY]
        .map((w) => ({ workout: w, score: scoreWorkoutForPattern(w, topPattern) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score > 0) {
        return {
          kind: "static",
          workout: best.workout,
          patternName: topPattern.name,
          sourceLabel: topPattern.sourceLabel || "Active pattern",
        };
      }
    }

    // 3. Consistency-gap fallback — a static workout not done recently.
    const notDoneRecently = PRESCRIPTION_LIBRARY.filter(
      (w) => !recentSessionIds.includes(w.id)
    );
    const fallback = notDoneRecently[0] || PRESCRIPTION_LIBRARY[0];
    return {
      kind: "consistency",
      workout: fallback,
      patternName: null,
      sourceLabel: "Consistency",
    };
  }, [crossToolData, bpoPatterns, activeWorkouts, recentSessionIds]);

  if (!prescription) return null;

  const isGenerated = prescription.kind === "generated";
  const staticWorkout = prescription.kind !== "generated" ? prescription.workout : null;
  const module = isGenerated ? prescription.module : null;

  const title = isGenerated ? module.title : staticWorkout.title;
  const description = isGenerated ? module.description : staticWorkout.description;
  const duration = isGenerated
    ? (module.estimated_duration_minutes ? `${module.estimated_duration_minutes} min` : "")
    : staticWorkout.duration;
  const patternName = prescription.patternName;
  const sourceLabel = prescription.sourceLabel;
  const isPattern = prescription.kind === "generated" || prescription.kind === "static";

  const handleStart = () => {
    if (isGenerated) {
      openWithContext({
        context: { pageType: "practice", coaching_flow: buildWorkoutCoachingFlow(module) },
        starterMessage: buildWorkoutStarterMessage(module),
      });
    } else {
      openWithContext({
        context: { pageType: "practice", exercise: staticWorkout.id, prescribed_for: patternName },
        starterMessage: staticWorkout.prompt,
      });
    }
  };

  const handleDone = async () => {
    if (done || busy) return;
    setBusy(true);
    try {
      if (isGenerated) {
        await completeWorkout({
          user,
          module,
          recommendationId: prescription.recommendation?.id,
          commitment: "",
        });
      } else {
        await base44.entities.ManagerPulse.create({
          user_email: user?.email,
          prompt_type: "practice_session",
          source: "web",
          focus_intention: `Workout completed: ${staticWorkout.title}`.slice(0, 500),
        });
      }
      setDone(true);
      onSessionLogged?.();
    } catch {
      // non-blocking
    } finally {
      setBusy(false);
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

  const typeLabel = isGenerated ? (module.workout_type === "task" ? "Real task" : "Skill") : null;
  const TypeIcon = isGenerated ? (module.workout_type === "task" ? Target : Zap) : null;

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
        {isPattern && patternName && (
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-[#0202ff] flex-shrink-0" />
            <p className="text-[10px] font-medium text-[#0202ff] leading-snug">
              Prescribed for your <span className="font-semibold">{patternName}</span> pattern
            </p>
          </div>
        )}
        {prescription.kind === "consistency" && (
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <p className="text-[10px] font-medium text-amber-600 leading-snug">
              A workout you haven't done recently — keep your practice consistent
            </p>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-bold text-card-foreground leading-tight">{title}</p>
              {isGenerated && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${module.workout_type === "task" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-[#0202ff]/5 text-[#0202ff] border-[#0202ff]/15"}`}>
                  <TypeIcon className="w-2.5 h-2.5" /> {typeLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              {description}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {duration && (
                <p className="text-[10px] text-muted-foreground/70 inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {duration}
                </p>
              )}
              {isGenerated && prescription.recommendation?.recommendation_reason && (
                <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1">
                  {prescription.recommendation.recommendation_reason}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
            onClick={handleStart}
            disabled={busy}
          >
            <Brain className="w-3 h-3 mr-1.5" /> Start with Atreus <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 text-muted-foreground"
            onClick={handleDone}
            disabled={busy}
          >
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> {busy ? "Saving…" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}