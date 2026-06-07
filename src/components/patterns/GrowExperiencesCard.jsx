/**
 * GrowExperiencesCard — Connect development to real-world action.
 * Stretch experiences, weekly experiments, deliberate practice prompts.
 * Lives in Practice > Grow section.
 */
import React, { useState, useMemo } from "react";
import { Compass, CheckCircle2, Brain, RefreshCw, PlayCircle, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Deliberate practice experiments keyed to goal/pattern context
const EXPERIENCE_LIBRARY = [
  {
    id: "delegation_1",
    theme: "delegation",
    title: "Let someone own the first draft",
    description: "In your next team meeting, assign a direct report to own the first draft of a deliverable — without reviewing it first.",
    type: "Team experiment",
    effort: "This week",
    reflectionPrompt: "How did it go? What made it easy or hard to let go?",
  },
  {
    id: "delegation_2",
    theme: "delegation",
    title: "Name one thing you're holding unnecessarily",
    description: "Before your next 1:1, identify one task you've been holding that someone on your team could own. Tell them about it in the meeting.",
    type: "1:1 experiment",
    effort: "Today",
    reflectionPrompt: "What did you feel when you handed it off?",
  },
  {
    id: "strategic_1",
    theme: "strategic",
    title: "Block 90 minutes of protected thinking time",
    description: "Schedule one 90-minute block this week with no meetings. Use it only for strategic work — no email, no Slack.",
    type: "Calendar experiment",
    effort: "This week",
    reflectionPrompt: "What did you use the time for? Did anything shift in how you felt about the week?",
  },
  {
    id: "feedback_1",
    theme: "feedback",
    title: "Give one piece of direct, specific feedback today",
    description: "Choose one person and give them one piece of specific, behavioral feedback — not general praise. Use: 'When you did X, the impact was Y.'",
    type: "Conversation experiment",
    effort: "Today",
    reflectionPrompt: "How did they respond? How did it feel to be direct?",
  },
  {
    id: "reflection_1",
    theme: "reflection",
    title: "End-of-day 3-minute leadership debrief",
    description: "For the next 3 days, take 3 minutes at end of day to answer: What went well? What surprised me? What would I do differently?",
    type: "Daily habit",
    effort: "3 days",
    reflectionPrompt: "After 3 days, what pattern did you notice across your answers?",
  },
  {
    id: "presence_1",
    theme: "presence",
    title: "Start your next 1:1 with a real question",
    description: "Open your next 1:1 with: 'What's the most important thing on your mind right now?' — and don't move on until they've really answered it.",
    type: "1:1 experiment",
    effort: "Next 1:1",
    reflectionPrompt: "What did you learn that you wouldn't have heard otherwise?",
  },
  {
    id: "overload_1",
    theme: "overload",
    title: "Decline or reschedule one meeting this week",
    description: "Look at your calendar and find one meeting you don't truly need to attend. Decline it or delegate your presence to someone on your team.",
    type: "Calendar experiment",
    effort: "This week",
    reflectionPrompt: "What happened as a result? Did the meeting need you?",
  },
  {
    id: "pattern_1",
    theme: "avoidance",
    title: "Name the thing you've been putting off",
    description: "Write down the one task, conversation, or decision you've been avoiding. Then write: 'The real reason I'm avoiding this is…' and complete the sentence honestly.",
    type: "Reflection exercise",
    effort: "15 minutes",
    reflectionPrompt: "What did you discover? What's one small step you could take today?",
  },
];

function selectExperiences(goals, trends, shuffleKey) {
  const themes = new Set();

  if ((trends?.overload_pattern_strength || 0) > 50) themes.add('overload');
  if ((trends?.delegation_gap_count_7d || 0) > 0) themes.add('delegation');
  if (trends?.identity_friction_active) themes.add('reflection');

  const activeGoals = goals.filter(g => g.status === 'active');
  activeGoals.forEach(g => {
    const t = (g.title || '').toLowerCase();
    if (t.includes('delegat')) themes.add('delegation');
    if (t.includes('strateg')) themes.add('strategic');
    if (t.includes('feedback') || t.includes('conversat')) themes.add('feedback');
    if (t.includes('team') || t.includes('1:1')) themes.add('presence');
  });

  if (themes.size === 0) {
    themes.add('reflection');
    themes.add('presence');
  }

  const themed = EXPERIENCE_LIBRARY.filter(e => themes.has(e.theme));
  const rest = EXPERIENCE_LIBRARY.filter(e => !themes.has(e.theme));
  // Rotate by shuffleKey so the refresh button cycles through suggestions
  const ordered = [...themed, ...rest];
  const offset = (shuffleKey * 3) % ordered.length;
  return [...ordered.slice(offset), ...ordered.slice(0, offset)].slice(0, 3);
}

// State per experience: null | 'attempted' | 'completed'
export default function GrowExperiencesCard({ goals = [], trends = null, onOpenAtreus }) {
  const { user } = useAuth();
  const [states, setStates] = useState({}); // id → 'attempted' | 'completed'
  const [reflections, setReflections] = useState({}); // id → string
  const [showReflection, setShowReflection] = useState({}); // id → bool
  const [shuffleKey, setShuffleKey] = useState(0);

  const experiences = useMemo(
    () => selectExperiences(goals, trends, shuffleKey),
    [goals, trends, shuffleKey]
  );

  const markAttempted = (id) => {
    setStates(prev => ({ ...prev, [id]: 'attempted' }));
    base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: `Experience attempted: ${experiences.find(e => e.id === id)?.title || id}`.slice(0, 500),
    }).catch(() => {});
  };

  const markCompleted = (id) => {
    setStates(prev => ({ ...prev, [id]: 'completed' }));
    base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: `Experience completed: ${experiences.find(e => e.id === id)?.title || id}`.slice(0, 500),
    }).catch(() => {});
    // Show the inline reflection prompt instead of immediately opening Atreus
    setShowReflection(prev => ({ ...prev, [id]: true }));
  };

  const submitReflection = (id, reflectionPrompt) => {
    const text = reflections[id]?.trim();
    const msg = text
      ? `I just completed "${experiences.find(e => e.id === id)?.title}". My reflection: ${text}. ${reflectionPrompt}`
      : reflectionPrompt;
    onOpenAtreus?.(msg);
    setShowReflection(prev => ({ ...prev, [id]: false }));
  };

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Experiences</p>
            <p className="text-[10px] text-gray-400">Real-world experiments for deliberate practice</p>
          </div>
        </div>
        <button
          onClick={() => setShuffleKey(k => k + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh suggestions"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-2.5">
        {experiences.map((exp) => {
          const state = states[exp.id]; // undefined | 'attempted' | 'completed'
          const isAttempted = state === 'attempted';
          const isCompleted = state === 'completed';
          const showingReflection = showReflection[exp.id];

          return (
            <div
              key={exp.id}
              className={`p-4 rounded-xl border transition-all ${
                isCompleted ? 'bg-emerald-50 border-emerald-100'
                : isAttempted ? 'bg-amber-50 border-amber-100'
                : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold mb-1 ${isCompleted ? 'text-emerald-700' : isAttempted ? 'text-amber-800' : 'text-gray-800'}`}>
                  {exp.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">{exp.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-600">{exp.type}</span>
                  <span className="text-[10px] text-gray-400">{exp.effort}</span>
                  {isAttempted && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Attempted</span>}
                  {isCompleted && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Completed</span>}
                </div>
              </div>

              {/* Reflection prompt after completion */}
              {isCompleted && showingReflection && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#0202ff]" />
                    <p className="text-xs font-medium text-gray-700">{exp.reflectionPrompt}</p>
                  </div>
                  <Textarea
                    placeholder="Write a few words (optional)…"
                    value={reflections[exp.id] || ''}
                    onChange={(e) => setReflections(prev => ({ ...prev, [exp.id]: e.target.value }))}
                    className="text-xs resize-none h-16 rounded-xl border-gray-200"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-7"
                    onClick={() => submitReflection(exp.id, exp.reflectionPrompt)}
                  >
                    <Brain className="w-3 h-3 mr-1.5" /> Reflect with Atreus
                  </Button>
                </div>
              )}

              {isCompleted && !showingReflection && (
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-xs text-emerald-600 font-medium">Completed</p>
                  <button
                    className="ml-auto text-[10px] text-gray-400 hover:text-[#0202ff]"
                    onClick={() => setShowReflection(prev => ({ ...prev, [exp.id]: true }))}
                  >
                    Reflect again →
                  </button>
                </div>
              )}

              {!isCompleted && (
                <div className="flex gap-2 mt-3">
                  {!isAttempted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-amber-200 text-amber-700 hover:bg-amber-50"
                      onClick={() => markAttempted(exp.id)}
                    >
                      <PlayCircle className="w-3 h-3 mr-1.5" /> I tried it
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-7"
                    onClick={() => markCompleted(exp.id)}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1.5" /> Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-gray-200"
                    onClick={() => onOpenAtreus?.(`Help me think through this experiment before I try it: "${exp.title}"`)}
                  >
                    <Brain className="w-3 h-3 mr-1 text-[#0202ff]" /> Prep
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-gray-400 text-center pt-1">Suggestions based on your active goals and patterns</p>
      </CardContent>
    </Card>
  );
}