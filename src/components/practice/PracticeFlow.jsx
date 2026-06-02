/**
 * PracticeFlow — Guided multi-step coaching flows for Practice.
 * Implements structured capture for: Prepare, Debrief, Reflect, Work Through.
 * Each flow is a series of focused prompts that save to ManagerPulse and open Atreus with full context.
 * Brief spec: "step-by-step coaching flow", "save planned move", "schedule follow-up debrief", "update memory and patterns"
 */
import React, { useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";

// ─── Flow Definitions ────────────────────────────────────────────────────────

const FLOWS = {
  prepare: {
    title: "Prepare",
    subtitle: "Get ready before the moment arrives.",
    color: "bg-[#0202ff]",
    border: "border-[#0202ff]/20",
    bg: "from-[#0202ff]/5",
    steps: [
      {
        id: "context",
        question: "What's coming up that you want to prepare for?",
        placeholder: "e.g. A feedback conversation with Jamie, Tuesday's stakeholder review, a tough 1:1…",
        hint: "Be as specific as you can — specific context creates better preparation.",
        type: "textarea",
      },
      {
        id: "goal",
        question: "What's the one outcome you most want from this?",
        placeholder: "e.g. For them to understand the impact, to agree on a clear path forward, to leave aligned…",
        hint: "One outcome is more useful than three.",
        type: "textarea",
      },
      {
        id: "risk",
        question: "What's most likely to pull you off course?",
        placeholder: "e.g. Avoiding the hardest part, letting them take over the narrative, getting defensive…",
        hint: "Naming the risk is often half the preparation.",
        type: "textarea",
      },
      {
        id: "move",
        question: "What's one specific thing you'll do differently because of this prep?",
        placeholder: "e.g. Open with the impact, not the behavior. Ask one question before giving my view…",
        hint: "This becomes your planned move — it's saved privately.",
        type: "textarea",
      },
    ],
    buildAtreusMsg: (responses) =>
      `I've just prepped for an upcoming conversation. Here's my context:\n\nSituation: ${responses.context}\nWhat I want: ${responses.goal}\nRisk I'm watching: ${responses.risk}\nPlanned move: ${responses.move}\n\nCan you help me sharpen this and think through anything I might have missed?`,
  },

  debrief: {
    title: "Debrief",
    subtitle: "Close the loop. Learn from what happened.",
    color: "bg-emerald-600",
    border: "border-emerald-100",
    bg: "from-emerald-50/40",
    steps: [
      {
        id: "what_happened",
        question: "What just happened? Describe it briefly.",
        placeholder: "e.g. Had the performance conversation with Alex. It went sideways when…",
        hint: "Keep it factual — just what happened, not yet what it meant.",
        type: "textarea",
      },
      {
        id: "surprised",
        question: "What surprised you?",
        placeholder: "e.g. How quickly they got defensive. How well I stayed calm. How little I'd actually prepared…",
        hint: "Surprises are the richest learning signal.",
        type: "textarea",
      },
      {
        id: "pulled_off",
        question: "Where did you get pulled off course — if anywhere?",
        placeholder: "e.g. I softened the message too much. I let them redirect the conversation. I didn't say the hard thing…",
        hint: "Honest reflection here feeds your pattern memory.",
        type: "textarea",
      },
      {
        id: "next_time",
        question: "What's one thing you'd do differently next time?",
        placeholder: "e.g. Start with the impact, not the story. Set up the outcome before the meeting…",
        hint: "One specific change beats five general ones.",
        type: "textarea",
      },
    ],
    buildAtreusMsg: (responses) =>
      `I just debriefed something that happened. Here's what I captured:\n\nWhat happened: ${responses.what_happened}\nWhat surprised me: ${responses.surprised}\nWhere I got pulled off: ${responses.pulled_off}\nWhat I'd do next time: ${responses.next_time}\n\nHelp me understand what this reveals about my patterns and whether there's something useful I should carry forward.`,
  },

  work_through: {
    title: "Work through something",
    subtitle: "Name it. Understand it. Find a next step.",
    color: "bg-amber-500",
    border: "border-amber-100",
    bg: "from-amber-50/40",
    steps: [
      {
        id: "stuck",
        question: "What are you stuck on, avoiding, or carrying right now?",
        placeholder: "e.g. A decision I keep postponing. A conversation I keep rewriting. A feeling I can't name…",
        hint: "You don't need to understand it yet — just describe it.",
        type: "textarea",
      },
      {
        id: "real_block",
        question: "What do you think is actually in the way?",
        placeholder: "e.g. I'm not sure what the right move is. I'm worried how they'll react. It feels bigger than it probably is…",
        hint: "Be honest with yourself — even if the answer feels uncomfortable.",
        type: "textarea",
      },
      {
        id: "smallest_step",
        question: "What's the smallest possible step that would move this forward?",
        placeholder: "e.g. Write down the one thing I actually need to decide. Send the first sentence of that message. Say it out loud to someone…",
        hint: "Smallest is the key word — avoid the urge to solve it all at once.",
        type: "textarea",
      },
    ],
    buildAtreusMsg: (responses) =>
      `I'm working through something. Here's where I am:\n\nWhat I'm stuck on: ${responses.stuck}\nWhat I think is in the way: ${responses.real_block}\nSmallest step I can see: ${responses.smallest_step}\n\nCan you help me think this through more clearly and find a concrete next move?`,
  },

  reflect: {
    title: "Reflect",
    subtitle: "Pause. See what's real. Carry what matters forward.",
    color: "bg-violet-600",
    border: "border-violet-100",
    bg: "from-violet-50/40",
    steps: [
      {
        id: "went_well",
        question: "What went well this week or in this period?",
        placeholder: "e.g. The team stepped up on the deadline. I had a real conversation with Priya. I protected a morning…",
        hint: "Don't skip this — noticing progress is part of the practice.",
        type: "textarea",
      },
      {
        id: "surprising",
        question: "What surprised you — about yourself or about the situation?",
        placeholder: "e.g. How much the team appreciated the direct feedback. How drained I felt after Monday…",
        hint: "Surprises often contain the most useful signal.",
        type: "textarea",
      },
      {
        id: "carry_forward",
        question: "What's one thing you want to carry forward intentionally?",
        placeholder: "e.g. Block that Thursday morning. Keep giving direct feedback. Delegate before I overload…",
        hint: "This becomes part of your commitment pattern.",
        type: "textarea",
      },
    ],
    buildAtreusMsg: (responses) =>
      `I just completed a leadership reflection. Here's what I captured:\n\nWhat went well: ${responses.went_well}\nWhat surprised me: ${responses.surprising}\nWhat I want to carry forward: ${responses.carry_forward}\n\nHelp me understand what patterns this touches and whether there's anything worth paying attention to as I move forward.`,
  },
};

// ─── Flow Component ───────────────────────────────────────────────────────────

export default function PracticeFlow({ flowKey, onClose }) {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [debriefScheduled, setDebriefScheduled] = useState(false);

  const flow = FLOWS[flowKey];
  if (!flow) return null;

  const currentStep = flow.steps[step];
  const totalSteps = flow.steps.length;
  const isLast = step === totalSteps - 1;
  const currentValue = responses[currentStep?.id] || '';
  const canProceed = currentValue.trim().length > 0;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const notes = Object.entries(responses)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n\n');

      await base44.entities.ManagerPulse.create({
        user_email: user?.email,
        prompt_type: 'follow_up',
        source: 'web',
        focus_intention: `${flow.title} session: ${responses[flow.steps[0].id] || ''}`.slice(0, 500),
        description: notes.slice(0, 1000),
      });

      // For Prepare flows: schedule a follow-up debrief notification for tomorrow
      if (flowKey === 'prepare') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(17, 0, 0, 0); // 5pm tomorrow
        try {
          await base44.entities.Notification.create({
            user_email: user?.email,
            type: 'system_prompt',
            title: 'Debrief: How did it go?',
            message: `Yesterday you prepared for: "${responses[flow.steps[0].id] || 'a conversation'}". Take 5 minutes to debrief what happened.`,
            scheduled_for: tomorrow.toISOString(),
            is_read: false,
            related_entity_type: 'practice_debrief',
          });
          setDebriefScheduled(true);
        } catch {}
      }
    } catch {}

    setSaving(false);
    setDone(true);

    setTimeout(() => {
      openWithContext({
        context: { pageType: 'practice', flow: flowKey },
        starterMessage: flow.buildAtreusMsg(responses),
      });
    }, 400);
  };

  if (done) {
    return (
      <div className={`bg-gradient-to-br ${flow.bg} to-white rounded-2xl border ${flow.border} p-6 text-center space-y-3`}>
        <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-base font-semibold text-gray-900">Saved — Atreus is ready</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your responses have been saved privately. Atreus has your full context and is ready to go deeper.
        </p>
        {debriefScheduled && (
          <p className="text-[11px] text-[#0202ff]/70 bg-[#0202ff]/5 border border-[#0202ff]/10 rounded-xl px-3 py-2">
            A debrief reminder has been scheduled for tomorrow at 5pm — to close the loop on how it went.
          </p>
        )}
        <Button size="sm" variant="outline" className="text-xs border-gray-200" onClick={onClose}>
          Back to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${flow.bg} to-white rounded-2xl border ${flow.border} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
        <div>
          <p className="text-sm font-bold text-gray-900">{flow.title}</p>
          <p className="text-xs text-gray-500">{flow.subtitle}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex gap-1.5">
          {flow.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? flow.color : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Step {step + 1} of {totalSteps}</p>
      </div>

      {/* Question */}
      <div className="px-5 pt-4 pb-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{currentStep.question}</p>
        {currentStep.hint && (
          <p className="text-[11px] text-gray-400 italic">{currentStep.hint}</p>
        )}
        <textarea
          placeholder={currentStep.placeholder}
          value={currentValue}
          onChange={e => setResponses(r => ({ ...r, [currentStep.id]: e.target.value }))}
          className="w-full text-sm text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/20 leading-relaxed"
          rows={4}
          autoFocus
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-gray-400 hover:text-gray-600 gap-1.5 px-2"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <Button
            size="sm"
            className={`${flow.color} hover:opacity-90 text-white text-xs h-8 gap-1.5 min-w-[120px]`}
            onClick={handleNext}
            disabled={!canProceed || saving}
          >
            {saving ? 'Saving…' : isLast ? (
              <><Brain className="w-3.5 h-3.5" /> Continue with Atreus</>
            ) : (
              <>Next <ArrowRight className="w-3.5 h-3.5" /></>
            )}
          </Button>
        </div>

        {/* Skip option */}
        {!isLast && (
          <div className="text-center">
            <button
              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setStep(s => s + 1)}
            >
              Skip this question →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}