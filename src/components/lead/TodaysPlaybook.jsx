/**
 * TodaysPlaybook — The single consolidated "Do Now" card for Lead.
 *
 * Merges WhatMattersNow + NextMove + FollowThrough + GoalsPulse into one
 * coherent, progressive narrative card. Three visual sections:
 *   1. Situation read  (What's happening right now)
 *   2. The move        (One clear recommended action)
 *   3. Loop closer     (Did you follow through on yesterday's intent?)
 */
import React, { useState } from "react";
import {
  Brain, ArrowRight, CheckCircle2, Circle, MinusCircle,
  BookmarkCheck, Zap, Target, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// ─── Situation builder (from WhatMattersNow logic) ───────────────────────────
function buildSituation(pulse, trends, goals, insight) {
  const activeGoals   = (goals || []).filter(g => g.status === "active");
  const stalledGoals  = activeGoals.filter(g => (g.progress || 0) < 25);

  const signals = [];
  if (pulse?.energy_level === "drained" || pulse?.energy_level === "stretched")   signals.push("low_energy");
  if (pulse?.perceived_load === "heavy" || pulse?.perceived_load === "unsustainable") signals.push("overload");
  if (pulse?.avoidance_flag === "yes")          signals.push("avoidance");
  if (trends?.energy_trend === "declining")     signals.push("declining_energy");
  if (trends?.overload_pattern_strength > 60)   signals.push("overload");
  if (trends?.identity_friction_active)         signals.push("friction");
  if (stalledGoals.length > 0)                  signals.push("stalled_goals");

  const chips = [];
  if (signals.includes("overload"))        chips.push({ label: "Heavy load",           bg: "bg-amber-100 text-amber-700" });
  if (signals.includes("low_energy") || signals.includes("declining_energy"))
                                           chips.push({ label: "Energy dip",            bg: "bg-rose-100 text-rose-700" });
  if (signals.includes("avoidance"))       chips.push({ label: "Avoidance flagged",     bg: "bg-orange-100 text-orange-700" });
  if (signals.includes("friction"))        chips.push({ label: "Role clarity friction", bg: "bg-violet-100 text-violet-700" });
  if (signals.includes("stalled_goals"))   chips.push({ label: `${stalledGoals.length} goal${stalledGoals.length > 1 ? "s" : ""} stalled`, bg: "bg-gray-100 text-gray-600" });

  let headline = "You're in a steady state today.";
  let body     = "No major friction signals. A good day to make progress on commitments or prepare for upcoming conversations.";

  if (signals.includes("overload"))        { headline = "You're carrying a heavy load right now.";  body = "Your signals suggest overload. Identify one thing to hand off or defer."; }
  else if (signals.includes("avoidance"))  { headline = "Something feels avoided.";                 body = "You flagged something you might be steering around. Naming it often reduces its weight."; }
  else if (signals.includes("low_energy") || signals.includes("declining_energy")) { headline = "Your energy is lower than usual."; body = "Protect thinking time. Defer non-urgent decisions where possible."; }
  else if (stalledGoals.length > 0)        { headline = `"${stalledGoals[0].title}" hasn't moved.`; body = "A small committed action today is worth more than waiting for the right moment."; }
  else if (insight?.development_areas?.[0]) { const a = insight.development_areas[0].split(" (")[0]; headline = `${a} is your highest-leverage growth edge.`; body = "Your Leadership Index points here as most likely to accelerate impact."; }

  return { headline, body, chips, signals, stalledGoals, activeGoals };
}

// ─── Next move builder (from NextMove logic) ────────────────────────────────
function buildMove(pulse, trends, goals, assignments) {
  if (pulse?.avoidance_flag === "yes")
    return { move: "Name what you're avoiding.", reason: "Taking 5 minutes to write it out often dissolves half the resistance.", atreus: true, atreusMsg: "I flagged that I might be avoiding something today. Can you help me name it and think through a next step?" };
  if (trends?.overload_pattern_strength > 60 || pulse?.perceived_load === "unsustainable")
    return { move: "Identify one thing to hand off today.", reason: "Delegation is a leadership act, not a shortcut.", atreus: true, atreusMsg: "I want to think through what I should delegate. Can you help me work through it?" };
  const stalledGoal = (goals || []).find(g => g.status === "active" && (g.progress || 0) < 25);
  if (stalledGoal)
    return { move: `Make one move on "${stalledGoal.title}"`, reason: "Small, specific actions compound. What's the next 20-minute step?", atreus: false, link: "/my-goals" };
  const overdue = (assignments || []).find(a => a.status === "assigned" && a.due_date && new Date(a.due_date) < new Date());
  if (overdue)
    return { move: `Complete: ${overdue.title}`, reason: "This learning is overdue. Even a partial session helps close the loop.", atreus: false, link: "/my-development" };
  if (trends?.identity_friction_active)
    return { move: "Reconnect with your leadership identity.", reason: "Your recent signals suggest uncertainty about your role.", atreus: true, atreusMsg: "I've been feeling some uncertainty about my role as a leader. Can you help me think through it?" };
  return { move: "Prepare one good question for your next 1:1.", reason: "Intentional questions are one of the most consistent differentiators of effective managers.", atreus: true, atreusMsg: "I want to prepare for an upcoming 1:1. Can you help me think through a good coaching question?" };
}

// ─── Follow-through helpers (from FollowThrough logic) ───────────────────────
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getMostRecentCommitment(pulses) {
  const todayStr = localDateKey(new Date());
  for (const p of (pulses || [])) {
    const pulseDate = p.created_date ? localDateKey(new Date(p.created_date)) : null;
    if (pulseDate === todayStr) continue;
    if (p.delegation_commitment?.trim()) return { text: p.delegation_commitment, type: "delegation",  pulseId: p.id, pulseDate };
    if (p.focus_intention?.trim())       return { text: p.focus_intention,       type: "intention",  pulseId: p.id, pulseDate };
  }
  return null;
}

const STATUS_OPTS = [
  { value: "did_it",  label: "Did it",  Icon: CheckCircle2, color: "text-emerald-600", ring: "border-emerald-400 bg-emerald-50" },
  { value: "partly",  label: "Partly",  Icon: MinusCircle,  color: "text-amber-500",   ring: "border-amber-400 bg-amber-50" },
  { value: "not_yet", label: "Not yet", Icon: Circle,       color: "text-gray-400",    ring: "border-gray-300 bg-gray-50" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function TodaysPlaybook({ pulse, todayRecord, trends, goals, assignments, pulses, onOpenAtreus }) {
  const { user } = useAuth();

  // Move state
  const [moveDone, setMoveDone]         = useState(false);
  const [committed, setCommitted]       = useState(false);

  // Follow-through state
  const commitment = getMostRecentCommitment(pulses);
  const [ftSelected, setFtSelected]     = useState(null);
  const [ftReflection, setFtReflection] = useState("");
  const [ftSubmitted, setFtSubmitted]   = useState(false);
  const [ftLoading, setFtLoading]       = useState(false);
  const [ftExpanded, setFtExpanded]     = useState(false);

  // Top active goal for the goal strip
  const activeGoals = (goals || []).filter(g => g.status === "active");
  const topGoal     = [...activeGoals].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

  const situation = buildSituation(pulse, trends, goals, null);
  const move      = buildMove(pulse, trends, goals, assignments);

  const saveCommitment = async () => {
    if (committed) return;
    try {
      await base44.entities.Goal.create({ user_email: user?.email, title: move.move, description: move.reason, status: "active", goal_type: "behavioral_commitment", source: "next_move", progress: 0 });
      setCommitted(true);
    } catch {}
  };

  const handleAtreus = async () => {
    await saveCommitment();
    onOpenAtreus?.(move.atreusMsg);
  };

  const handleFtSubmit = async () => {
    if (!ftSelected || !commitment) return;
    setFtLoading(true);
    await base44.entities.ManagerPulse.create({
      user_email: user?.email,
      prompt_type: "follow_up",
      source: "web",
      focus_intention: ftReflection || `Follow-through: ${ftSelected} on "${commitment.text}"`,
      intent_actuals_gap: ftSelected === "did_it" ? "no_gap_detected" : ftSelected === "partly" ? "partial_follow_through" : "no_follow_through_detected",
    }).catch(() => {});
    setFtLoading(false);
    setFtSubmitted(true);
  };

  const big3 = todayRecord?.big3_priorities?.filter(p => p?.title) || [];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

      {/* ── Card header ───────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <p className="text-xs font-bold text-foreground uppercase tracking-widest">Today's Playbook</p>
      </div>

      {/* ── Big 3 priorities ──────────────────────────────────────────── */}
      {big3.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Big 3</p>
          <div className="space-y-2">
            {big3.map((p, i) => (
              <div key={p.id || i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#0202ff] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug">{p.title}</p>
                  {p.context && <p className="text-[10px] text-muted-foreground mt-0.5">{p.context}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 1: Situation read ─────────────────────────────────── */}
      <div className="px-5 pt-4 pb-4 border-b border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
          {situation.signals.includes("overload") ? "Load signal" :
           situation.signals.includes("avoidance") ? "Attention signal" :
           situation.signals.includes("low_energy") || situation.signals.includes("declining_energy") ? "Energy signal" :
           situation.signals.includes("stalled_goals") ? "Situation read" :
           situation.signals.includes("friction") ? "Friction signal" :
           "Today's read"}
        </p>
        <p className="text-base font-bold text-foreground leading-snug">{situation.headline}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{situation.body}</p>
        {situation.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {situation.chips.map((c, i) => (
              <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.bg}`}>{c.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Today's Move ───────────────────────────────────── */}
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

      {/* ── SECTION 3: Active goal strip ─────────────────────────────── */}
      {topGoal && (
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active focus</p>
            <Link to="/my-goals"><span className="text-[10px] text-[#0202ff] font-medium hover:underline">All goals →</span></Link>
          </div>
          <p className="text-xs font-semibold text-foreground">{topGoal.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Progress value={topGoal.progress || 0} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{topGoal.progress || 0}%</span>
          </div>
          {activeGoals.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1">+{activeGoals.length - 1} more active goal{activeGoals.length > 2 ? "s" : ""}</p>
          )}
        </div>
      )}

      {/* ── SECTION 4: Follow-through loop (collapsible) ─────────────── */}
      {commitment && !ftSubmitted && (
        <div className="px-5 py-3">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setFtExpanded(v => !v)}
          >
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Close the loop</p>
              <p className="text-xs text-foreground font-medium mt-0.5 line-clamp-1">{commitment.text}</p>
            </div>
            {ftExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            }
          </button>

          {ftExpanded && (
            <div className="mt-3 space-y-2.5">
              <p className="text-xs text-muted-foreground">How did it go?</p>
              <div className="flex gap-2">
                {STATUS_OPTS.map(({ value, label, Icon, color, ring }) => (
                  <button
                    key={value}
                    onClick={() => setFtSelected(value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${ftSelected === value ? ring + " " + color : "bg-background border-border text-muted-foreground hover:bg-muted/50"}`}
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
        <div className="px-5 py-3 flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" /> Loop closed. Atreus will learn from this.
        </div>
      )}
    </div>
  );
}