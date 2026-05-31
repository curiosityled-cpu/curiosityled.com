/**
 * TrendSignalsChart — Richer trend visualization for Patterns page.
 * Shows energy, confidence, resilience, and load over last 14 check-ins.
 * Brief spec: "trend lines, frequency charts, confidence/load overlays, commitment follow-through"
 * Each metric paired with a plain-language explanation.
 */
import React, { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Map enum values to numeric score (0-3)
const ENERGY_SCORE = { drained: 0, stretched: 1, steady: 2, strong: 3 };
const LOAD_SCORE = { unsustainable: 0, heavy: 1, manageable: 2, light: 3 };
const CONFIDENCE_SCORE = { low: 0, uncertain: 1, steady: 2, high: 3 };
const RESILIENCE_SCORE = { depleted: 0, fragile: 1, holding: 2, bouncing_back: 3 };

const METRICS = [
  {
    key: "energy",
    label: "Energy",
    color: "#0202ff",
    bg: "bg-[#0202ff]",
    lightBg: "bg-[#0202ff]/10",
    score: (p) => ENERGY_SCORE[p.energy_level] ?? null,
    labels: ["Drained", "Stretched", "Steady", "Strong"],
  },
  {
    key: "confidence",
    label: "Confidence",
    color: "#7c3aed",
    bg: "bg-violet-600",
    lightBg: "bg-violet-100",
    score: (p) => CONFIDENCE_SCORE[p.confidence_today] ?? null,
    labels: ["Low", "Uncertain", "Steady", "High"],
  },
  {
    key: "load",
    label: "Load",
    color: "#f59e0b",
    bg: "bg-amber-500",
    lightBg: "bg-amber-100",
    score: (p) => LOAD_SCORE[p.perceived_load] ?? null,
    labels: ["Unsustainable", "Heavy", "Manageable", "Light"],
    inverted: true, // lower load = better
  },
  {
    key: "resilience",
    label: "Resilience",
    color: "#10b981",
    bg: "bg-emerald-500",
    lightBg: "bg-emerald-100",
    score: (p) => RESILIENCE_SCORE[p.resilience_signal] ?? null,
    labels: ["Depleted", "Fragile", "Holding", "Bouncing back"],
  },
];

function TrendDirection({ values }) {
  if (values.length < 4) return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  const first = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 2);
  const second = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / (values.length - Math.floor(values.length / 2));
  const diff = second - first;
  if (diff > 0.3) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (diff < -0.3) return <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
}

function MiniBarChart({ values, color, max = 3 }) {
  if (values.length === 0) return <div className="text-xs text-gray-400">No data</div>;
  const w = Math.max(20, Math.min(280, values.length * 16));
  const h = 36;
  const pad = 2;
  const barW = Math.max(4, (w / values.length) - pad);

  return (
    <svg width={w} height={h} className="overflow-visible">
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * (h - 4));
        const x = i * (barW + pad);
        const y = h - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={2}
            fill={color}
            opacity={0.7 + (i / values.length) * 0.3}
          />
        );
      })}
    </svg>
  );
}

function MetricRow({ metric, pulses }) {
  const dataPoints = pulses
    .map(p => metric.score(p))
    .filter(v => v !== null);

  if (dataPoints.length === 0) return null;

  const avg = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  const avgLabel = metric.labels[Math.round(avg)] || metric.labels[2];
  const recent = dataPoints.slice(0, 7);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-20 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-700">{metric.label}</p>
        <p className="text-[10px] text-gray-400">{avgLabel}</p>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <MiniBarChart values={[...dataPoints].reverse().slice(0, 14)} color={metric.color} />
      </div>
      <div className="flex-shrink-0">
        <TrendDirection values={dataPoints} />
      </div>
    </div>
  );
}

