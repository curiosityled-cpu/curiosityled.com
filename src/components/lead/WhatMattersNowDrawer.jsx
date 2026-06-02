/**
 * WhatMattersNowDrawer — Expandable evidence trail for What Matters Now.
 * Shows reported vs observed vs interpreted layers separately for trust.
 */
import React from "react";
import { Eye, Radar, Brain } from "lucide-react";

function EvidenceLayer({ icon: Icon, iconColor, iconBg, label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3 h-3 ${iconColor}`} />
        </div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <div className="space-y-1 pl-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
            <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
            <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WhatMattersNowDrawer({ pulse, trends, goals, insight }) {
  // Reported — what the user directly told us today
  const reported = [];
  if (pulse?.energy_level) {
    const map = { drained: "Feeling drained today (self-reported)", stretched: "Feeling stretched today (self-reported)", steady: "Energy is steady today", strong: "Feeling strong today" };
    if (map[pulse.energy_level]) reported.push(map[pulse.energy_level]);
  }
  if (pulse?.perceived_load) {
    const map = { unsustainable: "Load feels unsustainable (self-reported)", heavy: "Heavy load today (self-reported)", manageable: "Load feels manageable", light: "Light load today" };
    if (map[pulse.perceived_load]) reported.push(map[pulse.perceived_load]);
  }
  if (pulse?.avoidance_flag === 'yes') reported.push("Something being avoided (self-reported)");
  if (pulse?.confidence_today === 'low' || pulse?.confidence_today === 'uncertain') reported.push("Confidence lower than usual (self-reported)");
  if (pulse?.biggest_weight_today) reported.push(`"${pulse.biggest_weight_today}"`);
  if (reported.length === 0) reported.push("No check-in completed yet today");

  // Observed — signals from behavior/context/data over time
  const observed = [];
  if (trends?.data_points_28d > 0) observed.push(`${trends.data_points_28d} check-ins recorded in the last 28 days`);
  if (trends?.overload_pattern_strength > 40) observed.push(`Overload pattern detected at ${Math.round(trends.overload_pattern_strength)}% strength`);
  if (trends?.delegation_gap_count_7d > 0) observed.push(`${trends.delegation_gap_count_7d} delegation commitments not followed through this week`);
  if (trends?.learning_stall_detected) observed.push("Development activity has stalled recently");
  const stalled = goals.filter(g => g.status === 'active' && (g.progress || 0) < 20);
  if (stalled.length > 0) observed.push(`${stalled.length} active goal${stalled.length > 1 ? 's' : ''} with <20% progress`);
  if (observed.length === 0) observed.push("Insufficient behavioral data yet — patterns build over time");

  // Interpreted — AI-derived meaning
  const interpreted = [];
  if (trends?.energy_trend === 'declining') interpreted.push("Energy has been trending downward over the last period");
  if (trends?.confidence_trend === 'declining') interpreted.push("Confidence signals are weakening");
  if (trends?.identity_friction_active) interpreted.push("Role identity friction signals are active");
  if (insight?.archetype) interpreted.push(`Leadership archetype: ${insight.archetype}`);
  if (insight?.development_areas?.[0]) interpreted.push(`Highest-leverage growth area: ${insight.development_areas[0].split(' (')[0]}`);
  if (interpreted.length === 0) interpreted.push("More data needed to generate interpreted signals");

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">How this read is built</p>
      <EvidenceLayer
        icon={Eye}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
        label="Reported — what you told us"
        items={reported}
      />
      <EvidenceLayer
        icon={Radar}
        iconColor="text-amber-600"
        iconBg="bg-amber-50"
        label="Observed — behavioral signals"
        items={observed}
      />
      <EvidenceLayer
        icon={Brain}
        iconColor="text-violet-600"
        iconBg="bg-violet-50"
        label="Interpreted — AI patterns"
        items={interpreted}
      />
      <p className="text-[10px] text-gray-400 leading-relaxed">All of this is private to you. No organizational view has access to these signals.</p>
    </div>
  );
}