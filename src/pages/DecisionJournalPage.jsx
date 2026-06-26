/**
 * DecisionJournalPage — Full Decision Journal experience.
 * Route: /decision-journal
 * Capture decisions with context, confidence, assumptions, risks.
 * Review outcomes 3+ days later.
 */
import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { Brain, Plus, FileText, ChevronDown, ChevronUp, CheckCircle2, Clock, Check, Sparkles, Circle, MinusCircle, ArrowRight, Pencil, X, AlertCircle, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import DecisionPreMortemPanel from "@/components/intelligence/DecisionPreMortemPanel";
import DQIStateCard from "@/components/intelligence/DQIStateCard";
import DecisionAuditDrawer from "@/components/intelligence/DecisionAuditDrawer";
import PostDecisionReviewDrawer from "@/components/intelligence/PostDecisionReviewDrawer";

const CONFIDENCE_LEVELS = [
  { value: 'low', label: "Low — I'm not sure", color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'medium', label: 'Medium — leaning one way', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'high', label: 'High — pretty clear', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
}

function NewDecisionForm({ onSave, onCancel, userEmail }) {
  const [form, setForm] = useState({
    title: '',
    context: '',
    options_considered: '',
    decision_made: '',
    assumptions: '',
    risks: '',
    confidence: 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateWithAI = async () => {
    if (!aiSummary.trim()) {
      toast.error('Please describe the decision you\'re facing');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A manager is documenting a strategic decision. Based on their summary, help them think through the decision by generating thoughtful responses for each field.

Manager's Decision Summary: "${aiSummary}"

Generate a JSON response with these fields (keep each under 300 characters):
{
  "title": "A clear, concise title for this decision",
  "rationale": "Why this decision matters and what prompted it",
  "options_considered": "What alternatives were considered",
  "decision_made": "What they're leaning toward and why",
  "assumptions": "Key assumptions underlying this decision",
  "risks": "Main risks if this direction doesn't work out"
}

Be practical, thoughtful, and grounded. Use the manager's own language where possible.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            rationale: { type: 'string' },
            options_considered: { type: 'string' },
            decision_made: { type: 'string' },
            assumptions: { type: 'string' },
            risks: { type: 'string' },
          },
          required: ['title', 'rationale', 'options_considered', 'decision_made', 'assumptions', 'risks'],
        },
      });

      setForm({
        title: result.title || '',
        context: result.rationale || '',
        options_considered: result.options_considered || '',
        decision_made: result.decision_made || '',
        assumptions: result.assumptions || '',
        risks: result.risks || '',
        confidence: 'medium',
      });
      setUseAI(false);
      setAiSummary('');
      toast.success('Decision fields generated');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate decision fields');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Describe the decision"); return; }
    setSaving(true);
    try {
      await onSave(form);
      toast.success("Decision captured — you can review the outcome in a few days.");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (useAI) {
    return (
      <Card className="shadow-sm border border-[#0202ff]/20 bg-white rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Smart Decision Assistant</p>
        </div>
        <CardContent className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Describe the decision you're facing</label>
            <Textarea
              placeholder="Share what's on your mind. What's the core decision, who's involved, what's the timeline?"
              value={aiSummary}
              onChange={e => setAiSummary(e.target.value)}
              className="text-sm h-20 resize-none"
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setUseAI(false); setAiSummary(''); }}
              className="text-sm"
            >
              Back
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm"
              onClick={handleGenerateWithAI}
              disabled={isGenerating || !aiSummary.trim()}
            >
              {isGenerating ? 'Generating…' : 'Generate fields'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-[#0202ff]/20 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
        <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-sm font-semibold text-gray-900">Capture a decision</p>
      </div>
      <CardContent className="px-5 py-4 space-y-4">
        <button
          onClick={() => setUseAI(true)}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-4 h-4" /> Use Smart Decision Assistant
        </button>
        <p className="text-xs text-gray-600 text-center">Let AI help you think through this decision</p>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-600">Or fill in manually</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">What decision are you facing? *</label>
          <Input
            placeholder="e.g., Whether to promote Sarah or bring in an external candidate"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="text-sm"
          />
        </div>

        {/* Pre-Mortem Panel — appears once title is long enough */}
        <DecisionPreMortemPanel decisionText={form.title} userEmail={userEmail} />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Context — why does this matter?</label>
          <Textarea
            placeholder="Who's affected? What's the timeline? What's at stake?"
            value={form.context}
            onChange={e => setForm({ ...form, context: e.target.value })}
            className="text-sm h-16 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Options you're weighing</label>
          <Textarea
            placeholder="What alternatives have you considered?"
            value={form.options_considered}
            onChange={e => setForm({ ...form, options_considered: e.target.value })}
            className="text-sm h-14 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Key assumptions</label>
            <Textarea
              placeholder="What are you assuming to be true?"
              value={form.assumptions}
              onChange={e => setForm({ ...form, assumptions: e.target.value })}
              className="text-sm h-14 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Risks if you're wrong</label>
            <Textarea
              placeholder="What's the downside if this doesn't work?"
              value={form.risks}
              onChange={e => setForm({ ...form, risks: e.target.value })}
              className="text-sm h-14 resize-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">What are you leaning toward?</label>
          <Textarea
            placeholder="Your current inclination and reasoning"
            value={form.decision_made}
            onChange={e => setForm({ ...form, decision_made: e.target.value })}
            className="text-sm h-14 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Confidence level</label>
          <div className="flex gap-2 flex-wrap">
            {CONFIDENCE_LEVELS.map(c => (
              <button
                key={c.value}
                onClick={() => setForm({ ...form, confidence: c.value })}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  form.confidence === c.value ? c.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="text-sm" onClick={onCancel}>Cancel</Button>
          <Button
            className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-sm"
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
          >
            {saving ? 'Saving…' : 'Capture decision'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const OUTCOME_OPTS = [
  { value: 'did_it',        label: 'Did it',        Icon: CheckCircle2, color: 'text-emerald-600', ring: 'border-emerald-400 bg-emerald-50' },
  { value: 'partly',        label: 'Partly',        Icon: MinusCircle,  color: 'text-amber-500',   ring: 'border-amber-400 bg-amber-50' },
  { value: 'not_yet',       label: 'Not yet',       Icon: Circle,       color: 'text-gray-400',    ring: 'border-gray-300 bg-gray-50' },
  { value: 'changed_course',label: 'Changed course',Icon: ArrowRight,   color: 'text-blue-500',   ring: 'border-blue-300 bg-blue-50' },
];

const OUTCOME_LABELS = {
  did_it: 'Did it', partly: 'Partly', not_yet: 'Not yet', changed_course: 'Changed course'
};

function DecisionCard({ decision, onLogOutcome, onEdit, onReview }) {
  const { openWithContext } = useAtreusChat();
  const [expanded, setExpanded] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [outcomeText, setOutcomeText] = useState('');
  const [saved, setSaved] = useState(decision.status === 'completed');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const readyForReview = decision.status !== 'completed';

  const handleEditSave = async () => {
    if (!editForm.title.trim()) return;
    setEditSaving(true);
    try {
      await onEdit(decision.id, editForm);
      setEditing(false);
      setEditForm(null);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  // Use top-level fields directly; fall back to legacy JSON-in-outcome_notes for old records
  let fields = {
    options_considered: decision.options_considered || '',
    decision_made: decision.decision_made || '',
    assumptions: decision.assumptions || '',
    risks: decision.risks || '',
    confidence: decision.confidence || '',
  };
  let plainOutcomeNote = decision.outcome_notes || null;
  // Legacy: if outcome_notes is a JSON blob from old records, extract it
  const rawNotes = decision.outcome_notes || '';
  if (rawNotes.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawNotes);
      if (!fields.options_considered) fields.options_considered = parsed.options_considered || '';
      if (!fields.decision_made) fields.decision_made = parsed.decision_made || '';
      if (!fields.assumptions) fields.assumptions = parsed.assumptions || '';
      if (!fields.risks) fields.risks = parsed.risks || '';
      if (!fields.confidence) fields.confidence = parsed.confidence || '';
      plainOutcomeNote = parsed.outcome_text || null;
    } catch {}
  }

  const handleSaveOutcome = async () => {
    if (!selectedOutcome) return;
    setSaving(true);
    await onLogOutcome(decision, selectedOutcome, outcomeText);
    setSaving(false);
    setSaved(true);
  };

  const startEdit = () => {
    setEditForm({
      title: decision.decision_text || '',
      context: decision.rationale || '',
      options_considered: decision.options_considered || fields.options_considered || '',
      decision_made: decision.decision_made || fields.decision_made || '',
      assumptions: decision.assumptions || fields.assumptions || '',
      risks: decision.risks || fields.risks || '',
      confidence: decision.confidence || fields.confidence || 'medium',
    });
    setEditing(true);
  };

  const confLabel = CONFIDENCE_LEVELS.find(c => c.value === fields.confidence);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-8 h-8 rounded-xl bg-[#0202ff]/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-[#0202ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground leading-snug truncate">
            {decision.decision_text}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{timeAgo(decision.created_date)}</span>
            {decision.pattern_name && <span className="text-[10px] font-medium text-[#0202ff]/70">{decision.pattern_name}</span>}
            {confLabel && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${confLabel.color}`}>{confLabel.label.split(' — ')[0]}</span>}
            {readyForReview && !saved && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700">Log outcome</Badge>}
            {saved && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700">Outcome logged</Badge>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && editing && editForm && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-foreground">Edit decision</p>
            <button onClick={() => { setEditing(false); setEditForm(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Decision *</label>
            <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Context / Rationale</label>
            <Textarea value={editForm.context} onChange={e => setEditForm({ ...editForm, context: e.target.value })} className="text-sm h-14 resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Options considered</label>
            <Textarea value={editForm.options_considered} onChange={e => setEditForm({ ...editForm, options_considered: e.target.value })} className="text-sm h-14 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Assumptions</label>
              <Textarea value={editForm.assumptions} onChange={e => setEditForm({ ...editForm, assumptions: e.target.value })} className="text-sm h-14 resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Risks</label>
              <Textarea value={editForm.risks} onChange={e => setEditForm({ ...editForm, risks: e.target.value })} className="text-sm h-14 resize-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Leaning toward</label>
            <Textarea value={editForm.decision_made} onChange={e => setEditForm({ ...editForm, decision_made: e.target.value })} className="text-sm h-14 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Confidence</label>
            <div className="flex gap-2 flex-wrap">
              {CONFIDENCE_LEVELS.map(c => (
                <button key={c.value} onClick={() => setEditForm({ ...editForm, confidence: c.value })}
                  className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${editForm.confidence === c.value ? c.color + ' ring-2 ring-offset-1 ring-current' : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { setEditing(false); setEditForm(null); }}>Cancel</Button>
            <Button size="sm" className="flex-1 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={handleEditSave} disabled={editSaving || !editForm.title.trim()}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}

      {expanded && !editing && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          <div className="flex justify-end pt-2">
            <button
              onClick={startEdit}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-[#0202ff] transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit decision
            </button>
          </div>
          {decision.rationale && (
            <div className="pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Context / Rationale</p>
              <p className="text-xs text-foreground leading-relaxed">{decision.rationale}</p>
            </div>
          )}
          {fields.options_considered && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Options considered</p>
              <p className="text-xs text-foreground leading-relaxed">{fields.options_considered}</p>
            </div>
          )}
          {fields.decision_made && (
            <div className="p-2.5 bg-[#0202ff]/5 rounded-xl border border-[#0202ff]/15">
              <p className="text-[10px] font-semibold text-[#0202ff] uppercase tracking-wide mb-0.5">Leaning toward</p>
              <p className="text-xs text-foreground leading-relaxed">{fields.decision_made}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {fields.assumptions && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Assumptions</p>
                <p className="text-xs text-foreground leading-relaxed">{fields.assumptions}</p>
              </div>
            )}
            {fields.risks && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Risks</p>
                <p className="text-xs text-foreground leading-relaxed">{fields.risks}</p>
              </div>
            )}
          </div>
          {/* DQI State — show for all non-outcome decisions, or at top of outcome */}
          {!decision.outcome && (
            <DQIStateCard decision={decision} />
          )}

          {/* Show existing outcome if already captured */}
          {decision.outcome && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Outcome: {OUTCOME_LABELS[decision.outcome] || decision.outcome.replace(/_/g, ' ')}</p>
              {plainOutcomeNote && <p className="text-xs text-foreground leading-relaxed">{plainOutcomeNote}</p>}
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {!decision.would_repeat && (
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setShowReview(true)}
                  >
                    Review process
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-[#0202ff]/30 text-[#0202ff]"
                  onClick={() => openWithContext({
                    context: { pageType: 'practice', flow: 'decision_quality' },
                    starterMessage: `I want to improve my decision-making quality. I made this decision: "${decision.decision_text}". The outcome was: ${OUTCOME_LABELS[decision.outcome]}. ${plainOutcomeNote ? `Notes: ${plainOutcomeNote}.` : ''} What patterns do you see and how can I make better decisions like this in the future?`,
                  })}
                >
                  <Brain className="w-3 h-3 mr-1" /> Work with Atreus
                </Button>
              </div>
              {decision.would_repeat && (
                <div className="pt-2 text-xs text-emerald-700 bg-emerald-100 rounded p-2">
                  <strong>Learning:</strong> {decision.would_repeat}
                </div>
              )}
            </div>
          )}

          {/* Outcome review */}
          {readyForReview && !saved && (
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-amber-700">How did it play out?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {OUTCOME_OPTS.map(({ value, label, Icon, color, ring }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedOutcome(value)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${selectedOutcome === value ? ring + ' ' + color : 'bg-muted/60 border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              {selectedOutcome && (
                <Textarea
                  placeholder={selectedOutcome === 'did_it' ? 'Any notes on how it went? (optional)' : 'What happened? What would you do differently?'}
                  value={outcomeText}
                  onChange={e => setOutcomeText(e.target.value)}
                  className="text-xs resize-none h-16 rounded-xl"
                />
              )}
              {selectedOutcome && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 bg-[#0202ff] hover:bg-[#0101dd] text-white"
                    onClick={handleSaveOutcome}
                    disabled={saving}
                  >
                    <Check className="w-3 h-3 mr-1" /> {saving ? 'Saving…' : 'Log outcome'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-[#0202ff]/30 text-[#0202ff]"
                    onClick={() => openWithContext({
                      context: { pageType: 'practice', flow: 'decision_quality' },
                      starterMessage: `I want to improve my decision-making. I decided: "${decision.decision_text}". Outcome so far: ${OUTCOME_LABELS[selectedOutcome] || selectedOutcome}. ${outcomeText ? `Notes: ${outcomeText}.` : ''} Help me learn from this and improve my decision quality.`,
                    })}
                  >
                    <Brain className="w-3 h-3 mr-1" /> Work with Atreus
                  </Button>
                </div>
              )}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Outcome logged
            </div>
          )}
        </div>
      )}

      {/* Post-Decision Review Drawer */}
      {showReview && (
        <PostDecisionReviewDrawer
          decision={decision}
          onClose={() => setShowReview(false)}
          onSave={() => {
            onReview?.();
            setShowReview(false);
          }}
        />
      )}
    </div>
  );
}

export default function DecisionJournalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openWithContext } = useAtreusChat();
  const [showForm, setShowForm] = useState(false);
  const [auditingDecision, setAuditingDecision] = useState(null);
  const [calibrationData, setCalibrationData] = useState(null);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decision-journal-full', user?.email],
    queryFn: async () => {
      try {
        const results = await base44.entities.DecisionJournal.filter(
          { user_email: user.email },
          '-created_date',
          50
        );
        // Fetch calibration data in background when we have completed decisions
        const completed = results.filter(d => d.outcome);
        if (completed.length >= 3) {
          base44.functions.invoke('analyzeDecisionQuality', { mode: 'calibration' })
            .then(res => setCalibrationData(res.data))
            .catch(() => {});
        }
        return results;
      } catch { return []; }
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
  });

  const handleSave = async (form) => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const weekOf = d.toISOString().split('T')[0];

    await base44.entities.DecisionJournal.create({
      user_email: user.email,
      decision_text: form.title,
      rationale: form.context || '',
      options_considered: form.options_considered || '',
      decision_made: form.decision_made || '',
      assumptions: form.assumptions || '',
      risks: form.risks || '',
      confidence: form.confidence || 'medium',
      status: 'committed',
      week_of: weekOf,
    });
    queryClient.invalidateQueries({ queryKey: ['decision-journal-full', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['ml-pending-decisions', user?.email] });
    setShowForm(false);
  };

  const handleEdit = async (id, form) => {
    await base44.entities.DecisionJournal.update(id, {
      decision_text: form.title,
      rationale: form.context || '',
      options_considered: form.options_considered || '',
      decision_made: form.decision_made || '',
      assumptions: form.assumptions || '',
      risks: form.risks || '',
      confidence: form.confidence || 'medium',
    });
    queryClient.invalidateQueries({ queryKey: ['decision-journal-full', user?.email] });
    queryClient.invalidateQueries({ queryKey: ['ml-pending-decisions', user?.email] });
    toast.success("Decision updated.");
  };

  const handleLogOutcome = async (decision, outcome, outcomeText) => {
    await base44.entities.DecisionJournal.update(decision.id, {
      outcome,
      outcome_date: new Date().toISOString(),
      status: 'completed',
      outcome_notes: outcomeText || '',
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['decision-journal-full', user?.email] });

    // Pattern-based debrief: trigger Atreus for disappointing outcomes
    if (outcome === 'changed_course' || outcome === 'partly') {
      try {
        const res = await base44.functions.invoke('analyzeDecisionQuality', {
          mode: 'debrief',
          decision_id: decision.id,
          decision_text: decision.decision_text,
          outcome,
          outcome_notes: outcomeText || '',
        });
        const debriefData = res.data;
        if (debriefData?.opening_prompt) {
          // Small delay so the outcome save UI settles first
          setTimeout(() => {
            openWithContext({
              context: { pageType: 'practice', flow: 'decision_debrief', decision_id: decision.id },
              starterMessage: debriefData.opening_prompt,
              draftMessage: debriefData.debrief_message
                ? `${debriefData.debrief_message}\n\n${debriefData.opening_prompt}`
                : null,
            });
          }, 800);
        }
      } catch {
        // debrief is non-blocking
      }
    }
  };

  const pendingCount = decisions.filter(d => d.status !== 'completed').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="pt-1">
          <h1 className="text-2xl font-bold text-foreground">Decision Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">Capture high-stakes decisions. Review outcomes. Learn your patterns.</p>
        </div>
        <Button
          size="sm"
          className="bg-[#0202ff] hover:bg-[#0101dd] text-white gap-1.5 mt-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4" /> Capture decision
        </Button>
      </div>

      {/* Pending review banner */}
      {pendingCount > 0 && !showForm && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            {pendingCount} decision{pendingCount > 1 ? 's are' : ' is'} awaiting an outcome — tap any to log how it went
          </p>
        </div>
      )}

      {/* New decision form */}
      {showForm && (
        <NewDecisionForm onSave={handleSave} onCancel={() => setShowForm(false)} userEmail={user?.email} />
      )}

      {/* Decision Audit Drawer */}
      {auditingDecision && (
        <DecisionAuditDrawer
          decision={auditingDecision}
          userEmail={user?.email}
          onClose={() => setAuditingDecision(null)}
          onSave={() => {
            setAuditingDecision(null);
            queryClient.invalidateQueries({ queryKey: ['decision-journal-full', user?.email] });
          }}
        />
      )}



      {/* Decision list */}
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-[#0202ff] rounded-full animate-spin" />
        </div>
      ) : decisions.length === 0 ? (
        <Card className="shadow-sm border border-dashed border-border rounded-2xl">
          <CardContent className="py-12 px-6 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-card-foreground mb-1">No decisions logged yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4 leading-relaxed">
              Capture important decisions as you face them — context, confidence level, and assumptions. Come back in a few days to review outcomes and spot patterns.
            </p>
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#0202ff] hover:bg-[#0101dd] text-white">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Capture your first decision
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {decisions.map(d => (
            <div key={d.id} className="group relative">
              <DecisionCard decision={d} onLogOutcome={handleLogOutcome} onEdit={handleEdit} onReview={() => queryClient.invalidateQueries({ queryKey: ['decision-journal-full', user?.email] })} />
              {/* Audit button (shown on draft decisions) */}
              {d.status === 'committed' && !d.outcome && (
                <button
                  onClick={() => setAuditingDecision(d)}
                  className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-[#0202ff] hover:text-[#0101dd] flex items-center gap-1"
                  title="Run decision quality audit"
                >
                  <Sparkles className="w-3 h-3" /> Audit
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Inline Analytics ── */}
      {decisions.length >= 2 && <DecisionAnalyticsInline decisions={decisions} user={user} />}
    </div>
  );
}

// ── Inline analytics component ────────────────────────────────────────────────

const GAP_LABELS = {
  frame: 'Problem Framing', alternatives: 'Evaluating Alternatives',
  information: 'Evidence Quality', tradeoffs: 'Making Trade-offs Explicit',
  reasoning: 'Pre-Mortem / Logic', commitment: 'Execution Commitment',
};

function DecisionAnalyticsInline({ decisions, user }) {
  const queryClient = useQueryClient();
  const [creatingGoalFor, setCreatingGoalFor] = useState(null);

  const { data: existingGoals = [] } = useQuery({
    queryKey: ['dq-goals', user?.email],
    queryFn: () => base44.entities.Goal.filter({ created_by: user.email, status: 'active' }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const auditedDecisions = decisions.filter(d => d.dqi_completeness > 0);
  const avgDQI = auditedDecisions.length > 0
    ? (auditedDecisions.reduce((s, d) => s + (d.dqi_completeness || 0), 0) / auditedDecisions.length).toFixed(1)
    : null;

  // Aggregate linked_competencies across all audited decisions
  const competencyGapMap = {};
  for (const d of decisions) {
    if (!d.linked_competencies?.length) continue;
    for (const lc of d.linked_competencies) {
      if (!competencyGapMap[lc.competency_id]) {
        competencyGapMap[lc.competency_id] = { id: lc.competency_id, name: lc.competency_name, gaps: new Set(), count: 0 };
      }
      competencyGapMap[lc.competency_id].gaps.add(lc.dq_gap);
      competencyGapMap[lc.competency_id].count++;
    }
  }
  const topGaps = Object.values(competencyGapMap)
    .map(c => ({ ...c, gaps: Array.from(c.gaps) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const goalIds = new Set(existingGoals.flatMap(g => g.linked_competency_ids || []));

  const handleCreateGoal = async (id, name, count, gaps) => {
    setCreatingGoalFor(id);
    try {
      const isRealId = id.length > 20;
      await base44.entities.Goal.create({
        title: `Develop ${name} through deliberate decision practice`,
        description: `Surfaced in ${count} decision audit${count !== 1 ? 's' : ''}. Gaps: ${gaps.map(g => GAP_LABELS[g] || g).join(', ')}.`,
        goal_type: 'standard',
        linked_competency_ids: isRealId ? [id] : [],
        status: 'active',
        visibility: 'private',
      });
      queryClient.invalidateQueries({ queryKey: ['dq-goals', user?.email] });
      toast.success(`Goal created for ${name}`);
    } catch {
      toast.error('Failed to create goal');
    } finally {
      setCreatingGoalFor(null);
    }
  };

  const patterns = {
    total: decisions.length,
    strongFraming: decisions.filter(d => d.decision_text && d.decision_scope).length,
    strongCommitment: decisions.filter(d => d.next_step && d.review_trigger).length,
    withOutcome: decisions.filter(d => d.outcome).length,
  };

  return (
    <div className="pt-6 border-t border-border space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#0202ff]" />
        <h2 className="text-base font-bold text-foreground">Decision Patterns</h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: patterns.total },
          { label: 'Outcomes Logged', value: patterns.withOutcome },
          { label: 'Avg DQI', value: avgDQI ? `${avgDQI}/5` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className="text-lg font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Development opportunities from audit data */}
      {topGaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Development Opportunities
          </p>
          {topGaps.map(gap => {
            const hasGoal = goalIds.has(gap.id);
            return (
              <div key={gap.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{gap.name}</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    {gap.gaps.map(g => GAP_LABELS[g] || g).join(' · ')} · {gap.count} audit{gap.count !== 1 ? 's' : ''}
                  </p>
                </div>
                {hasGoal ? (
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 flex-shrink-0">
                    <Check className="w-2.5 h-2.5 mr-1" /> Goal active
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2 border-[#0202ff]/30 text-[#0202ff] flex-shrink-0"
                    onClick={() => handleCreateGoal(gap.id, gap.name, gap.count, gap.gaps)}
                    disabled={creatingGoalFor === gap.id}
                  >
                    <Plus className="w-2.5 h-2.5 mr-1" />{creatingGoalFor === gap.id ? 'Adding…' : 'Add goal'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Strengths */}
      {(patterns.strongFraming > 0 || patterns.strongCommitment > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Decision Strengths
          </p>
          {patterns.strongFraming > 0 && (
            <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-foreground">Strong Framing</p>
              <p className="text-[10px] text-emerald-700">{patterns.strongFraming} of {patterns.total} decisions have clear scope defined</p>
            </div>
          )}
          {patterns.strongCommitment > 0 && (
            <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-foreground">Execution Focus</p>
              <p className="text-[10px] text-emerald-700">{patterns.strongCommitment} of {patterns.total} decisions have next steps and review triggers set</p>
            </div>
          )}
        </div>
      )}

      {topGaps.length === 0 && auditedDecisions.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-muted/40 border border-dashed border-border">
          <Target className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Run a decision audit on any committed decision to see competency development patterns here.</p>
        </div>
      )}
    </div>
  );
}