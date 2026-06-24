/**
 * DecisionAuditDrawer — 6-step guided Decision Quality audit using Atreus coaching.
 * Pre-decision flow: guides through framing, alternatives, information, trade-offs, logic, and commitment.
 * Saves progressively to DecisionJournal fields.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ChevronRight, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getRubricForType } from './DecisionAuditRubrics';

const AUDIT_STEPS_GENERIC = [
  {
    id: 1,
    title: 'Frame the decision',
    prompt: "What's the core decision you're making?",
    followUp: "What is outside the scope of this decision?",
    fieldMap: { primary: 'decision_text', secondary: 'decision_scope' },
    guidance: "Framing is the foundation — a poorly scoped decision creates bad analysis even if later reasoning is disciplined.",
  },
  {
    id: 2,
    title: 'Surface real alternatives',
    prompt: 'What are 2–3 real options you\'re weighing?',
    followUp: 'What alternative would a smart skeptic want you to consider?',
    fieldMap: { primary: 'structured_alternatives' },
    guidance: 'Real alternatives must be feasible, materially different, and not just decoys that make your preferred option look stronger.',
  },
  {
    id: 3,
    title: 'Check information quality',
    prompt: 'What evidence are you relying on, and what\'s uncertain?',
    followUp: 'What are you assuming rather than knowing?',
    fieldMap: { primary: 'knowns', secondary: 'critical_assumptions' },
    guidance: 'High-quality decisions are transparent about weak evidence and make hidden assumptions visible.',
  },
  {
    id: 4,
    title: 'Make trade-offs explicit',
    prompt: 'What are you optimizing for (speed, fairness, cost, morale, risk)?',
    followUp: 'What cost, risk, or value are you willing to trade off?',
    fieldMap: { primary: 'primary_value', secondary: 'tradeoffs_accepted' },
    guidance: 'Naming the trade-off signals a higher-quality process than framing a choice as costless.',
  },
  {
    id: 5,
    title: 'Test the logic',
    prompt: 'Why is this option better than the others?',
    followUp: 'If this decision fails, what\'s the most likely reason (pre-mortem)?',
    fieldMap: { primary: 'decision_made', secondary: 'failure_mode' },
    guidance: 'Pre-mortem analysis challenges overconfidence and exposes weak reasoning before commitment.',
  },
  {
    id: 6,
    title: 'Commit to execution and review',
    prompt: 'What will you do next, by when?',
    followUp: 'What would tell you this decision needs revisiting?',
    fieldMap: { primary: 'next_step', secondary: 'review_trigger' },
    guidance: 'Commitment to action is part of decision quality — a choice without follow-through isn\'t fully made.',
  },
];

function calculateDQI(auditData) {
  let points = 0;
  if (auditData.decision_text?.trim()) points++; // Clear frame
  if (auditData.structured_alternatives?.length >= 2) points++; // At least two alternatives
  if (auditData.critical_assumptions?.length > 0 || auditData.knowns?.length > 0) points++; // Assumptions documented
  if (auditData.primary_value?.trim()) points++; // Explicit trade-off
  if (auditData.next_step?.trim() || auditData.review_trigger?.trim()) points++; // Review commitment
  return Math.min(points, 5);
}

function getDQIState(points) {
  if (points === 0 || points === 1) return 'early_draft';
  if (points === 2 || points === 3) return 'solid_start';
  if (points === 4) return 'well_considered';
  return 'ready_to_commit';
}

function getDQILabel(state) {
  const map = {
    early_draft: 'Early draft',
    solid_start: 'Solid start',
    well_considered: 'Well considered',
    ready_to_commit: 'Ready to commit',
  };
  return map[state] || state;
}

export default function DecisionAuditDrawer({ decision, onClose, onSave, userEmail }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [auditData, setAuditData] = useState({
    decision_text: decision?.decision_text || '',
    decision_scope: decision?.decision_scope || '',
    decision_type: decision?.decision_type || 'operational',
    structured_alternatives: decision?.structured_alternatives || [],
    knowns: decision?.knowns || [],
    critical_assumptions: decision?.critical_assumptions || [],
    primary_value: decision?.primary_value || '',
    tradeoffs_accepted: decision?.tradeoffs_accepted || [],
    decision_made: decision?.decision_made || '',
    failure_mode: decision?.failure_mode || '',
    next_step: decision?.next_step || '',
    review_trigger: decision?.review_trigger || '',
  });
  const [primaryInput, setPrimaryInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('observation'); // for tracking step 3
  const [saving, setSaving] = useState(false);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);

  // Get decision-type-specific rubric
  const rubric = getRubricForType(auditData.decision_type);
  const AUDIT_STEPS = rubric.steps.map(s => ({
    ...s,
    fieldMap: AUDIT_STEPS_GENERIC[s.id - 1]?.fieldMap || {},
  }));

  const step = AUDIT_STEPS[currentStep];
  const dqiPoints = calculateDQI(auditData);
  const dqiState = getDQIState(dqiPoints);
  const isLastStep = currentStep === AUDIT_STEPS.length - 1;

  useEffect(() => {
    // Initialize inputs from auditData for this step
    if (step.fieldMap.primary === 'structured_alternatives') {
      setPrimaryInput(auditData.structured_alternatives?.length > 0 ? 'Alternatives set' : '');
    } else if (step.fieldMap.primary === 'knowns') {
      setPrimaryInput(auditData.knowns?.join('; ') || '');
    } else if (step.fieldMap.primary === 'tradeoffs_accepted') {
      setPrimaryInput(auditData.tradeoffs_accepted?.join('; ') || '');
    } else {
      setPrimaryInput(auditData[step.fieldMap.primary] || '');
    }
    setSecondaryInput(auditData[step.fieldMap.secondary] || '');
  }, [currentStep, step, auditData]);

  const handleProceedToNext = async () => {
    // Validate primary input
    if (!primaryInput.trim()) {
      toast.error(`Please answer: ${step.prompt}`);
      return;
    }

    // Save to auditData
    const updated = { ...auditData };
    if (step.fieldMap.primary === 'structured_alternatives') {
      // For alternatives, just mark as provided; in real UI we'd have structured input
      updated.structured_alternatives = [{ id: '1', option_text: primaryInput, is_preferred: true }];
    } else if (step.fieldMap.primary === 'knowns') {
      // Track evidence source for each known
      updated.knowns = primaryInput.split(';').map(x => x.trim()).filter(x => x);
      updated.evidence_sources = primaryInput.split(';').map((text, i) => ({
        id: `${i}`,
        text: text.trim(),
        source_type: evidenceSource,
      })).filter(x => x.text);
    } else if (step.fieldMap.primary === 'tradeoffs_accepted') {
      updated.tradeoffs_accepted = primaryInput.split(';').map(x => x.trim()).filter(x => x);
    } else {
      updated[step.fieldMap.primary] = primaryInput;
    }
    if (step.fieldMap.secondary && secondaryInput.trim()) {
      updated[step.fieldMap.secondary] = secondaryInput;
    }
    setAuditData(updated);

    // Move to next step or show completion
    if (isLastStep) {
      setShowCompletionFeedback(true);
    } else {
      setCurrentStep(currentStep + 1);
      setPrimaryInput('');
      setSecondaryInput('');
    }
  };

  const handleSaveAudit = async () => {
    setSaving(true);
    try {
      const dqiPoints = calculateDQI(auditData);
      const dqiState = getDQIState(dqiPoints);

      const updates = {
        decision_text: auditData.decision_text,
        decision_scope: auditData.decision_scope,
        decision_type: auditData.decision_type,
        structured_alternatives: auditData.structured_alternatives,
        knowns: auditData.knowns,
        critical_assumptions: auditData.critical_assumptions,
        primary_value: auditData.primary_value,
        tradeoffs_accepted: auditData.tradeoffs_accepted,
        decision_made: auditData.decision_made,
        failure_mode: auditData.failure_mode,
        next_step: auditData.next_step,
        review_trigger: auditData.review_trigger,
        dqi_state: dqiState,
        dqi_completeness: dqiPoints,
      };

      if (decision?.id) {
        await base44.entities.DecisionJournal.update(decision.id, updates);
      } else {
        // Create new decision with audit data
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const weekOf = d.toISOString().split('T')[0];

        await base44.entities.DecisionJournal.create({
          user_email: userEmail,
          status: 'committed',
          week_of: weekOf,
          ...updates,
        });
      }

      toast.success('Decision audit saved — you\'re ready to commit.');
      onSave?.(auditData);
      onClose();
    } catch (error) {
      console.error('Error saving audit:', error);
      toast.error('Failed to save audit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Decision Audit — {rubric.label}</p>
            <p className="text-sm text-card-foreground font-medium mt-0.5 truncate">{auditData.decision_text || 'New decision'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted flex">
          <div
            className="bg-[#0202ff] transition-all"
            style={{ width: `${((currentStep + 1) / AUDIT_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {!showCompletionFeedback ? (
            <>
              {/* Step title and guidance */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[#0202ff]/60">Step {currentStep + 1} of {AUDIT_STEPS.length}</span>
                  <h2 className="text-lg font-bold text-foreground">{step.title}</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">{step.guidance}</p>
              </div>

              {/* Primary prompt */}
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-semibold text-card-foreground">{step.prompt}</label>
                {step.fieldMap.primary === 'structured_alternatives' ? (
                    <Input
                      placeholder="List your main alternatives (separate by semicolon if multiple)"
                      value={primaryInput}
                      onChange={e => setPrimaryInput(e.target.value)}
                      className="text-sm"
                    />
                  ) : step.fieldMap.primary === 'knowns' ? (
                    <>
                      <Textarea
                        placeholder="List your evidence/facts (separate by semicolon if multiple)"
                        value={primaryInput}
                        onChange={e => setPrimaryInput(e.target.value)}
                        className="text-sm h-20 resize-none"
                        autoFocus
                      />
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-semibold text-card-foreground">Evidence source</label>
                        <select
                          value={evidenceSource}
                          onChange={e => setEvidenceSource(e.target.value)}
                          className="text-sm border border-input rounded-md px-3 py-2 bg-background"
                        >
                          <option value="data">Data / Metrics</option>
                          <option value="observation">Observation / Experience</option>
                          <option value="stakeholder_input">Stakeholder Input</option>
                          <option value="assumption">Assumption</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <Textarea
                      placeholder={`Your response...`}
                      value={primaryInput}
                      onChange={e => setPrimaryInput(e.target.value)}
                      className="text-sm h-20 resize-none"
                      autoFocus
                    />
                  )}
              </div>

              {/* Secondary prompt */}
              {step.followUp && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-card-foreground">{step.followUp}</label>
                  <Textarea
                    placeholder="Your response (optional if primary is complete)..."
                    value={secondaryInput}
                    onChange={e => setSecondaryInput(e.target.value)}
                    className="text-sm h-16 resize-none"
                  />
                </div>
              )}

              {/* DQI indicator */}
              <div className="pt-3 p-3 bg-muted/40 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Audit Completeness</span>
                  <span className="text-xs font-bold text-[#0202ff]">{dqiPoints}/5 points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getDQILabel(dqiState)} — You're on track.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Completion screen */}
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Audit complete</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You've pressure-tested this decision. Your decision quality state: <span className="font-semibold text-[#0202ff]">{getDQILabel(dqiState)}</span>
                </p>
                <div className="pt-2 space-y-2 bg-muted/40 rounded-lg p-4 border border-border text-left">
                  <p className="text-xs font-semibold text-muted-foreground">Coaching reflection:</p>
                  {dqiPoints < 5 && (
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      {dqiPoints < 1 && <li>Frame your decision more clearly — what's in/out of scope?</li>}
                      {auditData.structured_alternatives?.length < 2 && <li>Consider at least two real alternatives before committing.</li>}
                      {auditData.critical_assumptions?.length === 0 && auditData.knowns?.length === 0 && <li>Make hidden assumptions visible — what are you assuming to be true?</li>}
                      {!auditData.primary_value?.trim() && <li>Identify what you're optimizing for — speed, fairness, cost, morale, or risk?</li>}
                      {!auditData.next_step?.trim() && <li>Set a clear next step and review trigger before moving forward.</li>}
                    </ul>
                  )}
                  {dqiPoints === 5 && <p className="text-xs text-emerald-600 font-medium">Strong audit — you've covered all the key elements. You're ready to move forward with confidence in your process.</p>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-2">
          {!showCompletionFeedback ? (
            <>
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-sm"
                >
                  Back
                </Button>
              )}
              <Button
                className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-sm gap-1.5"
                onClick={handleProceedToNext}
              >
                {isLastStep ? 'Review' : 'Next'} <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompletionFeedback(false);
                  setCurrentStep(currentStep - 1);
                }}
                className="text-sm"
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm gap-1.5"
                onClick={handleSaveAudit}
                disabled={saving}
              >
                <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save audit & commit'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}