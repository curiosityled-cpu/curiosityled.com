/**
 * DecisionJournalOutcomeReview — Surfaces committed DecisionJournal entries for outcome review.
 * Shows entries 3+ days old that haven't been completed yet.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { ClipboardCheck, ChevronDown, ChevronUp, Brain, Check, CheckCircle2, MinusCircle, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
}

const OUTCOMES = [
  { value: "did_it",         label: "Did it",        Icon: CheckCircle2, color: "text-emerald-600", ring: "border-emerald-400 bg-emerald-50" },
  { value: "partly",         label: "Partly",         Icon: MinusCircle,  color: "text-amber-500",   ring: "border-amber-400 bg-amber-50" },
  { value: "not_yet",        label: "Not yet",        Icon: Circle,       color: "text-gray-400",    ring: "border-gray-300 bg-gray-50" },
  { value: "changed_course", label: "Changed course", Icon: ArrowRight,   color: "text-blue-500",    ring: "border-blue-300 bg-blue-50" },
];

function OutcomeItem({ decision, onSaved }) {
  const { openWithContext } = useAtreusChat();
  const [outcome, setOutcome] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (!outcome) return;
    setSaving(true);
    try {
      await base44.entities.DecisionJournal.update(decision.id, {
        outcome,
        outcome_notes: notes || undefined,
        outcome_date: new Date().toISOString(),
        status: 'completed',
      });
      setDone(true);
      onSaved?.();
    } catch (e) {
      console.error('Outcome save error', e);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs" style={{ color: 'hsl(160 55% 55%)' }}>
        <Check className="w-3.5 h-3.5" /> Outcome logged
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3.5 space-y-3" style={{ background: 'hsl(220 12% 12%)', border: '1px solid hsl(220 10% 20%)' }}>
      <div>
        <p className="text-[10px] font-medium mb-0.5" style={{ color: 'hsl(38 50% 55%)' }}>
          Decision · {timeAgo(decision.created_date)}
          {decision.pattern_name && <span style={{ color: 'hsl(225 60% 65%)' }}> · {decision.pattern_name}</span>}
        </p>
        <p className="text-sm font-medium leading-snug" style={{ color: 'hsl(220 15% 85%)' }}>
          {(decision.decision_text || '').slice(0, 120)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {OUTCOMES.map(({ value, label, Icon, color, ring }) => (
          <button
            key={value}
            onClick={() => setOutcome(value)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${outcome === value ? ring + " " + color : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {outcome && (
        <textarea
          placeholder={outcome === "did_it" ? "Any notes? (optional)" : "What happened? What would you do differently?"}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-muted/50 border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
          rows={2}
        />
      )}

      <div className="flex gap-2">
        {outcome && (
          <Button
            size="sm"
            className="flex-1 text-xs h-7"
            style={{ background: 'hsl(38 60% 20%)', color: 'hsl(38 75% 65%)', border: '1px solid hsl(38 40% 28%)' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Log outcome"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          style={{ background: 'hsl(220 10% 14%)', border: '1px solid hsl(220 10% 22%)', color: 'hsl(225 60% 65%)' }}
          onClick={() => openWithContext({
            context: { pageType: 'practice', flow: 'decision_outcome' },
            starterMessage: `I made a decision a few days ago: "${decision.decision_text}". ${notes ? `What actually happened: ${notes}.` : ''} Help me learn from this.`,
          })}
        >
          <Brain className="w-3 h-3 mr-1" /> Reflect
        </Button>
      </div>
    </div>
  );
}

export default function DecisionJournalOutcomeReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: reviewable = [] } = useQuery({
    queryKey: ['decision-journal-review', user?.email],
    queryFn: async () => {
      const rows = await base44.entities.DecisionJournal.filter(
        { user_email: user.email },
        '-created_date',
        30
      ).catch(() => []);
      return rows.filter(d => {
        const daysOld = (Date.now() - new Date(d.created_date).getTime()) / 86400000;
        return daysOld >= 3 && d.status !== 'completed';
      }).slice(0, 3);
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  if (reviewable.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(38 30% 22%)', background: 'hsl(38 20% 11%)' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:brightness-110"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(38 50% 18%)' }}>
          <ClipboardCheck className="w-3.5 h-3.5" style={{ color: 'hsl(38 75% 60%)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'hsl(38 60% 70%)' }}>
            {reviewable.length} decision{reviewable.length > 1 ? 's' : ''} ready for outcome review
          </p>
          <p className="text-[10px]" style={{ color: 'hsl(38 25% 48%)' }}>How did they play out?</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: 'hsl(38 40% 50%)' }} />
          : <ChevronDown className="w-4 h-4" style={{ color: 'hsl(38 40% 50%)' }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid hsl(38 20% 17%)' }}>
          <p className="text-[10px] pt-3" style={{ color: 'hsl(38 20% 48%)' }}>
            These decisions are old enough to review. Log what actually happened.
          </p>
          {reviewable.map(decision => (
            <OutcomeItem
              key={decision.id}
              decision={decision}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['decision-journal-review', user?.email] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}