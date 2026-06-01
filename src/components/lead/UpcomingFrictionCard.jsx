/**
 * UpcomingFrictionCard — Warn without alarming.
 * Collapsed to a small amber indicator by default; expands inline on click.
 */
import React, { useState } from "react";
import { AlertCircle, ArrowRight, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function detectFriction(trends, pulses) {
  const frictions = [];

  if (trends?.operator_risk_trajectory === 'increasing' && trends?.overload_pattern_strength > 50) {
    frictions.push({
      signal: "Overload trajectory",
      prediction: "You've been absorbing high load for several days. Without a pattern break, this tends to compress decision quality and increase reactive behavior.",
      suggestion: "Block one hour of protected thinking time this week.",
      cta: "Plan delegation",
      link: "/practice",
    });
  }

  if (trends?.delegation_gap_count_7d > 1) {
    frictions.push({
      signal: "Delegation gap",
      prediction: "You've committed to delegating multiple times this week but the pattern hasn't changed. This gap tends to widen under pressure.",
      suggestion: "Name one specific task and one specific person before the end of today.",
      cta: "Work through it",
      link: "/practice",
    });
  }

  if (trends?.learning_stall_detected) {
    frictions.push({
      signal: "Learning stall",
      prediction: "Development activity has dropped for several weeks. This is often the first thing cut under load — but it's also the first thing that compounds.",
      suggestion: "Schedule 30 minutes for one learning item this week.",
      cta: "View development",
      link: "/my-development",
    });
  }

  if (pulses?.length > 0) {
    const recent = pulses.slice(0, 5);
    const drainedCount = recent.filter(p => p.resilience_signal === 'depleted' || p.resilience_signal === 'fragile').length;
    if (drainedCount >= 3) {
      frictions.push({
        signal: "Resilience depleted",
        prediction: "3 of your last 5 check-ins show depleted or fragile resilience. This is a signal worth naming, not pushing through.",
        suggestion: "Talk it through with Atreus or block recovery time.",
        cta: "Talk it through",
        link: "/practice",
        atreus: true,
        atreusMsg: "I've been feeling resilience-depleted recently. Can we talk about what's driving it?",
      });
    }
  }

  return frictions[0] || null;
}

export default function UpcomingFrictionCard({ trends, pulses, onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);
  const friction = detectFriction(trends, pulses);
  if (!friction) return null;

  return (
    <Card className="shadow-sm border border-amber-100 bg-white rounded-2xl overflow-hidden">
      <CardContent className="px-5 py-0">
        {/* Collapsed trigger row */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between py-4 gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Watch this</p>
              <p className="text-xs text-gray-500">{friction.signal}</p>
            </div>
          </div>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          }
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="pb-4 space-y-3 border-t border-amber-50 pt-3">
            <p className="text-sm text-gray-700 leading-relaxed">{friction.prediction}</p>

            <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Suggested: </span>{friction.suggestion}
              </p>
            </div>

            <div className="flex gap-2">
              {friction.atreus ? (
                <Button
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-8"
                  onClick={() => onOpenAtreus(friction.atreusMsg)}
                >
                  <Brain className="w-3 h-3 mr-1.5" /> {friction.cta}
                </Button>
              ) : (
                <Link to={friction.link} className="flex-1">
                  <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs h-8">
                    {friction.cta} <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}