/**
 * PostDecisionReviewDrawer — Post-decision review separating process quality from outcome.
 * Prevents hindsight bias: managers can conclude "outcome was poor, but process was sound."
 * Asks: Did assumptions hold? Did new info emerge? Was process still sound? What would you repeat?
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const OUTCOME_LABELS = {
  did_it: 'Did it',
  partly: 'Partly',
  not_yet: 'Not yet',
  changed_course: 'Changed course',
};

export default function PostDecisionReviewDrawer({ decision, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [reviewData, setReviewData] = useState({
    assumptions_held: decision?.assumptions_held ?? null,
    new_information_emerged: decision?.new_information_emerged ?? null,
    process_quality_still_sound: decision?.process_quality_still_sound ?? null,
    would_repeat: decision?.would_repeat || '',
  });
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: 'Did your key assumptions hold?',
      guidance: 'Revisit the assumptions you documented before deciding. Did reality match what you expected?',
      field: 'assumptions_held',
      yesText: 'Yes, they held',
      noText: 'No, they didn\'t',
    },
    {
      title: 'Did new information emerge that you couldn\'t have known?',
      guidance: 'This separates bad decision-making from bad luck. New info you couldn\'t have predicted isn\'t a process failure.',
      field: 'new_information_emerged',
      yesText: 'Yes, new info changed things',
      noText: 'No, nothing surprising',
    },
    {
      title: 'Given what you knew at the time, was your process still sound?',
      guidance: 'Evaluate your decision logic, not the outcome. A good process can have a poor outcome due to chance.',
      field: 'process_quality_still_sound',
      yesText: 'Yes, process was solid',
      noText: 'No, I see gaps now',
    },
    {
      title: 'What would you repeat next time?',
      guidance: 'Capture one specific thing from your process you would use again, or one thing you would change.',
      field: 'would_repeat',
      isText: true,
    },
  ];

  const currentStep = steps[step];

  const handleSelectBoolean = (value) => {
    setReviewData({ ...reviewData, [currentStep.field]: value });
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleTextChange = (value) => {
    setReviewData({ ...reviewData, [currentStep.field]: value });
  };

  const handleSave = async () => {
    if (!reviewData.would_repeat?.trim()) {
      toast.error('Please share what you would repeat next time');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.DecisionJournal.update(decision.id, {
        assumptions_held: reviewData.assumptions_held,
        new_information_emerged: reviewData.new_information_emerged,
        process_quality_still_sound: reviewData.process_quality_still_sound,
        would_repeat: reviewData.would_repeat,
      });
      toast.success('Review saved — you have completed your decision loop.');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  // Show completion summary
  if (step === steps.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Review Complete</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 bg-muted/40 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-700">1</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Key assumptions</p>
                <p className="text-sm text-foreground">
                  {reviewData.assumptions_held ? '✓ Your assumptions held' : '✗ Your assumptions did not hold'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-amber-700">2</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">New information</p>
                <p className="text-sm text-foreground">
                  {reviewData.new_information_emerged ? '✓ New info emerged' : '✓ No surprises'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-700">3</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Process quality</p>
                <p className="text-sm text-foreground">
                  {reviewData.process_quality_still_sound ? '✓ Process was sound' : '△ Process had gaps'}
                </p>
              </div>
            </div>
          </div>

          {/* Coaching insight */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="pt-4 text-sm space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Coaching insight
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                {!reviewData.assumptions_held && reviewData.process_quality_still_sound && (
                  'Your process was sound, but your assumptions missed the mark. Next time, stress-test your key assumptions earlier.'
                )}
                {reviewData.process_quality_still_sound && reviewData.new_information_emerged && (
                  'Good news: your process was solid, and external factors changed. You cannot control everything—focus on decision rigor, not outcomes.'
                )}
                {!reviewData.process_quality_still_sound && (
                  'You have spotted gaps in your process. Review your notes and use them for your next decision. That is how quality improves.'
                )}
                {reviewData.process_quality_still_sound && !reviewData.new_information_emerged && !reviewData.assumptions_held && (
                  'Your assumptions were off, but your process was solid. Refine your assumption-testing for next time, then move forward.'
                )}
              </p>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>What you learned:</strong> {reviewData.would_repeat}
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(steps.length - 1)}
              className="text-sm"
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Close loop'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post-Decision Review</p>
            <p className="text-sm text-card-foreground font-medium mt-0.5 truncate">{decision?.decision_text || 'Decision'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-muted flex">
          <div
            className="bg-[#0202ff] transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-[#0202ff]/60">
                Question {step + 1} of {steps.length}
              </span>
              <h2 className="text-lg font-bold text-foreground">{currentStep.title}</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">{currentStep.guidance}</p>
          </div>

          {/* Outcome badge reminder */}
          <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Outcome: {OUTCOME_LABELS[decision?.outcome] || decision?.outcome}
            </Badge>
            <p className="text-xs text-muted-foreground">Reviewing this decision now</p>
          </div>

          {/* Response area */}
          {currentStep.isText ? (
            <div className="space-y-2 pt-2">
              <Textarea
                placeholder="What will you do the same next time? What would you change? Be specific."
                value={reviewData.would_repeat}
                onChange={e => handleTextChange(e.target.value)}
                className="text-sm h-24 resize-none"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2 pt-2 flex gap-2">
              <button
                onClick={() => handleSelectBoolean(true)}
                className="flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-700"
              >
                {currentStep.yesText}
              </button>
              <button
                onClick={() => handleSelectBoolean(false)}
                className="flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all bg-white hover:bg-amber-50 border-amber-300 text-amber-700"
              >
                {currentStep.noText}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="text-sm">
              Back
            </Button>
          )}
          {currentStep.isText && (
            <Button
              className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-sm"
              onClick={() => setStep(steps.length)}
              disabled={!reviewData.would_repeat?.trim()}
            >
              Review summary
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}