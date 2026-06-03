/**
 * TriggerMapCard — Show pattern triggers in a human-readable way.
 * Top triggers, context tags, situations where the pattern is less likely.
 * Derived from self-report signals, trends, and activity data.
 */
import React, { useState } from "react";
import { Map, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function buildTriggerMap(trends, pulses, activities) {
  const triggers = [];
  const lessLikely = [];

  // High meeting load → overload trigger
  const heavyLoadDays = pulses.filter(p => p.perceived_load === 'heavy' || p.perceived_load === 'unsustainable');
  const avgActivity = activities.length > 0
    ? activities.reduce((s, a) => s + (a.meeting_minutes_day || 0), 0) / activities.length
    : 0;

  if (heavyLoadDays.length >= 3 || avgActivity > 270) {
    triggers.push({ label: "High meeting density", sub: "Days with 4+ hours of meetings correlate with lower energy and higher load reports.", tag: "Calendar signal" });
  }

  // Back-to-back meetings
  const highB2B = activities.filter(a => (a.back_to_back_density || 0) > 0.5);
  if (highB2B.length >= 2) {
    triggers.push({ label: "Back-to-back scheduling", sub: "Days with little buffer between meetings tend to increase reactive behavior signals.", tag: "Calendar signal" });
  }

  // Identity friction
  if (trends?.identity_friction_active || trends?.identity_friction_signals >= 2) {
    triggers.push({ label: "Unclear mandate or role shift", sub: "Friction around your leadership role identity appears during periods of organizational change or unclear expectations.", tag: "Check-in pattern" });
  }

  // Delegation gap → trigger
  if ((trends?.delegation_gap_count_7d || 0) > 1) {
    triggers.push({ label: "High-stakes decision weeks", sub: "Delegation gaps tend to appear when there are high-stakes decisions or performance conversations happening simultaneously.", tag: "Behavior pattern" });
  }

  // Operator mode
  if ((trends?.overload_pattern_strength || 0) > 50) {
    triggers.push({ label: "Extended stretch without recovery", sub: "Overcontrol patterns tend to emerge after 5+ consecutive days of high load with no visible recovery.", tag: "Load pattern" });
  }

  // Less likely conditions
  if (heavyLoadDays.length >= 2) {
    lessLikely.push("Days with fewer than 3 meetings");
    lessLikely.push("Weeks with protected focus time");
  }
  if ((trends?.delegation_gap_count_7d || 0) > 0) {
    lessLikely.push("After successfully completing a delegation");
  }
  if (trends?.energy_trend === 'improving') {
    lessLikely.push("When your energy has been building over several days");
  }

  return { triggers: triggers.slice(0, 4), lessLikely: lessLikely.slice(0, 3) };
}

export default function TriggerMapCard({ trends, pulses = [], activities = [], onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);
  const { triggers, lessLikely } = buildTriggerMap(trends, pulses, activities);

  if (triggers.length === 0) return null;

  return (
    <Card className="shadow-sm border border-border bg-card rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Map className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Trigger map</p>
            <p className="text-[10px] text-muted-foreground">What tends to set patterns in motion</p>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-2.5">
        {/* Top triggers */}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top triggers</p>
        {triggers.map((t, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.sub}</p>
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 mt-1.5">{t.tag}</span>
            </div>
          </div>
        ))}

        {/* Less likely — expandable */}
        {lessLikely.length > 0 && (
          <>
            {expanded && (
              <div className="pt-1 space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Where patterns are less likely</p>
                {lessLikely.map((l, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-emerald-50 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-emerald-700">{l}</p>
                  </div>
                ))}
              </div>
            )}
            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Show when patterns are less likely →
              </button>
            )}
          </>
        )}

        {onOpenAtreus && (
          <button
            onClick={() => onOpenAtreus("I want to understand what tends to trigger my leadership patterns and what conditions make them less likely.")}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors mt-1"
          >
            <Brain className="w-3.5 h-3.5 text-[#0202ff]" />
            Explore triggers with Atreus
          </button>
        )}
      </CardContent>
    </Card>
  );
}