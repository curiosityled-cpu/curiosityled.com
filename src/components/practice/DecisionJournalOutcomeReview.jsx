/**
 * DecisionJournalOutcomeReview — Surfaces old journal entries for outcome review.
 * Brief spec: "later outcome review" — mechanism to review old decisions and log what happened.
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAtreusChat } from "@/components/ai/AtreusContext";
import { ClipboardCheck, ChevronDown, ChevronUp, Brain, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
}

export default function DecisionJournalOutcomeReview() {
  const { user } = useAuth();
  const { openWithContext } = useAtreusChat();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [outcomes, setOutcomes] = useState({}); // id → text
  const [saved, setSaved] = useState({}); // id → bool

  // Load decision journal entries — both new format (prompt_type='decision_journal')
  // and legacy format (follow_up pulses with "Decision" in focus_intention)
  const { data: decisions = [] } = useQuery({
    queryKey: ['decision-journal', user?.email],
    queryFn: async () => {
      const [newEntries, legacyEntries] = await Promise.all([
        base44.entities.ManagerPulse.filter(
          { user_email: user.email, prompt_type: 'decision_journal' },
          '-created_date',
          30
        ).catch(() => []),
        base44.entities.ManagerPulse.filter(
          { user_email: user.email, prompt_type: 'follow_up' },
          '-created_date',
          50
        ).then(all => all.filter(p =>
          p.focus_intention?.toLowerCase().includes('decision') &&
          !p.description?.includes('outcome_review:')
        )).catch(() => []),
      ]);
      // Merge and deduplicate by id, newest first
      const merged = [...newEntries, ...legacyEntries];
      const seen = new Set();
      return merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // Only surface entries that are 3+ days old (ripe for outcome review)
  const reviewable = decisions.filter(d => {
    const daysOld = (Date.now() - new Date(d.created_date).getTime()) / 86400000;
    return daysOld >= 3;
  }).slice(0, 3);

  if (reviewable.length === 0) return null;

  const handleSaveOutcome = async (decision) => {
    const text = outcomes[decision.id]?.trim();
    if (!text) return;

    await base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: `Decision outcome: ${(decision.focus_intention || decision.biggest_weight_today || '').slice(0, 200)}`,
      description: `outcome_review: ${text}`.slice(0, 1000),
    }).catch(() => {});
    setSaved(prev => ({ ...prev, [decision.id]: true }));
    queryClient.invalidateQueries({ queryKey: ['decision-journal', user?.email] });
  };

  const handleReflect = (decision) => {
    const text = outcomes[decision.id]?.trim();
    openWithContext({
      context: { pageType: 'practice', flow: 'decision_outcome' },
      starterMessage: `I made a decision a few days ago: "${decision.focus_intention?.replace('Decision journal session: ', '')}". ${text ? `What actually happened: ${text}.` : ''} Can you help me learn from this and see if it reveals anything about my decision-making patterns?`,
    });
  };

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
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'hsl(38 40% 50%)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'hsl(38 40% 50%)' }} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid hsl(38 20% 17%)' }}>
          <p className="text-[10px] pt-3" style={{ color: 'hsl(38 20% 48%)' }}>
            These decisions are old enough to review. Log what actually happened.
          </p>
          {reviewable.map(decision => (
            <div
              key={decision.id}
              className="rounded-xl p-3.5 space-y-3"
              style={{ background: 'hsl(220 12% 12%)', border: '1px solid hsl(220 10% 20%)' }}
            >
              <div>
                <p className="text-[10px] font-medium mb-0.5" style={{ color: 'hsl(38 50% 55%)' }}>
                  Decision · {timeAgo(decision.created_date)}
                </p>
                <p className="text-sm font-medium leading-snug" style={{ color: 'hsl(220 15% 85%)' }}>
                  {(decision.biggest_weight_today || decision.focus_intention?.replace('Decision journal session: ', '') || '').slice(0, 100)}
                </p>
              </div>

              {saved[decision.id] ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(160 55% 55%)' }}>
                  <Check className="w-3.5 h-3.5" />
                  Outcome logged
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="What actually happened? What would you do differently?"
                    value={outcomes[decision.id] || ''}
                    onChange={e => setOutcomes(prev => ({ ...prev, [decision.id]: e.target.value }))}
                    className="text-xs resize-none h-16 rounded-xl"
                    style={{ background: 'hsl(220 10% 15%)', border: '1px solid hsl(220 10% 22%)', color: 'hsl(220 15% 80%)' }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-7"
                      style={{ background: 'hsl(38 60% 20%)', color: 'hsl(38 75% 65%)', border: '1px solid hsl(38 40% 28%)' }}
                      onClick={() => handleSaveOutcome(decision)}
                      disabled={!outcomes[decision.id]?.trim()}
                    >
                      Log outcome
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      style={{ background: 'hsl(220 10% 14%)', border: '1px solid hsl(220 10% 22%)', color: 'hsl(225 60% 65%)' }}
                      onClick={() => handleReflect(decision)}
                    >
                      <Brain className="w-3 h-3 mr-1" /> Reflect
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}