/**
 * TodaysPlaybook — Daily companion card.
 * Hero: Big 3 priorities (from last night or today's record)
 * Then: Situation signal → One move → Active goal → Loop closer
 */
import React, { useState, useEffect } from "react";
import {
  Brain, ArrowRight, CheckCircle2, Circle, MinusCircle,
  BookmarkCheck, ChevronDown, ChevronUp, Flame, AlertTriangle, Target, Pencil, Loader2, X, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import Big3QuickSet from "@/components/lead/Big3QuickSet";
import { toast } from "sonner";

// ─── Situation builder ────────────────────────────────────────────────────────
function buildSituation(pulse, trends, goals, insight) {
  const activeGoals  = (goals || []).filter(g => g.status === "active");
  const stalledGoals = activeGoals.filter(g => (g.progress || 0) < 25);
  const signals = [];
  if (pulse?.energy_level === "drained" || pulse?.energy_level === "stretched") signals.push("low_energy");
  if (pulse?.perceived_load === "heavy" || pulse?.perceived_load === "unsustainable") signals.push("overload");
  if (pulse?.avoidance_flag === "yes") signals.push("avoidance");
  if (trends?.energy_trend === "declining") signals.push("declining_energy");
  if (trends?.overload_pattern_strength > 60) signals.push("overload");
  if (trends?.identity_friction_active) signals.push("friction");
  if (stalledGoals.length > 0) signals.push("stalled_goals");

  let headline = "You're in a steady state today.";
  let body = "No major friction signals. Good conditions to make progress on your Big 3.";
  let icon = "🟢";

  if (signals.includes("overload"))       { headline = "You're carrying a heavy load.";     body = "Identify one thing to hand off or defer before diving in.";                    icon = "🔴"; }
  else if (signals.includes("avoidance")) { headline = "Something feels avoided.";           body = "Naming it often reduces half its weight. Take 5 minutes before the day runs."; icon = "🟡"; }
  else if (signals.includes("low_energy") || signals.includes("declining_energy")) {
    headline = "Energy is lower than usual."; body = "Protect thinking time. Defer non-urgent decisions where possible."; icon = "🟡";
  } else if (stalledGoals.length > 0)    { headline = `"${stalledGoals[0].title}" hasn't moved.`; body = "A small committed action today is worth more than waiting."; icon = "🟡"; }
  else if (insight?.development_areas?.[0]) {
    const a = insight.development_areas[0].split(" (")[0];
    headline = `${a} is your growth edge.`;
    body = "Your Leadership Index points here as highest-leverage.";
  }

  return { headline, body, icon, signals, stalledGoals, activeGoals };
}

// ─── Next move builder ────────────────────────────────────────────────────────
function buildMove(pulse, trends, goals, assignments) {
  if (pulse?.avoidance_flag === "yes")
    return { move: "Name what you're avoiding.", reason: "5 minutes of honest writing dissolves half the resistance.", atreus: true, atreusMsg: "I flagged that I might be avoiding something today. Can you help me name it and think through a next step?" };
  if (trends?.overload_pattern_strength > 60 || pulse?.perceived_load === "unsustainable")
    return { move: "Identify one thing to hand off today.", reason: "Delegation is a leadership act, not a shortcut.", atreus: true, atreusMsg: "I want to think through what I should delegate. Can you help me work through it?" };
  const stalledGoal = (goals || []).find(g => g.status === "active" && (g.progress || 0) < 25);
  if (stalledGoal)
    return { move: `Make one move on "${stalledGoal.title}"`, reason: "Small, specific actions compound. What's the next 20-minute step?", atreus: false, link: "/my-goals" };
  const nowET = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  const overdue = (assignments || []).find(a => a.status === "assigned" && a.due_date && new Date(a.due_date) < nowET);
  if (overdue)
    return { move: `Complete: ${overdue.title}`, reason: "This learning is overdue. Even a partial session helps close the loop.", atreus: false, link: "/my-development" };
  if (trends?.identity_friction_active)
    return { move: "Reconnect with your leadership identity.", reason: "Your recent signals suggest uncertainty about your role.", atreus: true, atreusMsg: "I've been feeling some uncertainty about my role as a leader. Can you help me think through it?" };
  return { move: "Prepare one good question for your next 1:1.", reason: "Intentional questions are one of the most consistent differentiators of effective managers.", atreus: true, atreusMsg: "I want to prepare for an upcoming 1:1. Can you help me think through a good coaching question?" };
}

// ─── Follow-through helpers ───────────────────────────────────────────────────
function getTodayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}
function getMostRecentCommitment(pulses) {
  const todayStr = getTodayET();
  for (const p of (pulses || [])) {
    const pulseDate = p.created_date ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(p.created_date)) : null;
    if (pulseDate === todayStr) continue;
    if (p.delegation_commitment?.trim()) return { text: p.delegation_commitment, type: "delegation", pulseId: p.id };
    if (p.focus_intention?.trim())       return { text: p.focus_intention,       type: "intention",  pulseId: p.id };
  }
  return null;
}

