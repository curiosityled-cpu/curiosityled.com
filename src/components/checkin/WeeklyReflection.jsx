/**
 * WeeklyReflection — the weekly ritual.
 *
 * Wins, setbacks, energy check, behavioral consistency, intentions for next week.
 * Stored as ManagerPulse with prompt_type: 'weekly_reflection'.
 * Fully private. Non-corporate language.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Brain, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  {
    id: 'energy',
    question: "How does this week feel in your body, honestly?",
    subtext: "Not what you'd say in a meeting. What's the actual truth.",
    type: 'tap',
    options: [
      { value: 'drained', label: 'Drained', emoji: '🪫' },
      { value: 'stretched', label: 'Stretched', emoji: '😮‍💨' },
      { value: 'steady', label: 'Steady', emoji: '🙂' },
      { value: 'strong', label: 'Strong', emoji: '💪' },
    ],
  },
  {
    id: 'win',
    question: "What's one thing from this week you feel good about?",
    subtext: "Small counts. A good conversation, a decision you stood behind, a moment of clarity.",
    type: 'text',
    placeholder: "It doesn't have to be big...",
    optional: true,
  },
  {
    id: 'friction',
    question: "What didn't go the way you wanted?",
    subtext: "No judgment. Just honest.",
    type: 'text',
    placeholder: "Something that felt off, or didn't land...",
    optional: true,
  },
  {
    id: 'intention',
    question: "If you could carry one thing into next week differently, what would it be?",
    subtext: "One thing. Not a list.",
    type: 'text',
    placeholder: "Next week I want to...",
    optional: true,
  },
  {
    id: 'load',
    question: "How was the load this week?",
    subtext: "Overall — not just time, but mental weight too.",
    type: 'tap',
    options: [
      { value: 'light', label: 'Light', emoji: '🌤' },
      { value: 'manageable', label: 'Manageable', emoji: '✅' },
      { value: 'heavy', label: 'Heavy', emoji: '🏋️' },
      { value: 'unsustainable', label: 'Too much', emoji: '🆘' },
    ],
  },
];

export default function WeeklyReflection({ onComplete, onSkip }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleTap = (value) => {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
    // Auto-advance on tap for quick feel
    setTimeout(() => {
      if (isLast) handleSubmit({ ...answers, [current.id]: value });
      else setStep(s => s + 1);
    }, 200);
  };

  const handleNext = () => {
    if (isLast) handleSubmit(answers);
    else setStep(s => s + 1);
  };

  const handleSubmit = async (finalAnswers) => {
    setSaving(true);
    try {
      const tonePref = await base44.entities.TonePreference.filter({ user_email: user.email }, null, 1);
      
      await base44.entities.ManagerPulse.create({
        user_email: user.email,
        prompt_type: 'weekly_reflection',
        energy_level: finalAnswers.energy,
        perceived_load: finalAnswers.load,
        biggest_weight_today: finalAnswers.friction || null,
        focus_intention: finalAnswers.intention || null,
        focus_category: 'other',
        source: 'web',
        client_id: user?.data?.client_id || user?.client_id || null,
      });

      setDone(true);
      setTimeout(() => onComplete?.(), 1200);
    } catch (err) {
      console.error('WeeklyReflection save error:', err);
      toast.error('Could not save reflection — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Card className="shadow-sm border border-emerald-100 bg-emerald-50/40 rounded-2xl">
        <CardContent className="px-5 py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 mb-1">Reflection saved</p>
          <p className="text-xs text-gray-500">
            Atreus will use this to build a clearer picture of your rhythm over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-[#0202ff]/15 bg-white rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-[#0202ff] transition-all duration-300"
          style={{ width: `${((step) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Weekly reflection</p>
            <p className="text-[10px] text-gray-400">{step + 1} of {STEPS.length}</p>
          </div>
        </div>
        {onSkip && (
          <button onClick={onSkip} className="text-gray-300 hover:text-gray-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <CardContent className="px-5 pb-5 pt-3 space-y-4">
        <div>
          <p className="text-base font-semibold text-gray-900 leading-snug">{current.question}</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{current.subtext}</p>
        </div>

        {current.type === 'tap' && (
          <div className="grid grid-cols-2 gap-2">
            {current.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleTap(opt.value)}
                disabled={saving}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                  answers[current.id] === opt.value
                    ? 'bg-[#0202ff] border-[#0202ff] text-white'
                    : 'bg-gray-50 border-gray-200 hover:border-[#0202ff]/30 hover:bg-[#0202ff]/5'
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className={`text-sm font-medium ${answers[current.id] === opt.value ? 'text-white' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {current.type === 'text' && (
          <div className="space-y-3">
            <textarea
              className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#0202ff]/40 focus:bg-white transition-colors"
              rows={3}
              placeholder={current.placeholder}
              value={answers[current.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
            />
            <div className="flex justify-between items-center">
              {current.optional && (
                <button
                  onClick={handleNext}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Skip this one
                </button>
              )}
              <Button
                size="sm"
                className="ml-auto bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
                onClick={handleNext}
                disabled={saving}
              >
                {isLast ? (saving ? 'Saving...' : 'Finish') : 'Next'}
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}