// Commitment follow-through bar
function FollowThroughBar({ pulses }) {
  const followUps = pulses.filter(p => p.prompt_type === 'follow_up');
  const completed = followUps.filter(p => p.intent_actuals_gap === 'no_gap_detected').length;
  const total = followUps.length;
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="pt-3 border-t border-gray-100 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Commitment follow-through</p>
        <p className="text-xs font-bold text-gray-800">{pct}%</p>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444' }}
        />
      </div>
      <p className="text-[10px] text-gray-400">{completed} of {total} commitments followed through · Private</p>
    </div>
  );
}

export default function TrendSignalsChart({ trends, pulses = [] }) {
  const [expanded, setExpanded] = useState(false);
  const recent = pulses.slice(0, 14);

  if (recent.length < 3) return null;

  const plainExplanation = (() => {
    const energyVals = recent.map(p => ENERGY_SCORE[p.energy_level]).filter(v => v !== undefined);
    const confVals = recent.map(p => CONFIDENCE_SCORE[p.confidence_today]).filter(v => v !== undefined);
    if (energyVals.length === 0) return null;
    const avgE = energyVals.reduce((a, b) => a + b, 0) / energyVals.length;
    const avgC = confVals.length > 0 ? confVals.reduce((a, b) => a + b, 0) / confVals.length : null;
    const eTrend = trends?.energy_trend;
    const cTrend = trends?.confidence_trend;

    let line = `Energy has been averaging ${avgE >= 2.5 ? 'strong to steady' : avgE >= 1.5 ? 'steady to stretched' : 'stretched to drained'} across your last ${energyVals.length} check-ins.`;
    if (eTrend === 'improving') line += ' The trend is moving upward.';
    if (eTrend === 'declining') line += ' The trend has been moving downward recently.';
    if (avgC !== null) line += ` Confidence is ${avgC >= 2.5 ? 'consistently high' : avgC >= 1.5 ? 'holding steady' : 'lower than usual'} in the same period.`;
    if (cTrend && cTrend !== 'stable' && cTrend !== 'insufficient_data') {
      line += cTrend === 'improving' ? ' Confidence is building.' : ' Confidence has been declining.';
    }
    return line;
  })();

  return (
    <Card className="shadow-sm border border-gray-100 bg-white rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Trend signals</p>
            <p className="text-[10px] text-gray-400">Last {recent.length} check-ins · Private</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? 'Less' : 'Detail'}
        </button>
      </div>
      <CardContent className="px-5 pt-2 pb-5 space-y-1">
        {/* Plain language summary */}
        {plainExplanation && (
          <p className="text-xs text-gray-500 leading-relaxed pb-2">{plainExplanation}</p>
        )}

        {/* Bar charts per metric */}
        {expanded ? (
          <div>
            {METRICS.map(metric => (
              <MetricRow key={metric.key} metric={metric} pulses={recent} />
            ))}
            <FollowThroughBar pulses={pulses} />
          </div>
        ) : (
          /* Compact view: just the 4 status pills */
          <div className="grid grid-cols-2 gap-2 pt-1">
            {METRICS.map(metric => {
              const vals = recent.map(p => metric.score(p)).filter(v => v !== null);
              if (vals.length === 0) return null;
              const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
              const label = metric.labels[Math.round(avg)] || '—';
              const trendDir = (() => {
                if (vals.length < 4) return 'stable';
                const h = Math.floor(vals.length / 2);
                const a1 = vals.slice(0, h).reduce((x, y) => x + y, 0) / h;
                const a2 = vals.slice(h).reduce((x, y) => x + y, 0) / (vals.length - h);
                if (a2 - a1 > 0.3) return 'up';
                if (a1 - a2 > 0.3) return 'down';
                return 'stable';
              })();
              const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus;
              const trendColor = trendDir === 'up' ? 'text-emerald-500' : trendDir === 'down' ? 'text-rose-500' : 'text-gray-400';
              return (
                <div key={metric.key} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: metric.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400">{metric.label}</p>
                    <p className="text-xs font-semibold text-gray-700 truncate">— {label}</p>
                  </div>
                  <TrendIcon className={`w-3 h-3 flex-shrink-0 ${trendColor}`} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}