import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const TABS = [
  { key: "SCORE", label: "SCORE" },
  { key: "GROWTH", label: "GROWTH BLOCK" },
  { key: "BLUEPRINT", label: "90-DAY BLUEPRINT" },
];

const STATES = [
  {
    eyebrow: "01 / YOUR SCORE",
    headline: "See All Five Scores in One View.",
    body: "See what is working and which part of your leadership support needs attention first.",
  },
  {
    eyebrow: "02 / GROWTH BLOCK",
    headline: "Your First Area to Fix.",
    body: "Get a clear answer about what may be slowing leadership growth right now.",
  },
  {
    eyebrow: "03 / 90-DAY BLUEPRINT",
    headline: "Your Next Moves, in Order.",
    body: "Use the blueprint with your team or bring it to Curiosity Led.",
  },
];

// Per-state radar data
// SCORE — all five areas, normal
// GROWTH — Follow-through highlighted as the #1 block (lowest score)
// BLUEPRINT — projected 90-day target scores
const RADAR_STATES = [
  [
    { area: "Support", value: 65 },
    { area: "Readiness", value: 72 },
    { area: "Follow-through", value: 58 },
    { area: "Coordination", value: 70 },
    { area: "Insight", value: 80 },
  ],
  [
    { area: "Support", value: 65, focus: null },
    { area: "Readiness", value: 72, focus: null },
    { area: "Follow-through", value: 58, focus: 58 },
    { area: "Coordination", value: 70, focus: null },
    { area: "Insight", value: 80, focus: null },
  ],
  [
    { area: "Support", value: 78 },
    { area: "Readiness", value: 84 },
    { area: "Follow-through", value: 75 },
    { area: "Coordination", value: 82 },
    { area: "Insight", value: 88 },
  ],
];

const GAUGE = [
  { value: 68, label: "Leadership Readiness Score" },
  { value: 58, label: "#1 Growth Block · Follow-through" },
  { value: 82, label: "90-Day Target Score" },
];

const RULER = [
  { day: "30", label: "Assess" },
  { day: "60", label: "Support" },
  { day: "90", label: "Develop" },
];

function ScoreGauge({ value, label }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E5E5" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#0202ff"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-bold text-[#0a0a0a] leading-none">{value}</div>
          <div className="text-xs text-gray-400 mt-0.5">/ 100</div>
        </div>
      </div>
      <p className="text-[10px] font-semibold text-gray-500 mt-2 tracking-wide uppercase text-center">{label}</p>
    </div>
  );
}

function RadarVisual({ active }) {
  const data = RADAR_STATES[active];
  const isGrowth = active === 1;
  const isBlueprint = active === 2;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#E5E5E5" />
        <PolarAngleAxis dataKey="area" tick={{ fontSize: 9, fill: "#666" }} />
        {/* Base layer — dim when highlighting a focus area */}
        <Radar
          dataKey="value"
          stroke="#0202ff"
          fill="#0202ff"
          fillOpacity={isGrowth ? 0.05 : isBlueprint ? 0.06 : 0.12}
          strokeWidth={isGrowth ? 1 : 1.5}
          strokeOpacity={isGrowth ? 0.35 : 1}
          strokeDasharray={isBlueprint ? "4 3" : undefined}
        />
        {/* Focus layer — only the #1 growth block area renders bold on top */}
        {isGrowth && (
          <Radar
            dataKey="focus"
            stroke="#0202ff"
            fill="#0202ff"
            fillOpacity={0.35}
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default function ReportPreviewCard() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % STATES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const state = STATES[active];
  const gauge = GAUGE[active];

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-white shadow-xl">
      {/* Black header bar */}
      <div className="flex items-center justify-between bg-[#0a0a0a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-white">
            <img
              src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
              alt=""
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="text-white">
            <div className="text-xs font-bold tracking-wide">CURIOSITY LED</div>
            <div className="text-[10px] text-gray-400 leading-none">LEADERSHIP INTELLIGENCE BRIEF</div>
          </div>
        </div>
        <span className="text-[10px] font-medium text-white border border-gray-600 px-2 py-0.5 rounded">PDF REPORT</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100 px-4">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(i)}
            className={`py-2.5 text-xs font-semibold tracking-wide transition-colors ${
              i === active ? "text-[#0a0a0a] border-b-2" : "text-gray-400"
            }`}
            style={i === active ? { borderColor: "#0202ff" } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Score + radar — visuals change per state */}
      <div className="px-5 py-5 flex items-center gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`gauge-${active}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ScoreGauge value={gauge.value} label={gauge.label} />
          </motion.div>
        </AnimatePresence>
        <div className="flex-1 h-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={`radar-${active}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full w-full"
            >
              <RadarVisual active={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Rotating takeaway content */}
      <div className="px-5 pb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <p className="text-[11px] font-semibold tracking-wide text-[#0202ff] mb-1">{state.eyebrow}</p>
            <p className="text-sm font-bold text-[#0a0a0a] mb-1">{state.headline}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{state.body}</p>
          </motion.div>
        </AnimatePresence>

        {/* Progress ruler */}
        <div className="mt-4 relative">
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between -mt-3">
            {RULER.map((node, i) => (
              <div key={node.day} className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded border flex items-center justify-center text-xs font-bold bg-white ${
                    i === active ? "text-[#0202ff]" : "text-gray-400"
                  }`}
                  style={i === active ? { borderColor: "#0202ff" } : { borderColor: "#D1D5DB" }}
                >
                  {node.day}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{node.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Black bottom bar */}
      <div className="bg-[#0a0a0a] text-white text-center py-2.5 text-xs font-semibold tracking-wide">
        ↓ DOWNLOADABLE BLUEPRINT INCLUDED
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-5 py-3 bg-[#F9F7F5]">
        <span className="flex-shrink-0 w-3 h-3 rounded-sm mt-0.5" style={{ backgroundColor: "#0202ff" }} />
        <p className="text-[11px] text-gray-500 leading-snug">
          Built from your answers. Ready to print, share, and review with your leadership team.
        </p>
      </div>
    </div>
  );
}