const STATUS_OPTS = [
  { value: "did_it",  label: "Did it",  Icon: CheckCircle2, color: "text-emerald-600", ring: "border-emerald-400 bg-emerald-50" },
  { value: "partly",  label: "Partly",  Icon: MinusCircle,  color: "text-amber-500",   ring: "border-amber-400 bg-amber-50" },
  { value: "not_yet", label: "Not yet", Icon: Circle,       color: "text-gray-400",    ring: "border-gray-300 bg-gray-50" },
];

// ─── Big 3 item with status toggle ───────────────────────────────────────────
function Big3Item({ item, index, fromYesterday }) {
  const [done, setDone] = useState(item.status === "completed");
  return (
    <div className={`flex items-start gap-3 py-2.5 ${index > 0 ? "border-t border-border/60" : ""}`}>
      <button
        onClick={() => setDone(d => !d)}
        className="mt-0.5 flex-shrink-0 transition-colors"
      >
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-[#0202ff]/50" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug transition-colors ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.title}
        </p>
        {item.context && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{item.context}</p>
        )}
      </div>
      {fromYesterday && (
        <span className="text-[9px] text-[#0202ff]/60 font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5">Set last night</span>
      )}
    </div>
  );
}

// ─── Decision Journal outcome options ────────────────────────────────────────
const DECISION_OUTCOMES = [
  { value: "did_it",        label: "Did it",       Icon: CheckCircle2, color: "text-emerald-600", ring: "border-emerald-400 bg-emerald-50" },
  { value: "partly",        label: "Partly",       Icon: MinusCircle,  color: "text-amber-500",   ring: "border-amber-400 bg-amber-50" },
  { value: "not_yet",       label: "Not yet",      Icon: Circle,       color: "text-gray-400",    ring: "border-gray-300 bg-gray-50" },
  { value: "changed_course",label: "Changed course", Icon: ArrowRight, color: "text-blue-500",   ring: "border-blue-300 bg-blue-50" },
];

