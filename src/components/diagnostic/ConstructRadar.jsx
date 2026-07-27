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

  const data = Object.entries(constructScores || {}).map(([key, score]) => ({
    key,
    subject: CONSTRUCT_LABELS[key] || key,
    score: Math.max(0, Math.min(100, score || 0)),
  }));

  // Custom tick renders the full label without truncation; small font keeps it compact
  // without shrinking the chart radius.
  const renderTick = (props) => {
    const { x, y, cx, payload, index } = props;
    const label = data[index]?.subject || payload.value;
    const anchor = x > cx + 2 ? "start" : x < cx - 2 ? "end" : "middle";
    return (
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="middle"
        fontSize={9}
        fill="#6b7280"
        style={{ fontWeight: 500 }}
      >
        {label}
      </text>
    );
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={renderTick} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#0202ff" strokeWidth={2} fill="#0202ff" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Score legend — two-column grid, large & legible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {data.map((d) => (
          <div
            key={d.key}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5"
          >
            <span className="text-sm font-medium text-gray-700 pr-2 leading-tight">
              {d.subject}
            </span>
            <span className="text-base font-bold text-gray-900 tabular-nums shrink-0">
              {d.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}