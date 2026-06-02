/**
 * WorkoutsSection — Practice › Grow B: Workouts/Exercises
 * Recommends guided exercises based on active focus (goals, patterns, insight).
 * Tracks completion in sessionStorage; completion saved to ManagerPulse.
 */
import React, { useState } from "react";
import { Dumbbell, CheckCircle2, ChevronRight, Brain, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";

const EXERCISE_LIBRARY = [
  {
    id: "delegation_audit",
    title: "Delegation audit",
    duration: "5 min",
    theme: ["delegation", "overload", "team"],
    description: "List everything you did this week that someone on your team could have done. Pick one. Hand it off next week.",
    prompt: "Help me think through what I should delegate. I want to do a quick delegation audit.",
    type: "reflection",
  },
  {
    id: "conflict_prep",
    title: "Hard conversation prep",
    duration: "7 min",
    theme: ["conflict", "confidence", "communication"],
    description: "Name the conversation you've been putting off. Write the one thing you actually need to say — in one sentence.",
    prompt: "I want to prepare for a difficult conversation I've been avoiding. Help me think it through.",
    type: "prep",
  },
  {
    id: "energy_map",
    title: "Energy drain map",
    duration: "5 min",
    theme: ["energy", "overload", "resilience"],
    description: "Write down what drained you most this week and what gave you energy. Look for the pattern.",
    prompt: "Help me map what's draining my energy right now and where I can find more.",
    type: "reflection",
  },
  {
    id: "commitment_review",
    title: "Commitment review",
    duration: "3 min",
    theme: ["follow_through", "goals", "accountability"],
    description: "Review your last three commitments. Did they happen? What got in the way? Pick one to retry.",
    prompt: "I want to review my recent commitments and understand what's getting in the way of following through.",
    type: "review",
  },
  {
    id: "identity_anchor",
    title: "Leadership identity anchor",
    duration: "5 min",
    theme: ["identity", "confidence", "clarity"],
    description: "Write three sentences: what kind of leader you are at your best, what gets in the way, and one thing you want to lead like this week.",
    prompt: "I want to reconnect with my leadership identity and think about who I want to be as a leader this week.",
    type: "reflection",
  },
  {
    id: "decision_capture",
    title: "Decision capture",
    duration: "4 min",
    theme: ["decision", "clarity", "judgment"],
    description: "Capture a decision you're sitting with: what you know, what you don't, and what would make you confident to decide.",
    prompt: "I'm sitting with a decision I need to make. Help me think through the context and what's holding me back.",
    type: "prep",
  },
  {
    id: "team_pulse",
    title: "Team pulse check",
    duration: "5 min",
    theme: ["team", "delegation", "leadership"],
    description: "Think about each direct report: who's thriving, who's stretched, and who needs a real conversation this week.",
    prompt: "Help me do a quick pulse check on my team — who I should be paying more attention to right now.",
    type: "review",
  },
  {
    id: "pattern_interrupt",
    title: "Pattern interrupt",
    duration: "5 min",
    theme: ["overload", "avoidance", "identity"],
    description: "Name one pattern you're caught in right now. What would a different version of you do instead? Write it down.",
    prompt: "I want to interrupt a leadership pattern I keep falling into. Help me name it and think through an alternative.",
    type: "reflection",
  },
];

const TYPE_COLOR = {
  reflection: "bg-violet-50 text-violet-700 border-violet-100",
  prep: "bg-blue-50 text-blue-700 border-blue-100",
  review: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function scoreExercise(exercise, goals, trends, insight) {
  let score = 0;
  const themes = exercise.theme;

  // Match against active goal titles
  goals.filter(g => g.status === 'active').forEach(g => {
    const title = (g.title || '').toLowerCase();
    if (themes.some(t => title.includes(t))) score += 3;
  });

  // Match against active pattern signals
  if (trends?.overload_pattern_strength > 40 && themes.includes('overload')) score += 4;
  if (trends?.identity_friction_active && themes.includes('identity')) score += 4;
  if (trends?.confidence_trend === 'declining' && themes.includes('confidence')) score += 3;
  if (trends?.learning_stall_detected && themes.includes('follow_through')) score += 2;
  if (trends?.delegation_gap_count_7d > 0 && themes.includes('delegation')) score += 3;

  // Match against development areas
  if (insight?.development_areas?.[0]) {
    const area = insight.development_areas[0].toLowerCase();
    if (themes.some(t => area.includes(t.split('_')[0]))) score += 2;
  }

  return score;
}

export default function WorkoutsSection({ goals = [], trends = null, insight = null }) {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('cl_workouts_done') || '[]'); } catch { return []; }
  });

  // Score and rank, take top 3
  const ranked = [...EXERCISE_LIBRARY]
    .map(ex => ({ ...ex, score: scoreExercise(ex, goals, trends, insight) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const markDone = async (ex) => {
    const next = [...completed, ex.id];
    setCompleted(next);
    sessionStorage.setItem('cl_workouts_done', JSON.stringify(next));
    try {
      await base44.entities.ManagerPulse.create({
        user_email: user?.email,
        prompt_type: 'follow_up',
        source: 'web',
        focus_intention: `Workout completed: ${ex.title}`.slice(0, 500),
      });
    } catch {}
  };

  const isDone = (id) => completed.includes(id);

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Dumbbell className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Workouts</p>
            <p className="text-[10px] text-gray-400">Recommended based on your active focus</p>
          </div>
        </div>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-2">
        {ranked.map(ex => {
          const done = isDone(ex.id);
          return (
            <div
              key={ex.id}
              className={`p-4 rounded-xl border transition-all ${done ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{ex.title}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TYPE_COLOR[ex.type]}`}>{ex.type}</span>
                    <span className="text-[10px] text-gray-400">{ex.duration}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{ex.description}</p>
                </div>
                {done && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
              </div>
              {!done && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-7"
                    onClick={() => openWithContext({ context: { pageType: 'practice', exercise: ex.id }, starterMessage: ex.prompt })}
                  >
                    <Brain className="w-3 h-3 mr-1" /> Start with Atreus
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-gray-200 text-gray-500 hover:bg-gray-50"
                    onClick={() => markDone(ex)}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {completed.length > 0 && (
          <button
            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors pt-1"
            onClick={() => {
              setCompleted([]);
              sessionStorage.removeItem('cl_workouts_done');
            }}
          >
            <RotateCcw className="w-3 h-3" /> Reset completed
          </button>
        )}
      </CardContent>
    </Card>
  );
}