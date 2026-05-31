/**
 * WhatMattersNowCard — AI-synthesized situational read for Lead.
 * Pulls from self-report + goals + assessment + activity signals.
 */
import React, { useState } from "react";
import { Flame, ChevronDown, ChevronUp, Brain, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function buildSituation(pulse, trends, goals, insight) {
  const chips = [];
  const activeGoals = goals.filter(g => g.status === 'active');
  const stalledGoals = activeGoals.filter(g => (g.progress || 0) < 25);

  // Energy/load signals from today's pulse
  if (pulse?.energy_level === 'drained' || pulse?.energy_level === 'stretched') {
    chips.push({ label: 'Low energy today', color: 'bg-rose-50 text-rose-700' });
  }
  if (pulse?.perceived_load === 'heavy' || pulse?.perceived_load === 'unsustainable') {
    chips.push({ label: 'Heavy load', color: 'bg-amber-50 text-amber-700' });
  }
  if (pulse?.avoidance_flag === 'yes') {
    chips.push({ label: 'Avoidance flag raised', color: 'bg-orange-50 text-orange-700' });
  }

  // Trend signals
  if (trends?.energy_trend === 'declining') {
    chips.push({ label: 'Energy trending down', color: 'bg-rose-50 text-rose-700' });
  }
  if (trends?.overload_pattern_strength > 60) {
    chips.push({ label: 'Overload pattern active', color: 'bg-amber-50 text-amber-700' });
  }
  if (trends?.identity_friction_active) {
    chips.push({ label: 'Role clarity friction', color: 'bg-violet-50 text-violet-700' });
  }

  // Goal signals
  if (stalledGoals.length > 0) {
    chips.push({ label: `${stalledGoals.length} goal${stalledGoals.length > 1 ? 's' : ''} stalled`, color: 'bg-gray-100 text-gray-700' });
  }
  if (trends?.delegation_gap_count_7d > 0) {
    chips.push({ label: 'Delegation commitment gap', color: 'bg-blue-50 text-blue-700' });
  }

  // Build narrative
  let headline = "You're in a steady state today.";
  let body = "No major friction signals. A good day to make progress on commitments or prepare for upcoming conversations.";
  let actionLabel = null;
  let actionPath = null;

  if (chips.some(c => c.label.includes('Overload') || c.label.includes('Heavy'))) {
    headline = "You're carrying a heavy load right now.";
    body = "Your signals suggest overload. The most useful thing you can do is identify one thing to hand off or defer today.";
    actionLabel = "Plan delegation";
    actionPath = "/practice";
  } else if (chips.some(c => c.label.includes('Avoidance'))) {
    headline = "Something feels avoided.";
    body = "You flagged something you might be steering around. Even naming it clearly can reduce its weight.";
    actionLabel = "Work through it";
    actionPath = "/practice";
  } else if (chips.some(c => c.label.includes('energy') || c.label.includes('Energy'))) {
    headline = "Your energy is lower than usual.";
    body = "This isn't a problem to solve — it's useful data. Consider protecting your thinking time and deferring non-urgent decisions.";
    actionLabel = "Reflect on it";
    actionPath = "/practice";
  } else if (stalledGoals.length > 0) {
    headline = `${stalledGoals.length} goal${stalledGoals.length > 1 ? 's are' : ' is'} stalled.`;
    body = `"${stalledGoals[0].title}" hasn't moved much. A small committed action today is worth more than waiting for the right moment.`;
    actionLabel = "Review goals";
    actionPath = "/my-goals";
  } else if (insight?.development_areas?.[0]) {
    const area = insight.development_areas[0].split(' (')[0];
    headline = `${area} is your highest-leverage growth edge.`;
    body = "Your Leadership Index points to this area as the most likely to accelerate your impact if you invest in it intentionally.";
    actionLabel = "Explore Practice";
    actionPath = "/practice";
  }

  return { headline, body, chips, actionLabel, actionPath };
}

export default function WhatMattersNowCard({ pulse, trends, goals, insight, onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);
  const { headline, body, chips, actionLabel, actionPath } = buildSituation(pulse, trends, goals, insight);

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0202ff] flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">What matters now</p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <CardContent className="px-5 pt-3 pb-5 space-y-3">
        <p className="text-base font-semibold text-gray-900 leading-snug">{headline}</p>

        {/* Evidence chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
            ))}
          </div>
        )}

        <p className={`text-sm text-gray-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{body}</p>
        {!expanded && (
          <button onClick={() => setExpanded(true)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors -mt-1">
            Read more →
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {actionLabel && actionPath && (
            <Link to={actionPath} className="flex-1">
              <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
                {actionLabel} <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </Link>
          )}
          <Button size="sm" variant="outline" className="text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50" onClick={onOpenAtreus}>
            <Brain className="w-3 h-3 mr-1.5 text-[#0202ff]" /> Talk it through
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}