/**
 * UpcomingFrictionCard — Warn without alarming.
 * Surfaces calendar/pattern-based friction before it emerges.
 * Uses real calendar events when available via getUpcomingMeetings.
 */
import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Brain, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

function detectFriction(trends, goals, pulses) {
  const frictions = [];

  // Overload trajectory
  if (trends?.operator_risk_trajectory === 'increasing' && trends?.overload_pattern_strength > 50) {
    frictions.push({
      signal: "Overload trajectory",
      prediction: "You've been absorbing high load for several days. Without a pattern break, this tends to compress decision quality and increase reactive behavior.",
      suggestion: "Block one hour of protected thinking time this week.",
      cta: "Plan delegation",
      link: "/practice",
    });
  }

  // Delegation gap
  if (trends?.delegation_gap_count_7d > 1) {
    frictions.push({
      signal: "Delegation gap",
      prediction: "You've committed to delegating multiple times this week but the pattern hasn't changed. This gap tends to widen under pressure.",
      suggestion: "Name one specific task and one specific person before the end of today.",
      cta: "Work through it",
      link: "/practice",
    });
  }

  // Learning stall
  if (trends?.learning_stall_detected) {
    frictions.push({
      signal: "Learning stall",
      prediction: "Development activity has dropped for several weeks. This is often the first thing cut under load — but it's also the first thing that compounds.",
      suggestion: "Schedule 30 minutes for one learning item this week.",
      cta: "View development",
      link: "/my-development",
    });
  }

  // Resilience depletion
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

  return frictions[0] || null; // Show only the most urgent
}

function detectCalendarFriction(events, trends) {
  if (!events || events.length === 0) return null;
  const now = Date.now();

  // Large meeting (5+ attendees) in next 48h + low confidence pattern
  const bigMeetings = events.filter(e => {
    const start = new Date(e.start).getTime();
    return e.attendees >= 5 && start > now && start < now + 2 * 86400000;
  });
  if (bigMeetings.length > 0 && trends?.confidence_trend === 'declining') {
    const m = bigMeetings[0];
    const when = new Date(m.start).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return {
      signal: "High-stakes meeting ahead",
      prediction: `"${m.title}" (${when}, ${m.attendees} attendees) is coming up. Your confidence has been declining — this is worth a brief prep.`,
      suggestion: "Use the Prepare flow before this meeting.",
      cta: "Prep for it",
      link: "/practice",
      calendarBased: true,
    };
  }

  // Many back-to-back meetings today
  const today = events.filter(e => {
    const start = new Date(e.start).getTime();
    return start > now && start < now + 86400000;
  });
  if (today.length >= 5 && (trends?.overload_pattern_strength || 0) > 30) {
    return {
      signal: "Dense meeting day ahead",
      prediction: `You have ${today.length} meetings today. Your overload pattern tends to activate on days like this.`,
      suggestion: "Identify one meeting you can decline or shorten.",
      cta: "Plan around it",
      link: "/practice",
      calendarBased: true,
    };
  }

  return null;
}

export default function UpcomingFrictionCard({ trends, goals = [], pulses, onOpenAtreus }) {
  const [calendarEvents, setCalendarEvents] = useState(null);

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getUpcomingMeetings', {})
      .then(res => { if (!cancelled) setCalendarEvents(res?.data?.events || []); })
      .catch(() => { if (!cancelled) setCalendarEvents([]); });
    return () => { cancelled = true; };
  }, []);

  // Prefer calendar-based friction if available
  const calFriction = calendarEvents?.length > 0 ? detectCalendarFriction(calendarEvents, trends) : null;
  const patternFriction = detectFriction(trends, goals, pulses);
  const friction = calFriction || patternFriction;

  if (!friction) return null;

  return (
    <Card className="shadow-sm border border-amber-100 bg-gradient-to-br from-amber-50 to-white rounded-2xl overflow-hidden">
      <CardContent className="px-5 py-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            {friction.calendarBased ? <Calendar className="w-3.5 h-3.5 text-amber-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">{friction.calendarBased ? 'Calendar signal' : 'Watch this'}</p>
            <p className="text-xs text-gray-500">{friction.signal}</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">{friction.prediction}</p>

        <div className="bg-white/70 rounded-xl px-3 py-2 border border-amber-100">
          <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Suggested: </span>{friction.suggestion}</p>
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
      </CardContent>
    </Card>
  );
}