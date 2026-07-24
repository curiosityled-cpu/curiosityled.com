import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const SHORT_LABELS = {
  signal_delay: "Signal Delay",
  support_friction: "Support Friction",
  proof_defensibility: "Proof & Def.",
  fragmentation_admin: "Fragmentation",
  cost_of_inaction: "Cost of Inaction",
};

// Five-construct radar chart (0-100), higher = stronger.
export default function ConstructRadar({ constructScores }) {
  const data = Object.entries(constructScores || {}).map(([key, score]) => ({
    subject: SHORT_LABELS[key] || key,
    score: Math.max(0, Math.min(100, score || 0)),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} outerRadius="68%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6b7280" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke="#0202ff" strokeWidth={2} fill="#0202ff" fillOpacity={0.2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}