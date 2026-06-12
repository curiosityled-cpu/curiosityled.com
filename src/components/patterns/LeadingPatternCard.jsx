/**
 * LeadingPatternCard — The primary named leadership pattern card for Patterns.
 * Pattern title, interpretation, what it looks like, triggers, what has helped before.
 * Brief spec: card #1 in Patterns section.
 */
import React, { useState } from "react";
import { Repeat2, ChevronDown, ChevronUp, Brain, Lightbulb, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PatternEvidenceDrawer from "@/components/patterns/PatternEvidenceDrawer";

const PATTERN_LIBRARY = [
  {
    id: "overload_overcontrol",
    title: "Overload → Overcontrol",
    tagline: "When pressure builds, you tend to pull work back in rather than push it out.",
    interpretation: "Under sustained load, a natural response is to protect quality by taking things back — reviewing drafts, re-entering decisions, or increasing oversight. This loop is adaptive short-term but compounds the very overload it responds to.",
    looksLike: ["Reviewing work you've already delegated", "Re-entering decisions after deferring them", "Finding it harder to step back during crunch periods"],
    triggers: ["Back-to-back weeks", "High-stakes deliverables", "Team capacity gaps"],
    whatHelped: ["Naming the loop out loud", "Blocking one protected 1:1 to explicitly hand off", "Deciding on one thing to not review this week"],
  },
  {
    id: "conflict_delay",
    title: "Conflict Delay",
    tagline: "Performance or tension conversations that need to happen tend to get deferred.",
    interpretation: "Difficult conversations often get postponed — waiting for more data, a better moment, or emotional readiness. This creates quiet tension that affects team dynamics before anything is said.",
    looksLike: ["Replanning a hard conversation more than once", "Softening feedback until the core message disappears", "Feelings of low confidence before team review meetings"],
    triggers: ["Uncertainty about how the person will react", "High workload reducing emotional bandwidth", "Ambiguous performance data"],
    whatHelped: ["Setting a 48-hour rule before any performance conversation", "Writing out the one thing you need to say before the meeting", "Debriefing with Atreus after the conversation"],
  },
  {
    id: "identity_friction",
    title: "Role Identity Friction",
    tagline: "Periods of uncertainty about what kind of leader you should be right now.",
    interpretation: "Leadership identity tends to drift during organizational change, rapid transitions, or when external expectations conflict with your natural style. This shows up as quieter confidence, hesitation before speaking up, or over-adapting to what others seem to want.",
    looksLike: ["Second-guessing decisions you'd normally make confidently", "Feeling like you're performing leadership rather than leading", "Inconsistency in how you engage with your team across contexts"],
    triggers: ["Org restructure or reporting line changes", "New senior stakeholders", "Performance cycles or 360s"],
    whatHelped: ["Writing out what kind of leader you want to be this quarter", "Short reflection conversation with Atreus", "Reconnecting with a past leadership win"],
  },
  {
    id: "learning_compression",
    title: "Development Compression",
    tagline: "Growth activity is the first thing cut when load increases.",
    interpretation: "Development is often treated as a discretionary activity rather than core work — so when calendars fill up, learning and reflection get deferred. This pattern compounds over time because the capacity to think strategically also erodes under extended load.",
    looksLike: ["Learning items untouched for several weeks", "Skipping weekly reflections", "Feeling reactive rather than intentional about growth"],
    triggers: ["Q-end pressure", "Team changes requiring more direct management", "Extended meeting-heavy weeks"],
    whatHelped: ["Booking 30 minutes of protected development time before the week starts", "Picking one micro-learning item rather than a full module", "Treating reflection as a 5-minute debrief, not an hour commitment"],
  },
];

function detectPattern(trends, pulses, goals) {
  // Priority 1: overload/overcontrol
  if ((trends?.overload_pattern_strength || 0) > 40 || (trends?.operator_risk_trajectory === 'increasing')) {
    return PATTERN_LIBRARY[0];
  }
  // Priority 2: delegation gap (proxy for conflict delay sometimes, but here check confidence dip)
  if (trends?.confidence_trend === 'declining' && (trends?.delegation_gap_count_7d || 0) > 0) {
    return PATTERN_LIBRARY[1];
  }
  // Priority 3: identity friction
  if (trends?.identity_friction_active || (trends?.identity_friction_signals || 0) >= 2) {
    return PATTERN_LIBRARY[2];
  }
  // Priority 4: learning stall
  if (trends?.learning_stall_detected) {
    return PATTERN_LIBRARY[3];
  }
  // Default: overload (most common)
  if (pulses.length >= 5) {
    const heavyDays = pulses.filter(p => p.perceived_load === 'heavy' || p.perceived_load === 'unsustainable');
    if (heavyDays.length >= 3) return PATTERN_LIBRARY[0];
  }
  return null;
}

// Derive what actually helped this user from their pulse history
function deriveWhatHelped(pulses, pattern) {
  const learned = [];

  // Look for follow_up pulses with no gap after heavy weeks → delegation worked
  const heavyWeeks = pulses.filter(p => p.perceived_load === 'unsustainable' || p.perceived_load === 'heavy');
  const followUps = pulses.filter(p => p.prompt_type === 'follow_up' && p.intent_actuals_gap === 'no_gap_detected');
  if (heavyWeeks.length > 0 && followUps.length > 0) {
    learned.push(`Following through on commitments after heavy weeks has worked ${followUps.length} time${followUps.length > 1 ? 's' : ''} for you.`);
  }

  // Morning intents that were followed through
  const morningIntents = pulses.filter(p => p.prompt_type === 'morning_intent' && p.focus_intention);
  if (morningIntents.length > 0) {
    const lastIntent = morningIntents[0];
    const d = new Date(lastIntent.created_date);
    const intentDateLabel = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
    learned.push(`Setting a morning intent helped (e.g. "${lastIntent.focus_category?.replace('_', ' ') || 'focus'}" focus on ${intentDateLabel}).`);
  }

  // Energy trend improving after low period
  const recentEnergy = pulses.slice(0, 5).map(p => p.energy_level);
  const hadDrained = pulses.slice(5, 15).some(p => p.energy_level === 'drained');
  const nowBetter = recentEnergy.some(e => e === 'steady' || e === 'strong');
  if (hadDrained && nowBetter) {
    learned.push('Your energy has recovered from a recent low — something you did or didn\'t do shifted it.');
  }

  // Fall back to library text if nothing dynamic found
  if (learned.length === 0) return pattern.whatHelped;
  return learned;
}

export default function LeadingPatternCard({ trends, pulses = [], goals = [], onOpenAtreus }) {
  const [expanded, setExpanded] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const pattern = detectPattern(trends, pulses, goals);

  if (!pattern) return null;

  return (
    <Card className="shadow-sm rounded-2xl overflow-hidden border border-border bg-card">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Repeat2 className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Leading pattern</p>
            <p className="text-[10px] text-muted-foreground">Most active right now · AI-interpreted</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowDrawer(true)} className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground" title="View evidence trail">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="transition-colors text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <CardContent className="px-5 pt-2 pb-5 space-y-3">
        {/* Pattern title + tagline */}
        <div className="p-3.5 rounded-xl space-y-1.5 bg-muted/50 border border-border">
          <p className="text-base font-bold text-card-foreground">{pattern.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{pattern.tagline}</p>
        </div>

        {/* Interpretation */}
        <p className={`text-sm leading-relaxed text-foreground ${expanded ? '' : 'line-clamp-3'}`}>
          {pattern.interpretation}
        </p>

        {/* Expanded detail */}
        {expanded && (
          <div className="space-y-3 pt-1">
            {/* What it looks like */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">What it tends to look like</p>
              <div className="space-y-1.5">
                {pattern.looksLike.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-violet-400" />
                    <p className="text-xs leading-relaxed text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What triggers it */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">What tends to trigger it</p>
              <div className="flex flex-wrap gap-1.5">
                {pattern.triggers.map((t, i) => (
                  <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* What has helped before — dynamically derived from history */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">What has helped before</p>
              {(() => {
                const items = deriveWhatHelped(pulses, pattern);
                const isDynamic = pulses.length > 5 && items !== pattern.whatHelped;
                return (
                  <>
                    {isDynamic && (
                      <p className="text-[10px] mb-1.5 text-[#0202ff]">From your history</p>
                    )}
                    <div className="space-y-1.5">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                          <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                          <p className="text-xs leading-relaxed text-emerald-800">{item}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {!expanded && (
          <button onClick={() => setExpanded(true)} className="text-xs transition-colors text-muted-foreground hover:text-foreground">
            See triggers and what has helped →
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs h-8"
            onClick={() => onOpenAtreus?.(`I want to understand my "${pattern.title}" pattern better and explore what's driving it right now.`)}
          >
            <Brain className="w-3 h-3 mr-1.5" /> Explore this pattern
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => setShowDrawer(true)}
          >
            Evidence trail
          </Button>
        </div>
      </CardContent>
      <PatternEvidenceDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        pattern={pattern}
        trends={trends}
        pulses={pulses}
        goals={goals}
      />
    </Card>
  );
}