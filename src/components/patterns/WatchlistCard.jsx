/**
 * WatchlistCard — Forward-looking predictive concerns for the next 7–14 days.
 * Calibrated, not clinical. "Keep an eye on this" rather than alarm language.
 * Lives on Patterns (distinct from UpcomingFrictionCard which lives on Lead).
 */
import React from "react";
import { Eye, ArrowRight, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function buildWatchlist(trends, pulses, goals) {
  const items = [];

  // Declining energy trend
  if (trends?.energy_trend === 'declining') {
    items.push({
      signal: "Energy trajectory",
      horizon: "Next 7–14 days",
      read: "Your energy trend has been downward over the past two weeks. If this continues without a pattern break, decision quality and team responsiveness can be affected.",
      nudge: "Consider what's been compressing your energy and whether anything can be deferred or delegated.",
      confidence: "medium",
      atreusMsg: "My energy has been declining over the past few weeks. I want to understand what's driving it and what I might do differently.",
    });
  }

  // Increasing operator risk
  if (trends?.operator_risk_trajectory === 'increasing' && (trends?.overload_pattern_strength || 0) > 40) {
    items.push({
      signal: "Overload pattern building",
      horizon: "Next 7 days",
      read: "The combination of high load and reactive behavior has been intensifying. This pattern tends to peak before major events or decision windows.",
      nudge: "Identify one thing to hand off before the week's pressure peaks.",
      confidence: "high",
      link: "/practice",
      linkLabel: "Plan delegation",
      atreusMsg: null,
    });
  }

  // Identity friction active
  if (trends?.identity_friction_active) {
    items.push({
      signal: "Role clarity tension",
      horizon: "Ongoing",
      read: "Signals suggest some uncertainty about your leadership role or approach. Left unexamined, this can quietly affect confidence and decisions.",
      nudge: "A short reflection conversation often helps name what's creating the friction.",
      confidence: "low",
      atreusMsg: "I've been having some uncertainty about my role as a leader. Can you help me explore what might be driving it?",
    });
  }

  // Learning stall
  if (trends?.learning_stall_detected) {
    items.push({
      signal: "Development stall",
      horizon: "Next 2–3 weeks",
      read: "Development activity has been low for several weeks. Learning stalls under load — but they also compound quietly over time.",
      nudge: "30 minutes this week on one focused learning item resets the momentum.",
      confidence: "medium",
      link: "/my-development",
      linkLabel: "View development",
      atreusMsg: null,
    });
  }

  // Delegation gap persisting
  if ((trends?.delegation_gap_count_7d || 0) > 1) {
    items.push({
      signal: "Recurring delegation gap",
      horizon: "This week",
      read: "The gap between your delegation intentions and what actually happens has appeared multiple times this week. This pattern tends to widen, not close, without a deliberate intervention.",
      nudge: "Name one specific task and one specific person — before the end of today.",
      confidence: "high",
      atreusMsg: "I keep intending to delegate but it's not happening. Help me figure out what's getting in the way.",
    });
  }

  // Resilience depleting
  if (trends?.resilience_trend === 'declining') {
    items.push({
      signal: "Resilience depleting",
      horizon: "Next 7 days",
      read: "Your capacity to bounce back from setbacks has been decreasing. This is an early signal worth noticing before it affects how you show up for your team.",
      nudge: "Protect one block of recovery time this week — even 30 minutes matters.",
      confidence: "medium",
      atreusMsg: "My resilience has been decreasing and I want to understand what's draining it.",
    });
  }

  return items.slice(0, 3);
}

const CONFIDENCE_STYLES = {
  high: { label: "Strong signal", color: "bg-amber-50 text-amber-700" },
  medium: { label: "Watch this", color: "bg-blue-50 text-blue-700" },
  low: { label: "Early signal", color: "bg-gray-100 text-gray-500" },
};

export default function WatchlistCard({ trends, pulses = [], goals = [], onOpenAtreus }) {
  const items = buildWatchlist(trends, pulses, goals);
  if (items.length === 0) return null;

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">Watchlist</p>
          <p className="text-[10px] text-muted-foreground">Calibrated predictions · Keep an eye on these</p>
        </div>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {items.map((item, i) => {
          const style = CONFIDENCE_STYLES[item.confidence];
          return (
            <div key={i} className="p-3.5 bg-muted/50 rounded-xl border border-border space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-card-foreground">{item.signal}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${style.color}`}>
                  {style.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.read}</p>
              <div className="bg-card rounded-lg px-3 py-2 border border-border">
                <p className="text-xs text-foreground">
                  <span className="font-medium">Nudge: </span>{item.nudge}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{item.horizon}</span>
                {item.atreusMsg ? (
                  <button
                    onClick={() => onOpenAtreus?.(item.atreusMsg)}
                    className="flex items-center gap-1 text-[10px] text-[#0202ff] font-medium hover:underline"
                  >
                    <Brain className="w-2.5 h-2.5" /> Talk it through
                  </button>
                ) : item.link ? (
                  <Link to={item.link} className="flex items-center gap-1 text-[10px] text-[#0202ff] font-medium hover:underline">
                    {item.linkLabel} <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}