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
    ],
    commitmentPrompt: "What's one specific thing you'll do differently because of this prep?",
    commitmentPlaceholder: "e.g. Open with the impact, not the behavior. Ask one question before giving my view…",
    buildCoachingFlow: (responses) => ({
      flow: 'prepare',
      title: 'Prepare',
      scenario: responses.context,
      goal: responses.goal,
      risk: responses.risk,
      practice_eligible: true,
    }),
    buildAtreusMsg: (responses) =>
      `I've just prepped for an upcoming conversation. Here's my context:\n\nSituation: ${responses.context}\nWhat I want: ${responses.goal}\nRisk I'm watching: ${responses.risk}\n\nCoach me through this — ask me one thing at a time and help me sharpen it. If it'd help, we can practice the conversation for real at some point. I'll capture my one specific move afterward.`,
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
    ],
    commitmentPrompt: "What's one thing you'd do differently next time?",
    commitmentPlaceholder: "e.g. Start with the impact, not the story. Set up the outcome before the meeting…",
    buildCoachingFlow: (responses) => ({
      flow: 'debrief',
      title: 'Debrief',
      what_happened: responses.what_happened,
      surprising: responses.surprised,
      pulled_off: responses.pulled_off,
      practice_eligible: true,
    }),
    buildAtreusMsg: (responses) =>
      `I just debriefed something that happened. Here's what I captured:\n\nWhat happened: ${responses.what_happened}\nWhat surprised me: ${responses.surprised}\nWhere I got pulled off: ${responses.pulled_off}\n\nCoach me through what this reveals — one question at a time. If it's useful, we can replay the conversation or practice a do-over. I'll capture the one thing I'd do differently next time afterward.`,
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
    ],
    commitmentPrompt: "What's the smallest possible step that would move this forward?",
    commitmentPlaceholder: "e.g. Write down the one thing I actually need to decide. Send the first sentence of that message. Say it out loud to someone…",
    buildCoachingFlow: (responses) => ({
      flow: 'work_through',
      title: 'Work through something',
      stuck: responses.stuck,
      real_block: responses.real_block,
      practice_eligible: true,
    }),
    buildAtreusMsg: (responses) =>
      `I'm working through something. Here's where I am:\n\nWhat I'm stuck on: ${responses.stuck}\nWhat I think is in the way: ${responses.real_block}\n\nCoach me through this — one question at a time, help me see it more clearly. If there's a conversation in here I'm avoiding, we can practice it. I'll capture the smallest step I can take afterward.`,
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
    ],
    commitmentPrompt: "What's one thing you want to carry forward intentionally?",
    commitmentPlaceholder: "e.g. Block that Thursday morning. Keep giving direct feedback. Delegate before I overload…",
    buildCoachingFlow: (responses) => ({
      flow: 'reflect',
      title: 'Reflect',
      went_well: responses.went_well,
      surprising: responses.surprising,
      practice_eligible: false,
    }),
    buildAtreusMsg: (responses) =>
      `I just completed a leadership reflection. Here's what I captured:\n\nWhat went well: ${responses.went_well}\nWhat surprised me: ${responses.surprising}\n\nCoach me through what patterns this touches — one question at a time. I'll capture the one thing I want to carry forward afterward.`,
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

  // Post-coaching commitment capture (prepare flow only)
  const [phase, setPhase] = useState('atreus_ready'); // 'atreus_ready' | 'commitment'
  const [commitment, setCommitment] = useState('');
  const [commitmentSaving, setCommitmentSaving] = useState(false);
  const [commitmentSaved, setCommitmentSaved] = useState(false);

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
    const notes = Object.entries(responses)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n\n');

    // Best-effort save — don't block UX on failure
    await base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: `${flow.title} session: ${responses[flow.steps[0].id] || ''}`.slice(0, 500),
      description: notes.slice(0, 1000),
    }).catch(() => {});

    // For Prepare flows: schedule a debrief prompt for end-of-day (6 hours later)
    if (flowKey === 'prepare') {
      const debriefAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      await base44.entities.ManagerPulse.create({
        user_email: user?.email,
        prompt_type: 'follow_up',
        source: 'web',
        focus_intention: `Debrief pending: ${responses[flow.steps[0].id] || ''}`.slice(0, 500),
        description: notes.slice(0, 500),
      }).catch(() => {});
      setDebriefScheduled(true);
    }

    setSaving(false);
    setDone(true);

    // Open Atreus with full coaching-flow context so it runs a true coaching
    // conversation (and can offer an authentic role-play when relevant).
    setTimeout(() => {
      openWithContext({
        context: { pageType: 'practice', coaching_flow: flow.buildCoachingFlow(responses) },
        starterMessage: flow.buildAtreusMsg(responses),
      });
    }, 400);
  };

  const handleSaveCommitment = async () => {
    if (!commitment.trim()) return;
    setCommitmentSaving(true);
    await base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: `${flow.title} commitment: ${commitment}`.slice(0, 500),
      description: `Commitment captured after ${flow.title} coaching flow.\n\n${flow.commitmentPrompt}\n${commitment}`.slice(0, 1000),
    }).catch(() => {});
    setCommitmentSaving(false);
    setCommitmentSaved(true);
  };

  if (done) {
    const hasCommitment = !!flow.commitmentPrompt;

    // Phase 1 — Atreus ready. (Shown to all flows; commitment-aware flows add a CTA.)
    if (phase === 'atreus_ready') {
      return (
        <div className="rounded-2xl border border-border p-6 text-center space-y-3 bg-card">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-muted border border-border">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-base font-semibold text-foreground">Saved — Atreus is ready</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your context is saved privately. Atreus has the full picture and is ready to coach you through it.
          </p>
          {debriefScheduled && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-left bg-muted border border-border">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                A <strong className="text-foreground">debrief prompt</strong> has been scheduled for later today — you'll see it when you check in after the moment has passed.
              </p>
            </div>
          )}
          <div className="flex justify-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="text-xs" onClick={onClose}>
              Back to Practice
            </Button>
            {hasCommitment && (
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5 bg-[#0202ff] hover:bg-[#0101dd] text-white"
                onClick={() => setPhase('commitment')}
              >
                <Brain className="w-3.5 h-3.5" /> Capture my commitment
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Phase 2 — capture the commitment after coaching.
    if (hasCommitment && phase === 'commitment') {
      return (
        <div className="rounded-2xl border border-border p-6 space-y-4 bg-card">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-muted border border-border">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-base font-semibold text-foreground">{flow.commitmentPrompt}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Now that you've talked it through with Atreus, name your commitment. It's saved privately.
            </p>
          </div>

          {commitmentSaved ? (
            <div className="flex items-start gap-2 rounded-xl px-3 py-3 bg-muted border border-border">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Commitment saved.</strong> Atreus will track this and follow up.
              </p>
            </div>
          ) : (
            <>
              <textarea
                placeholder={flow.commitmentPlaceholder || ''}
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                className="w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 leading-relaxed rounded-xl px-4 py-3 bg-background text-foreground border border-border placeholder:text-muted-foreground"
                rows={4}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={onClose}>
                  Skip for now
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8 gap-1.5 bg-[#0202ff] hover:bg-[#0101dd] text-white"
                  onClick={handleSaveCommitment}
                  disabled={!commitment.trim() || commitmentSaving}
                >
                  {commitmentSaving ? 'Saving…' : (<><CheckCircle2 className="w-3.5 h-3.5" /> Save commitment</>)}
                </Button>
              </div>
            </>
          )}

          {commitmentSaved && (
            <div className="flex justify-end pt-1">
              <Button size="sm" variant="outline" className="text-xs" onClick={onClose}>
                Back to Practice
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Fallback (flows without a commitment prompt): existing single done screen.
    return (
      <div className="rounded-2xl border border-border p-6 text-center space-y-3 bg-card">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto bg-muted border border-border">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-base font-semibold text-foreground">Saved — Atreus is ready</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your responses have been saved privately. Atreus has your full context and is ready to go deeper.
        </p>
        {debriefScheduled && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-left bg-muted border border-border">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              A <strong className="text-foreground">debrief prompt</strong> has been scheduled for later today — you'll see it when you check in after the moment has passed.
            </p>
          </div>
        )}
        <Button size="sm" variant="outline" className="text-xs" onClick={onClose}>
          Back to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
        <div>
          <p className="text-sm font-bold text-foreground">{flow.title}</p>
          <p className="text-xs mt-0.5 text-muted-foreground">{flow.subtitle}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex gap-1.5">
          {flow.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? flow.color : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="text-[10px] mt-1.5 text-muted-foreground">Step {step + 1} of {totalSteps}</p>
      </div>

      {/* Question */}
      <div className="px-5 pt-4 pb-5 space-y-3">
        <p className="text-sm font-semibold leading-snug text-foreground">{currentStep.question}</p>
        {currentStep.hint && (
          <p className="text-[11px] italic text-muted-foreground">{currentStep.hint}</p>
        )}
        <textarea
          placeholder={currentStep.placeholder}
          value={currentValue}
          onChange={e => setResponses(r => ({ ...r, [currentStep.id]: e.target.value }))}
          className="w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0202ff]/30 leading-relaxed rounded-xl px-4 py-3 bg-background text-foreground border border-border placeholder:text-muted-foreground"
          rows={4}
          autoFocus
        />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1.5 px-2 text-muted-foreground"
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
              className="text-[10px] transition-colors text-muted-foreground hover:text-foreground"
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