function DecisionLoopItem({ decision, onOutcomeSaved, onOpenAtreus }) {
  const [expanded, setExpanded]   = useState(false);
  const [outcome, setOutcome]     = useState(null);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [done, setDone]           = useState(false);

  const handleSave = async () => {
    if (!outcome) return;
    setSaving(true);
    try {
      // Preserve JSON form fields by merging outcome notes into the existing JSON object
      let newOutcomeNotes = notes || undefined;
      const rawNotes = decision.outcome_notes || '';
      if (notes && rawNotes.startsWith('{')) {
        try {
          const existing = JSON.parse(rawNotes);
          newOutcomeNotes = JSON.stringify({ ...existing, outcome_text: notes });
        } catch { /* keep plain text */ }
      }
      await base44.entities.DecisionJournal.update(decision.id, {
        outcome,
        outcome_notes: newOutcomeNotes,
        outcome_date: new Date().toISOString(),
        status: 'completed',
      });
      setDone(true);
      toast.success("Outcome captured.");
      onOutcomeSaved?.();

      // If outcome wasn't ideal, trigger an Atreus debrief with full decision_context including pattern metadata
      if (outcome !== 'did_it' && onOpenAtreus) {
        try {
          const res = await base44.functions.invoke('analyzeDecisionQuality', {
            mode: 'debrief',
            decision_text: decision.decision_text,
            outcome,
            outcome_notes: notes,
          });
          // Handle both response structures: direct message string or object with nested fields
          const responseData = res.data || {};
          const debriefMsg = responseData.opening_prompt || responseData.debrief_message || responseData.message || `Let's debrief on how "${decision.decision_text.substring(0, 50)}..." went and what you're learning.`;
          
          onOpenAtreus(debriefMsg, {
            mode: 'decision_debrief',
            decision_text: decision.decision_text,
            outcome,
            pattern_name: decision.pattern_name,
            pattern_bucket: decision.pattern_bucket,
            calibration_flag: responseData.overconfidence_detected ? 'overconfidence_bias' : null,
          });
        } catch (e) {
          // non-blocking — debrief is an enhancement; log for debugging
          console.warn('Decision debrief failed:', e.message);
        }
      }
    } catch (e) {
      console.error('Outcome save error', e);
      toast.error("Couldn't save outcome.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-emerald-600">
        <CheckCircle2 className="w-3.5 h-3.5" /> Loop closed on: <span className="font-medium truncate">{decision.decision_text}</span>
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 first:border-t-0 pt-2 first:pt-0">
      <button className="flex items-start justify-between w-full text-left gap-2 py-1" onClick={() => setExpanded(v => !v)}>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#0202ff]/70 mb-0.5">{decision.pattern_name}</p>
          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{decision.decision_text}</p>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="mt-2.5 space-y-2.5">
          <p className="text-xs text-muted-foreground">How did this decision go?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DECISION_OUTCOMES.map(({ value, label, Icon, color, ring }) => (
              <button
                key={value}
                onClick={() => setOutcome(value)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${outcome === value ? ring + " " + color : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          {outcome && (
            <textarea
              placeholder={outcome === "did_it" ? "Any notes on how it went? (optional)" : "What happened? What would you do differently?"}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-muted/50 border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
              rows={2}
            />
          )}
          {outcome && (
            <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Capture outcome"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TodaysPlaybook({ pulse, todayRecord, yesterdayBig3 = [], trends, goals, assignments, pulses, pendingDecisions = [], onDecisionOutcomeSaved, onOpenAtreus, onRefresh, onBig3Saved, userEmail }) {
  const { user } = useAuth();
  const email = userEmail || user?.email;

  const [moveDone, setMoveDone]       = useState(false);
  const [committed, setCommitted]     = useState(false);
  const commitment = getMostRecentCommitment(pulses);
  const [ftSelected, setFtSelected]   = useState(null);
  const [ftReflection, setFtReflection] = useState("");
  const [ftSubmitted, setFtSubmitted] = useState(false);
  const [ftLoading, setFtLoading]     = useState(false);
  const [ftExpanded, setFtExpanded]   = useState(false);

  const [loopExpanded, setLoopExpanded] = useState(true);

  const activeGoals = (goals || []).filter(g => g.status === "active");
  const topGoal     = [...activeGoals].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];
  const situation   = buildSituation(pulse, trends, goals, null);
  const move        = buildMove(pulse, trends, goals, assignments);

  // Determine the Big 3 to show: today's record first, then fall back to yesterday's
  const todayBig3     = (todayRecord?.big3_priorities || []).filter(p => p?.title);
  const big3          = todayBig3.length > 0 ? todayBig3 : yesterdayBig3.filter(p => p?.title);
  const big3FromYesterday = todayBig3.length === 0 && big3.length > 0;

  const saveCommitment = async () => {
    if (committed) return;
    try {
      await base44.entities.Goal.create({ user_email: email, created_by: email, title: move.move, description: move.reason, status: "active", goal_type: "behavioral_commitment", source: "next_move", progress: 0 });
      setCommitted(true);
    } catch {}
  };

  const handleAtreus = async () => {
    await saveCommitment();
    onOpenAtreus?.(move.atreusMsg, null);
  };

  const handleFtSubmit = async () => {
    if (!ftSelected || !commitment) return;
    setFtLoading(true);
    await base44.entities.ManagerPulse.create({
      user_email: email,
      prompt_type: "follow_up",
      source: "web",
      focus_intention: ftReflection || `Follow-through: ${ftSelected} on "${commitment.text}"`,
      intent_actuals_gap: ftSelected === "did_it" ? "no_gap_detected" : "insufficient_data",
    }).catch(() => {});
    setFtLoading(false);
    setFtSubmitted(true);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <p className="text-xs font-bold text-foreground uppercase tracking-widest">Today's Playbook</p>
        {big3FromYesterday && (
          <span className="text-[10px] text-[#6c84e8] font-medium bg-[#0202ff]/10 dark:bg-[#0202ff]/15 dark:text-[#8fa4f0] px-2 py-0.5 rounded-full">From last night</span>
        )}
      </div>

      {/* ── BIG 3: Hero section (read-only) ──────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Your Big 3</p>

        {big3.length > 0 ? (
          <div>
            {big3.map((p, i) => (
              <Big3Item key={p.id || i} item={p} index={i} fromYesterday={false} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground italic">
              No priorities were set last night.
            </p>
            <Big3QuickSet todayRecord={todayRecord} onSaved={onBig3Saved} />
          </div>
        )}
      </div>

      {/* ── Situation signal ─────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
          {situation.signals.includes("overload") ? "Load signal" :
           situation.signals.includes("avoidance") ? "Attention signal" :
           situation.signals.includes("low_energy") || situation.signals.includes("declining_energy") ? "Energy signal" :
           situation.signals.includes("stalled_goals") ? "Situation read" :
           "Today's read"}
        </p>
        <div className="flex items-start gap-2.5">
          <span className="text-base flex-shrink-0 mt-0.5">{situation.icon}</span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-snug">{situation.headline}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{situation.body}</p>
          </div>
        </div>
      </div>

      {/* ── One move ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">One move</p>
        {moveDone ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">Done. That's noted.</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground leading-snug">{move.move}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{move.reason}</p>
            {committed && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <p className="text-[10px] text-emerald-700 font-medium">Saved as a commitment</p>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              {move.atreus ? (
                <Button size="sm" className="flex-1 bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8" onClick={handleAtreus}>
                  <Brain className="w-3 h-3 mr-1.5" /> Work on this
                </Button>
              ) : (
                <Link to={move.link} className="flex-1" onClick={saveCommitment}>
                  <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8">
                    Take action <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="outline" className="text-xs h-8 text-muted-foreground" onClick={() => setMoveDone(true)}>
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Done
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Unified Close the Loop ───────────────────────────────────── */}
      {(pendingDecisions.length > 0 || activeGoals.length > 0 || commitment) && (
        <div className="px-5 py-3 border-b border-border">
          <button className="flex items-center justify-between w-full text-left" onClick={() => setLoopExpanded(v => !v)}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Close the loop</p>
            {loopExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
          </button>

          {loopExpanded && (
            <div className="mt-3 space-y-4">

              {/* Decisions subsection */}
              {pendingDecisions.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-[#0202ff]/70 uppercase tracking-widest mb-2">Decisions</p>
                  <div className="space-y-1">
                    {pendingDecisions.map(d => (
                      <DecisionLoopItem
                        key={d.id}
                        decision={d}
                        onOutcomeSaved={() => onDecisionOutcomeSaved?.()}
                        onOpenAtreus={onOpenAtreus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Goals subsection */}
              {activeGoals.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest">Goals</p>
                    <Link to="/my-performance"><span className="text-[10px] text-[#0202ff] font-medium hover:underline">All goals →</span></Link>
                  </div>
                  <div className="space-y-2">
                    {activeGoals.slice(0, 3).map(g => (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-foreground truncate flex-1 mr-2">{g.title}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{g.progress || 0}%</span>
                        </div>
                        <Progress value={g.progress || 0} className="h-1" />
                      </div>
                    ))}
                    {activeGoals.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{activeGoals.length - 3} more active</p>
                    )}
                  </div>
                </div>
              )}

              {/* Commitments (pulse follow-through) subsection */}
              {commitment && !ftSubmitted && (
                <div>
                  <p className="text-[9px] font-bold text-amber-600/80 uppercase tracking-widest mb-2">Commitments</p>
                  <button className="flex items-start justify-between w-full text-left gap-2 py-1" onClick={() => setFtExpanded(v => !v)}>
                    <p className="text-xs font-medium text-foreground line-clamp-1 flex-1">{commitment.text}</p>
                    {ftExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {ftExpanded && (
                    <div className="mt-2.5 space-y-2.5">
                      <p className="text-xs text-muted-foreground">How did it go?</p>
                      <div className="flex gap-2">
                        {STATUS_OPTS.map(({ value, label, Icon, color, ring }) => (
                          <button
                            key={value}
                            onClick={() => setFtSelected(value)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${ftSelected === value ? ring + " " + color : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"}`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {label}
                          </button>
                        ))}
                      </div>
                      {ftSelected && ftSelected !== "did_it" && (
                        <textarea
                          placeholder={ftSelected === "partly" ? "What got in the way?" : "What stopped you? No judgment — just useful data."}
                          value={ftReflection}
                          onChange={e => setFtReflection(e.target.value)}
                          className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-muted/50 border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0202ff]/30"
                          rows={2}
                        />
                      )}
                      {ftSelected && (
                        <Button size="sm" className="w-full bg-[#0202ff] hover:bg-[#0101dd] text-white text-xs h-8" onClick={handleFtSubmit} disabled={ftLoading}>
                          {ftLoading ? "Saving…" : "Log this"}
                        </Button>
                      )}
                      <p className="text-[10px] text-muted-foreground italic">This feeds your pattern memory — private to you.</p>
                    </div>
                  )}
                </div>
              )}

              {ftSubmitted && (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Loop closed. Atreus will learn from this.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}