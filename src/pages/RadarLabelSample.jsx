import React, { useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Reframed construct labels — each describes a CAPABILITY, so the outer
// edge (100) consistently represents the ideal state for every dimension.
// This is the proposed new framing for the /diagnostic radar.
const REFRAMED_LABELS = {
  early_signal_detection: "Early Signal Detection",
  flow_of_work_support: "Flow-of-Work Support",
  proof_defensibility: "Proof & Defensibility",
  system_cohesion: "System Cohesion",
  proactive_cost_awareness: "Proactive Cost Awareness",
};

// Three sample profiles to show how the shape changes with maturity.
// A "weak" organization shrinks toward the center; a "strong" one fills
// toward the edge. With capability-framed labels, this now reads intuitively:
// bigger = healthier support system across ALL dimensions.
const PROFILES = {
  reactive: {
    name: "Reactive & Fragmented",
    scores: { early_signal_detection: 28, flow_of_work_support: 35, proof_defensibility: 42, system_cohesion: 22, proactive_cost_awareness: 30 },
  },
  transition: {
    name: "In Transition",
    scores: { early_signal_detection: 58, flow_of_work_support: 62, proof_defensibility: 65, system_cohesion: 54, proactive_cost_awareness: 60 },
  },
  ready: {
    name: "Earlier-Intervention Ready",
    scores: { early_signal_detection: 88, flow_of_work_support: 84, proof_defensibility: 90, system_cohesion: 82, proactive_cost_awareness: 86 },
  },
};

const buildData = (scores) =>
  Object.entries(scores).map(([key, score]) => ({
    key,
    subject: REFRAMED_LABELS[key],
    score: Math.max(0, Math.min(100, score || 0)),
  }));

// Custom tick renders the full label without truncation.
const renderTick = (props) => {
  const { x, y, cx, payload, index, data } = props;
  const label = data[index]?.subject || payload.value;
  const anchor = x > cx + 2 ? "start" : x < cx - 2 ? "end" : "middle";
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize={11}
      fill="#4b5563"
      style={{ fontWeight: 600 }}
    >
      {label}
    </text>
  );
};

export default function RadarLabelSample() {
  const [profileKey, setProfileKey] = useState("reactive");
  const profile = PROFILES[profileKey];
  const data = buildData(profile.scores);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Radar Label Reframe — Visual Sample
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Each dimension now describes a <span className="font-semibold">capability</span>, so the
            outer edge (100) always represents the ideal. A larger shape = a healthier, more
            proactive leadership support system — regardless of which dimension you look at.
          </p>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(PROFILES).map(([key, p]) => (
              <Button
                key={key}
                size="sm"
                variant={profileKey === key ? "default" : "outline"}
                onClick={() => setProfileKey(key)}
              >
                {p.name}
              </Button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="subject"
                tick={(props) => renderTick({ ...props, data })}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="score"
                stroke="#0202ff"
                strokeWidth={2}
                fill="#0202ff"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-700">{d.subject}</span>
                <span className="text-sm font-bold text-slate-900">{d.score}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 text-slate-100 border-slate-700">
          <h2 className="text-lg font-semibold mb-3">Label mapping (old → new)</h2>
          <ul className="space-y-2 text-sm">
            <li><span className="text-slate-400">Signal Delay</span> → <span className="font-semibold text-white">Early Signal Detection</span></li>
            <li><span className="text-slate-400">Support Friction</span> → <span className="font-semibold text-white">Flow-of-Work Support</span></li>
            <li><span className="text-slate-400">Proof &amp; Defensibility</span> → <span className="font-semibold text-white">Proof &amp; Defensibility</span> <span className="text-slate-400">(already a capability)</span></li>
            <li><span className="text-slate-400">Fragmentation &amp; Admin Burden</span> → <span className="font-semibold text-white">System Cohesion</span></li>
            <li><span className="text-slate-400">Cost of Inaction</span> → <span className="font-semibold text-white">Proactive Cost Awareness</span></li>
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            With capability-framed labels, the two dimensions that previously looked "small" when
            problematic (Signal Delay, Fragmentation) now shrink toward the center for the right
            reason — because the organization has low capability there — and expand outward as
            that capability improves.
          </p>
        </Card>
      </div>
    </div>
  );
}