/**
 * MoodRingIndicator
 * A compact, glanceable "ring" showing today's energy state on the Today page header.
 */
import React from "react";

const CONFIGS = {
  strong:    { ring: "ring-[#0202ff]",  bg: "bg-blue-50",   dot: "bg-[#0202ff]",  label: "Strong energy",    emoji: "💪" },
  steady:    { ring: "ring-blue-300",   bg: "bg-blue-50",   dot: "bg-blue-400",   label: "Steady",           emoji: "✅" },
  stretched: { ring: "ring-amber-400",  bg: "bg-amber-50",  dot: "bg-amber-400",  label: "Stretched",        emoji: "⚡" },
  drained:   { ring: "ring-rose-400",   bg: "bg-rose-50",   dot: "bg-rose-400",   label: "Feeling drained",  emoji: "🔋" },
};

export default function MoodRingIndicator({ todayPulse }) {
  if (!todayPulse?.energy_level) return null;
  const config = CONFIGS[todayPulse.energy_level];
  if (!config) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${config.bg} border ${config.ring.replace("ring-","border-")}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0`} />
      <span className="text-xs font-medium text-gray-700">{config.label}</span>
      <span className="text-xs">{config.emoji}</span>
    </div>
  );
}