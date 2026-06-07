/**
 * FollowThroughCard — Close the loop between intention and action.
 * Shows prior commitment, asks for status, feeds pattern learning.
 */
import React, { useState } from "react";
import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const STATUS_OPTIONS = [
  { value: 'did_it', label: 'Did it', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { value: 'partly', label: 'Partly', icon: MinusCircle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  { value: 'not_yet', label: 'Not yet', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
];

function getMostRecentCommitment(pulses) {
  // Look for delegation commitment or focus_intention from yesterday or earlier
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  for (const p of pulses) {
    const pulseDate = p.created_date?.split('T')[0];
    if (pulseDate === todayStr) continue; // skip today
    if (p.delegation_commitment && p.delegation_commitment.trim()) {
      return { text: p.delegation_commitment, type: 'delegation', pulseId: p.id, pulseDate };
    }
    if (p.focus_intention && p.focus_intention.trim()) {
      return { text: p.focus_intention, type: 'intention', pulseId: p.id, pulseDate };
    }
  }
  return null;
}

export default function FollowThroughCard({ pulses, userEmail, onDone }) {
  const commitment = getMostRecentCommitment(pulses);
  const [selected, setSelected] = useState(null);
  const [reflection, setReflection] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!commitment || submitted) return null;

  const handleSubmit = async () => {
    setLoading(true);
    await base44.entities.ManagerPulse.create({
      user_email: userEmail,
      prompt_type: 'follow_up',
      source: 'web',
      focus_intention: reflection || `Follow-through: ${selected} on "${commitment.text}"`,
      intent_actuals_gap: selected === 'did_it' ? 'no_gap_detected' : selected === 'partly' ? 'partial_follow_through' : 'no_follow_through_detected',
    }).catch(() => {});
    setLoading(false);
    setSubmitted(true);
    onDone?.();
  };

  const dateLabel = (() => {
    if (!commitment.pulseDate) return 'recently';
    const days = Math.floor((Date.now() - new Date(commitment.pulseDate)) / 86400000);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return 'last week';
  })();

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <CardContent className="px-5 py-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Follow-through</p>
            <p className="text-xs text-gray-400">From {dateLabel}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {commitment.type === 'delegation' ? 'Delegation commitment' : 'Morning intention'}
          </p>
          <p className="text-sm font-medium text-gray-800 leading-snug">{commitment.text}</p>
        </div>

        <p className="text-xs text-gray-500">How did it go?</p>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${isSelected ? opt.bg + ' ' + opt.color : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {selected && selected !== 'did_it' && (
          <textarea
            placeholder={selected === 'partly' ? "What got in the way?" : "What stopped you? No judgment — just useful data."}
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            className="w-full text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
            rows={2}
          />
        )}

        {selected && (
          <Button
            size="sm"
            className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Log this'}
          </Button>
        )}

        {!selected && (
          <p className="text-[10px] text-gray-400 italic">This feeds your pattern memory — private to you.</p>
        )}
      </CardContent>
    </Card>
  );
}