/**
 * ConfidenceCalibrationCard
 *
 * Shown at the top of DecisionJournalPage when the manager has enough data.
 * Visualizes the correlation between their stated confidence and actual outcomes.
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CONF_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
const CONF_COLORS = {
  high: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  medium: { bar: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  low: { bar: 'bg-rose-400', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
};

export default function ConfidenceCalibrationCard({ calibration, patternFlags = [], totalCompleted = 0 }) {
  if (!calibration || totalCompleted < 3) return null;

  const hasOverconfidence = patternFlags.includes('overconfidence_bias');
  const hasUnderconfidence = patternFlags.includes('underconfidence_bias');

  const entries = ['high', 'medium', 'low']
    .map(level => ({ level, data: calibration[level] }))
    .filter(e => e.data?.total > 0);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#0202ff]" />
        <p className="text-xs font-semibold text-card-foreground">Your Confidence Calibration</p>
        <span className="text-[10px] text-muted-foreground ml-auto">{totalCompleted} decisions reviewed</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {entries.map(({ level, data }) => {
          const colors = CONF_COLORS[level];
          const rate = data.success_rate;
          return (
            <div key={level} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-medium ${colors.text}`}>{CONF_LABELS[level]} confidence</span>
                <span className="text-muted-foreground">{rate}% positive outcome · {data.total} decision{data.total > 1 ? 's' : ''}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })}

        {(hasOverconfidence || hasUnderconfidence) && (
          <div className="mt-1 pt-2 border-t border-border">
            {hasOverconfidence && (
              <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Your high-confidence decisions often change course. Consider stress-testing your certainty before committing.</span>
              </p>
            )}
            {hasUnderconfidence && (
              <p className="text-[11px] text-emerald-700 flex items-start gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Your cautious calls tend to land well. You may be underselling your own judgment.</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}