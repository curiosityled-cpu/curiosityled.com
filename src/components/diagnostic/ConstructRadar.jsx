import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { useDiagnosticConfig } from "./DiagnosticConfigContext";

// Five-construct radar chart (0-100), higher = stronger.
// Labels come from the active diagnostic config so both general and BPO variants work.
export default function ConstructRadar({ constructScores }) {
  const config = useDiagnosticConfig();
  const { scoring } = config;
  const CONSTRUCT_LABELS = scoring.CONSTRUCT_LABELS;

  // Short labels for the radar: take first word or two of each construct label
  const SHORT_LABELS = Object.fromEntries(
    Object.keys(CONSTRUCT_LABELS || {}).map((key) => {
      const full = CONSTRUCT_LABELS[key];
      // Shorten to first 12 chars for radar readability
      const short = full.length > 14 ? full.substring(0, 12) + "\u2026" : full;
      return [key, short];
    })
  );

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