/**
 * SituationSignalCard — Derived signal from pulse, trends, and goals.
 * Label adapts to the strongest signal (Load / Attention / Energy / Situation read / Today's read).
 * Extracted from TodaysPlaybook so it can sit in the Reflect card.
 */
import React from "react";

function buildSituation(pulse, trends, goals) {
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

  return { headline, body, icon, signals };
}

export default function SituationSignalCard({ pulse, trends, goals }) {
  const situation = buildSituation(pulse, trends, goals);

  const label =
    situation.signals.includes("overload") ? "Load signal" :
    situation.signals.includes("avoidance") ? "Attention signal" :
    situation.signals.includes("low_energy") || situation.signals.includes("declining_energy") ? "Energy signal" :
    situation.signals.includes("stalled_goals") ? "Situation read" :
    "Today's read";

  return (
    <div className="bg-card border border-border rounded-2xl px-5 py-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-start gap-2.5">
        <span className="text-base flex-shrink-0 mt-0.5">{situation.icon}</span>
        <div>
          <p className="text-sm font-semibold text-foreground leading-snug">{situation.headline}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{situation.body}</p>
        </div>
      </div>
    </div>
  );
}