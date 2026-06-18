/**
 * LeadingPatternCard — Primary named leadership pattern card.
 * Priority-cascade detection across 8 named patterns.
 * Hero card on Patterns page: pattern name, triggers, consequence, recommendation, KPI linkage.
 */
import React, { useState } from "react";
import { Repeat2, ChevronDown, ChevronUp, Brain, Lightbulb, ExternalLink, AlertTriangle, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PatternEvidenceDrawer from "@/components/patterns/PatternEvidenceDrawer";

const PATTERN_LIBRARY = {
  // ── P0: Performance Avoidance ─────────────────────────────────────────────
  performance_avoidance: {
    id: "performance_avoidance",
    name: "Performance Avoidance",
    tagline: "Underperformance is being noticed but not addressed.",
    interpretation: "When performance issues go unaddressed, they compound. Agents who receive vague or delayed feedback don't correct course — they normalize the low standard or disengage entirely. In BPO environments, one unaddressed agent can pull the team's SLA numbers below client thresholds within days.",
    triggers: [
      "Confidence has been declining for 5+ days",
      "No coaching flow or 1:1 prep used in the last 14 days",
      "One or more goals tied to Performance Management show no recent progress"
    ],
    consequence: "Unaddressed underperformance is the most common precursor to both SLA failure and voluntary agent attrition.",
    recommendation: "Use the Prepare coaching flow in Practice to structure a direct performance conversation — even 10 minutes of prep changes the outcome.",
    practice_flow_id: "prepare",
    kpi_categories: ["SLA Adherence", "First Contact Resolution", "Agent Attrition Rate"],
    accent: "bg-rose-50 border-rose-200 text-rose-700",
    iconBg: "bg-rose-50 border-rose-100",
    iconColor: "text-rose-500",
  },

  // ── P1: Attrition Risk Behavior ───────────────────────────────────────────
  attrition_risk: {
    id: "attrition_risk",
    name: "Attrition Risk Behavior",
    tagline: "How you're leading right now may be pushing people toward the door.",
    interpretation: "Most BPO attrition doesn't come from compensation — it comes from the immediate manager. When leaders are emotionally unavailable under load, stop recognizing effort, or create no visible path forward for their team, agents quietly start looking elsewhere. The pattern is often invisible until someone resigns.",
    triggers: [
      "High workload is consistently coinciding with low growth scores",
      "No 1:1 prep or delegation planner activity in the last 21 days",
      "Identity friction signals present (team or self)"
    ],
    consequence: "Replacing one BPO agent costs 30–50% of their annual salary in recruitment, training, and productivity loss — and it starts with the manager relationship.",
    recommendation: "Open the 1:1 Prep tool in Practice. One intentional check-in with a team member this week can interrupt this pattern before it becomes a resignation.",
    practice_flow_id: "one-on-one-prep",
    kpi_categories: ["Agent Attrition Rate", "Schedule Adherence", "Team Satisfaction"],
    accent: "bg-red-50 border-red-200 text-red-700",
    iconBg: "bg-red-50 border-red-100",
    iconColor: "text-red-500",
  },

  // ── P2: Overload → Overcontrol ───────────────────────────────────────────
  overload_overcontrol: {
    id: "overload_overcontrol",
    name: "Overload → Overcontrol",
    tagline: "When capacity shrinks, the instinct is to hold tighter — which makes it worse.",
    interpretation: "Under sustained load, managers often compensate by pulling decisions back to themselves, checking work more than necessary, or avoiding delegation entirely. This feels like control but functions as a bottleneck — the team slows down and the manager gets more overwhelmed.",
    triggers: [
      "Overload pattern strength has exceeded threshold for 3+ days",
      "Operator risk trajectory is increasing",
      "Delegation activity has dropped or stalled"
    ],
    consequence: "Overcontrol under load reduces team throughput and signal quality — the metrics that matter start moving in the wrong direction precisely when they need attention.",
    recommendation: "Use the Delegation Planner in Practice to identify one decision you can hand off today. Delegation is a load management tool, not just a people development tool.",
    practice_flow_id: "delegation-planner",
    kpi_categories: ["SLA Adherence", "On-Time Delivery Rate", "Schedule Adherence"],
    accent: "bg-amber-50 border-amber-200 text-amber-700",
    iconBg: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-500",
  },

  // ── P3: Reactive Leadership ──────────────────────────────────────────────
  reactive_leadership: {
    id: "reactive_leadership",
    name: "Reactive Leadership",
    tagline: "You're responding to what already happened instead of getting ahead of it.",
    interpretation: "Reactive leaders manage by exception — they wait for a problem to surface before acting. In BPO operations, by the time a metric hits critical, the window to prevent client impact has already closed. The patterns that lead to SLA violations are visible 3–5 days in advance if you know where to look.",
    triggers: [
      "Morning intentions (Big 3) have not been set in 5 of the last 7 days",
      "Check-ins show high load but no corresponding action commitments",
      "No goals or priorities created in the last 7 days despite active KPI signals"
    ],
    consequence: "Reactive leaders experience 2–3x more SLA escalations than predictive ones — because they're solving yesterday's problem while today's is already forming.",
    recommendation: "Set your Big 3 tonight for tomorrow. One planned priority prevents three reactive fires. Use Today's Playbook — it's designed to interrupt this cycle.",
    practice_flow_id: "daily-gym",
    kpi_categories: ["SLA Adherence", "First Contact Resolution", "On-Time Delivery Rate"],
    accent: "bg-orange-50 border-orange-200 text-orange-700",
    iconBg: "bg-orange-50 border-orange-100",
    iconColor: "text-orange-500",
  },

  // ── P4: Conflict Delay (existing) ─────────────────────────────────────────
  conflict_delay: {
    id: "conflict_delay",
    name: "Conflict Delay",
    tagline: "Performance or tension conversations that need to happen tend to get deferred.",
    interpretation: "Difficult conversations often get postponed — waiting for more data, a better moment, or emotional readiness. This creates quiet tension that affects team dynamics before anything is said.",
    triggers: [
      "Replanning a hard conversation more than once",
      "Softening feedback until the core message disappears",
      "Feelings of low confidence before team review meetings"
    ],
    consequence: "Delayed critical conversations lead to festering team tension and performance drift.",
    recommendation: "Set a 48-hour rule before any performance conversation — write out the one thing you need to say before the meeting.",
    practice_flow_id: "prepare",
    kpi_categories: ["Team Satisfaction", "Agent Attrition Rate"],
    accent: "bg-indigo-50 border-indigo-200 text-indigo-700",
    iconBg: "bg-indigo-50 border-indigo-100",
    iconColor: "text-indigo-500",
  },

  // ── P5: Accountability Gap ────────────────────────────────────────────────
  accountability_gap: {
    id: "accountability_gap",
    name: "Accountability Gap",
    tagline: "Intentions are being set but not followed through on.",
    interpretation: "There's a difference between setting priorities and holding yourself to them. When planned priorities consistently go unmarked, commitments aren't closed out, and goals don't move, it creates a leadership blind spot — and a culture that mirrors it. Teams take their accountability cues from their manager.",
    triggers: [
      "Big 3 completion rate is below 40% over the last 14 days",
      "3 or more active goals have shown zero progress in the last 7 days",
      "Close the Loop prompts are frequently left blank"
    ],
    consequence: "Low follow-through at the manager level is one of the strongest predictors of low accountability in the team — which shows up in SLA consistency and schedule adherence metrics.",
    recommendation: "Start with one thing: pick the single most important priority from your Big 3 tomorrow and mark it done before anything else. Accountability is built in single, repeated moments.",
    practice_flow_id: "daily-gym",
    kpi_categories: ["SLA Adherence", "Schedule Adherence", "Agent Attrition Rate"],
    accent: "bg-slate-50 border-slate-200 text-slate-700",
    iconBg: "bg-slate-50 border-slate-100",
    iconColor: "text-slate-500",
  },

  // ── P6: Identity Friction (existing) ─────────────────────────────────────
  identity_friction: {
    id: "identity_friction",
    name: "Role Identity Friction",
    tagline: "Periods of uncertainty about what kind of leader you should be right now.",
    interpretation: "Leadership identity tends to drift during organizational change, rapid transitions, or when external expectations conflict with your natural style. This shows up as quieter confidence, hesitation before speaking up, or over-adapting to what others seem to want.",
    triggers: [
      "Org restructure or reporting line changes",
      "New senior stakeholders",
      "Performance cycles or 360s"
    ],
    consequence: "Identity friction erodes decision confidence and team trust over time.",
    recommendation: "Write out what kind of leader you want to be this quarter — a short reflection conversation with Atreus often helps name what's creating the friction.",
    practice_flow_id: "reflect",
    kpi_categories: ["Team Satisfaction", "Agent Attrition Rate"],
    accent: "bg-purple-50 border-purple-200 text-purple-700",
    iconBg: "bg-purple-50 border-purple-100",
    iconColor: "text-purple-500",
  },

  // ── P7: Development Compression (existing, renamed) ───────────────────────
  development_compression: {
    id: "development_compression",
    name: "Development Compression",
    tagline: "Growth activity is the first thing cut when load increases.",
    interpretation: "Development is often treated as a discretionary activity rather than core work — so when calendars fill up, learning and reflection get deferred. This pattern compounds over time because the capacity to think strategically also erodes under extended load.",
    triggers: [
      "Learning items untouched for several weeks",
      "Skipping weekly reflections",
      "Feeling reactive rather than intentional about growth"
    ],
    consequence: "Stalled development narrows leadership range over time — adaptability and strategic thinking erode under sustained compression.",
    recommendation: "Book 30 minutes of protected development time before the week starts. Pick one micro-learning item rather than a full module.",
    practice_flow_id: "daily-gym",
    kpi_categories: ["First Contact Resolution", "On-Time Delivery Rate"],
    accent: "bg-teal-50 border-teal-200 text-teal-700",
    iconBg: "bg-teal-50 border-teal-100",
    iconColor: "text-teal-500",
  },
};

/**
 * Priority-cascade pattern detection.
 * Returns the highest-priority active pattern, or null.
 */
function detectPattern(trends, pulses, goals, recentCheckIns = [], recentPulses = []) {
  if (!trends && pulses.length === 0 && goals.length === 0) return null;

  // ── P0: Performance Avoidance ──────────────────────────────────────────────
  const confidenceDeclining = trends?.confidence_trend === 'declining';
  const learningStalled = trends?.learning_stall_detected === true;
  const stalledPerfGoal = goals.some(g =>
    (g.linked_competency_ids || []).some(id =>
      String(id).toLowerCase().includes('performance')
    ) && (g.progress || 0) < 20 && g.status === 'active'
  );
  if (confidenceDeclining && (learningStalled || stalledPerfGoal)) {
    return PATTERN_LIBRARY.performance_avoidance;
  }

  // ── P1: Attrition Risk Behavior ────────────────────────────────────────────
  const highLoad = (trends?.overload_pattern_strength || 0) > 40;
  const identityFriction = trends?.identity_friction_active === true;
  const learningStalledLong = trends?.learning_stall_detected === true;
  if (highLoad && (identityFriction || learningStalledLong)) {
    return PATTERN_LIBRARY.attrition_risk;
  }

  // ── P2: Overload → Overcontrol ─────────────────────────────────────────────
  if ((trends?.overload_pattern_strength || 0) > 40 || trends?.operator_risk_trajectory === 'increasing') {
    return PATTERN_LIBRARY.overload_overcontrol;
  }

  // ── P3: Reactive Leadership ────────────────────────────────────────────────
  // Guard: don't fire in the first 21 days — new users naturally have low Big 3 completion
  const accountAgeDays = (() => {
    const earliest = (recentCheckIns || []).slice(-1)[0];
    if (!earliest?.check_in_date) return 999;
    const diff = (Date.now() - new Date(earliest.check_in_date).getTime()) / 86400000;
    return Math.round(diff);
  })();
  const noBig3Habit = (() => {
    if (accountAgeDays < 21) return false;
    const last7 = (recentCheckIns || []).slice(-7);
    if (last7.length < 3) return false;
    const daysWithBig3 = last7.filter(c =>
      c.big3_priorities && c.big3_priorities.length > 0
    ).length;
    return daysWithBig3 <= 2;
  })();
  const noGoalActivity = goals.filter(g =>
    g.status === 'active' && g.created_date
  ).length === 0;
  if (noBig3Habit && (trends?.overload_pattern_strength > 30 || noGoalActivity)) {
    return PATTERN_LIBRARY.reactive_leadership;
  }

  // ── P4: Conflict Delay ─────────────────────────────────────────────────────
  if (trends?.confidence_trend === 'declining' && (trends?.delegation_gap_count_7d || 0) > 0) {
    return PATTERN_LIBRARY.conflict_delay;
  }

  // ── P5: Accountability Gap ─────────────────────────────────────────────────
  const big3CompletionLow = (() => {
    const last14 = (recentCheckIns || []).slice(-14);
    const daysWithBig3 = last14.filter(c =>
      c.big3_priorities?.length > 0
    );
    if (daysWithBig3.length < 5) return false;
    const completed = daysWithBig3.filter(c =>
      c.big3_priorities.some(p =>
        p.status === 'completed' || p.midday_status === 'on_track'
      )
    ).length;
    return (completed / daysWithBig3.length) < 0.4;
  })();
  const stalledGoals = goals.filter(g =>
    g.status === 'active' && (g.progress || 0) < 10
  ).length >= 3;
  if (big3CompletionLow && stalledGoals) {
    return PATTERN_LIBRARY.accountability_gap;
  }

  // ── P6: Identity Friction ──────────────────────────────────────────────────
  if (trends?.identity_friction_active || (trends?.identity_friction_signals || 0) >= 2) {
    return PATTERN_LIBRARY.identity_friction;
  }

  // ── P7: Development Compression ────────────────────────────────────────────
  if (trends?.learning_stall_detected) {
    return PATTERN_LIBRARY.development_compression;
  }

  // ── Fallback: overload detected from raw pulses ────────────────────────────
  if (pulses.length >= 5) {
    const heavyDays = pulses.filter(p => p.perceived_load === 'heavy' || p.perceived_load === 'unsustainable');
    if (heavyDays.length >= 3) return PATTERN_LIBRARY.overload_overcontrol;
  }

  return null;
}

// Derive what helped from pulse history
function deriveWhatHelped(pulses, pattern) {
  const learned = [];
  const heavyWeeks = pulses.filter(p => p.perceived_load === 'unsustainable' || p.perceived_load === 'heavy');
  const followUps = pulses.filter(p => p.prompt_type === 'follow_up' && p.intent_actuals_gap === 'no_gap_detected');
  if (heavyWeeks.length > 0 && followUps.length > 0) {
    learned.push(`Following through on commitments after heavy weeks has worked ${followUps.length} time${followUps.length > 1 ? 's' : ''} for you.`);
  }
  const morningIntents = pulses.filter(p => p.prompt_type === 'morning_intent' && p.focus_intention);
  if (morningIntents.length > 0) {
    const lastIntent = morningIntents[0];
    const d = new Date(lastIntent.created_date);
    const intentDateLabel = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
    learned.push(`Setting a morning intent helped (e.g. "${lastIntent.focus_category?.replace('_', ' ') || 'focus'}" focus on ${intentDateLabel}).`);
  }
  const recentEnergy = pulses.slice(0, 5).map(p => p.energy_level);
  const hadDrained = pulses.slice(5, 15).some(p => p.energy_level === 'drained');
  const nowBetter = recentEnergy.some(e => e === 'steady' || e === 'strong');
  if (hadDrained && nowBetter) {
    learned.push('Your energy has recovered from a recent low — something you did or didn\'t do shifted it.');
  }
  if (learned.length === 0) return null;
  return learned;
}

export default function LeadingPatternCard({ trends, pulses = [], goals = [], recentCheckIns = [], recentPulses = [], onOpenAtreus, updatePageContext }) {
  const [expanded, setExpanded] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const pattern = detectPattern(trends, pulses, goals, recentCheckIns, recentPulses);

  // Pillar 4: card-level page context awareness
  React.useEffect(() => {
    if (pattern && updatePageContext) {
      updatePageContext({
        card: 'LeadingPatternCard',
        metrics: {
          pattern_name: pattern.name,
          pattern_key: pattern.key,
          overload_strength: trends?.overload_pattern_strength,
          energy_trend: trends?.energy_trend,
        }
      });
    }
  }, [pattern?.key, trends?.overload_pattern_strength]);

  if (!pattern) return null;

  const whatHelped = deriveWhatHelped(pulses, pattern);

  return (
    <Card className="shadow-sm rounded-2xl overflow-hidden border border-border bg-card">
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${pattern.iconBg}`}>
            <Repeat2 className={`w-3.5 h-3.5 ${pattern.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-card-foreground">Leading Pattern</p>
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
        {/* Pattern hero — name + tagline */}
        <div className={`p-4 rounded-xl border ${pattern.accent.replace('text-', 'bg-').replace('700', '50')} ${pattern.accent.replace('text-', 'border-').replace('700', '200')}`}>
          <p className="text-lg font-bold text-card-foreground">{pattern.name}</p>
          <p className="text-sm leading-relaxed text-muted-foreground mt-0.5">{pattern.tagline}</p>
        </div>

        {/* What's driving this — 3 triggers */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What's driving this</p>
          {pattern.triggers.map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-muted-foreground/60" />
              <p className="text-xs leading-relaxed text-foreground">{t}</p>
            </div>
          ))}
        </div>

        {/* What's at stake */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">{pattern.consequence}</p>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="space-y-3 pt-1">
            {/* Interpretation */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-foreground leading-relaxed">{pattern.interpretation}</p>
            </div>

            {/* What has helped */}
            {whatHelped && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-muted-foreground">What has helped before</p>
                <div className="space-y-1.5">
                  {whatHelped.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                      <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                      <p className="text-xs leading-relaxed text-emerald-800">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!expanded && (
          <button onClick={() => setExpanded(true)} className="text-xs transition-colors text-muted-foreground hover:text-foreground">
            See what's at stake and what helps →
          </button>
        )}

        {/* Actions row */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs h-8"
            onClick={() => onOpenAtreus?.(`I want to understand my "${pattern.name}" pattern better and explore what's driving it right now.`)}
          >
            <Brain className="w-3 h-3 mr-1.5" /> Explore with Atreus
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

        {/* KPI linkage pill */}
        {pattern.kpi_categories?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Target className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Connected to:</span>
            {pattern.kpi_categories.map((kpi, i) => (
              <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                {kpi}
              </span>
            ))}
          </div>
        )}
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