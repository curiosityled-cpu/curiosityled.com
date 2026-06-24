/**
 * DQIStateCard — Decision Quality Index state display.
 * Shows non-judgmental readiness indicator: early_draft → solid_start → well_considered → ready_to_commit
 * Replaces confidence calibration (which was subjective/hindsight-biased).
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Zap } from 'lucide-react';

const DQI_STATES = {
  early_draft: {
    label: 'Early Draft',
    description: 'Framing and key questions emerging',
    color: 'bg-slate-100 border-slate-300 text-slate-700',
    badgeVariant: 'outline',
    icon: AlertCircle,
  },
  solid_start: {
    label: 'Solid Start',
    description: 'Alternatives identified, evidence gathering',
    color: 'bg-blue-100 border-blue-300 text-blue-700',
    badgeVariant: 'outline',
    icon: Zap,
  },
  well_considered: {
    label: 'Well Considered',
    description: 'Trade-offs explicit, assumptions clear',
    color: 'bg-amber-100 border-amber-300 text-amber-700',
    badgeVariant: 'outline',
    icon: Check,
  },
  ready_to_commit: {
    label: 'Ready to Commit',
    description: 'Process is sound, next steps defined',
    color: 'bg-emerald-100 border-emerald-300 text-emerald-700',
    badgeVariant: 'outline',
    icon: Check,
  },
};

export default function DQIStateCard({ decision }) {
  const state = decision?.dqi_state || 'early_draft';
  const completeness = decision?.dqi_completeness ?? 0;
  const stateInfo = DQI_STATES[state];
  const Icon = stateInfo.icon;

  // Compute readiness percentage: each state is roughly 25%
  const stateOrder = ['early_draft', 'solid_start', 'well_considered', 'ready_to_commit'];
  const stateIndex = stateOrder.indexOf(state);
  const stateProgress = ((stateIndex + 1) / stateOrder.length) * 100;

  // Use completeness score (0-5) if available, otherwise estimate from state
  const overallProgress = completeness > 0 ? (completeness / 5) * 100 : stateProgress;

  return (
    <Card className={`border-2 ${stateInfo.color}`}>
      <CardContent className="pt-4 space-y-3">
        {/* State label + icon */}
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">{stateInfo.label}</p>
            <p className="text-xs text-gray-600">{stateInfo.description}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700">Decision Quality Progress</span>
            <span className="text-xs font-bold text-gray-700">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                state === 'ready_to_commit' ? 'bg-emerald-600' :
                state === 'well_considered' ? 'bg-amber-600' :
                state === 'solid_start' ? 'bg-blue-600' :
                'bg-slate-600'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Completeness indicator */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <strong>Completeness:</strong> {completeness}/5 core DQ elements captured
          </p>
          <ul className="space-y-0.5 pl-3 text-gray-500">
            <li>✓ Clear scope & decision made</li>
            {decision?.structured_alternatives?.length > 0 && <li>✓ Alternatives documented</li>}
            {decision?.knowns?.length > 0 && <li>✓ Evidence gathered</li>}
            {decision?.tradeoffs_accepted?.length > 0 && <li>✓ Trade-offs explicit</li>}
            {decision?.failure_mode && <li>✓ Pre-mortem completed</li>}
          </ul>
        </div>

        {/* Call-to-action based on state */}
        <div className="pt-1 text-xs text-gray-700 italic border-t border-gray-300">
          {state === 'early_draft' && 'Next: Identify 2-3 realistic alternatives and what you are NOT deciding.'}
          {state === 'solid_start' && 'Next: Gather evidence for each alternative and surface your key assumptions.'}
          {state === 'well_considered' && 'Next: Run a pre-mortem to stress-test your choice and define your next steps.'}
          {state === 'ready_to_commit' && 'You are ready. Document your decision and execute with confidence in your process.'}
        </div>
      </CardContent>
    </Card>
  );
}