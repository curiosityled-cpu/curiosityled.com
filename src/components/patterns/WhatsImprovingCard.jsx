/**
 * WhatsImprovingCard — Reinforce progress, keep the system from feeling only diagnostic.
 * Shows observed gains, supporting evidence, and what seems to be helping.
 */
import React from "react";
import { TrendingUp, CheckCircle2, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function buildImprovements(trends, pulses, goals) {
  const gains = [];

  // Energy improving
  if (trends?.energy_trend === 'improving') {
    gains.push({
      label: "Energy trending up",
      evidence: "Your check-ins show a consistent upward shift in reported energy over the last 14 days.",
      source: "14-day check-ins",
    });
  }

  // Confidence improving
  if (trends?.confidence_trend === 'improving') {
    gains.push({
      label: "Confidence building",
      evidence: "Your self-reported confidence has been rising. That's a signal worth acknowledging.",
      source: "14-day check-ins",
    });
  }

  // Resilience improving
  if (trends?.resilience_trend === 'improving') {
    gains.push({
      label: "Resilience recovering",
      evidence: "You've been bouncing back from setbacks more readily in recent weeks.",
      source: "14-day check-ins",
    });
  }

  // Delegation gap closing
  if (trends?.delegation_gap_count_7d === 0 && trends?.delegation_intent_count_7d > 0) {
    gains.push({
      label: "Delegation follow-through",
      evidence: "You set delegation intentions this week and the day's rhythm matched. That alignment is progress.",
      source: "Intent vs actuals",
    });
  }

  // Goal progress
  const movingGoals = goals.filter(g => g.status === 'active' && (g.progress || 0) >= 50);
  if (movingGoals.length > 0) {
    gains.push({
      label: `Goal momentum on ${movingGoals.length === 1 ? `"${movingGoals[0].title}"` : `${movingGoals.length} goals`}`,
      evidence: "You've made meaningful progress on active goals — over halfway there.",
      source: "Goal tracker",
    });
  }

  // Operator risk decreasing
  if (trends?.operator_risk_trajectory === 'decreasing') {
    gains.push({
      label: "Overload pattern easing",
      evidence: "The overload-to-overcontrol signal has been decreasing. Something you're doing is working.",
      source: "Pattern tracker",
    });
  }

  // Streak: check-in consistency
  if (pulses.length >= 5) {
    const recent7 = pulses.filter(p => {
      const d = new Date(p.created_date);
      return (Date.now() - d.getTime()) < 7 * 86400000;
    });
    if (recent7.length >= 4) {
      gains.push({
        label: "Strong check-in rhythm",
        evidence: `${recent7.length} check-ins in the last 7 days — consistent self-awareness is a leadership skill.`,
        source: "Check-in streak",
      });
    }
  }

  return gains.slice(0, 3);
}

export default function WhatsImprovingCard({ trends, pulses = [], goals = [] }) {
  const gains = buildImprovements(trends, pulses, goals);

  if (gains.length === 0) return null;

  return (
    <Card className="shadow-sm rounded-2xl overflow-hidden border border-border bg-card">
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">What's improving</p>
          <p className="text-[10px] text-muted-foreground">Observed gains · Private to you</p>
        </div>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-2.5">
        {gains.map((gain, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">{gain.label}</p>
              <p className="text-xs mt-0.5 leading-relaxed text-muted-foreground">{gain.evidence}</p>
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100">
                {gain.source}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-1">
          <Star className="w-3 h-3 text-amber-500" />
          <p className="text-[10px] text-muted-foreground">Progress is real even when it's hard to see day to day.</p>
        </div>
      </CardContent>
    </Card>
  );
}