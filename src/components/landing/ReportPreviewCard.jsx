import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const RADAR_DATA = [
  { area: "Support", value: 65 },
  { area: "Readiness", value: 72 },
  { area: "Follow-through", value: 58 },
  { area: "Coordination", value: 70 },
  { area: "Insight", value: 80 },
];

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

const RULER = [
  { day: "30", label: "Assess" },
  { day: "60", label: "Support" },
  { day: "90", label: "Develop" },
];

function ScoreGauge({ value }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#E5E5E5" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#0202ff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-[#0a0a0a] leading-none">{value}</div>
        <div className="text-xs text-gray-400 mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

const SCORE_PANEL = (
  <div className="flex items-center gap-5">
    <div className="flex flex-col items-center">
      <ScoreGauge value={68} />
      <p className="text-[10px] font-semibold text-gray-500 mt-2 tracking-wide uppercase">Leadership Readiness Score</p>
    </div>
    <div className="flex-1 h-32">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={RADAR_DATA} outerRadius="70%">
          <PolarGrid stroke="#E5E5E5" />
          <PolarAngleAxis dataKey="area" tick={{ fontSize: 9, fill: "#666" }} />
          <Radar dataKey="value" stroke="#0202ff" fill="#0202ff" fillOpacity={0.12} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const GROWTH_PANEL = (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold tracking-wide text-[#0202ff]">#1 GROWTH BLOCK</span>
      <span className="text-[10px] text-gray-400">LOWEST SCORE</span>
    </div>
    {[
      { label: "Manager Follow-through", score: 58, flagged: true },
      { label: "Support Coordination", score: 70, flagged: false },
      { label: "Insight to Action", score: 80, flagged: false },
    ].map((row) => (
      <div key={row.label}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs ${row.flagged ? "font-bold text-[#0a0a0a]" : "text-gray-500"}`}>{row.label}</span>
          <span className={`text-xs font-semibold ${row.flagged ? "text-[#0202ff]" : "text-gray-400"}`}>{row.score}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${row.score}%`, backgroundColor: row.flagged ? "#0202ff" : "#CBD5E1" }}
          />
        </div>
      </div>
    ))}
    <p className="text-[10px] text-gray-400 pt-1">Scores across five leadership support areas.</p>
  </div>
);

const BLUEPRINT_PANEL = (
  <div className="space-y-2">
    {[
      { day: "30", label: "Assess", action: "Map manager readiness gaps across your top teams." },
      { day: "60", label: "Support", action: "Launch weekly check-ins and earlier intervention points." },
      { day: "90", label: "Develop", action: "Embed follow-through rituals and review with leadership." },
    ].map((phase) => (
      <div key={phase.day} className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
        <div
          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: "#0202ff" }}
        >
          {phase.day}
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-400 uppercase">{phase.label}</p>
          <p className="text-xs text-[#0a0a0a] leading-snug">{phase.action}</p>
        </div>
      </div>
    ))}
  </div>
);

const PANELS = [SCORE_PANEL, GROWTH_PANEL, BLUEPRINT_PANEL];

export default function ReportPreviewCard() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % STATES.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const state = STATES[active];

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

      {/* Rotating visual panel */}
      <div className="px-5 py-5 min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {PANELS[active]}
          </motion.div>
        </AnimatePresence>
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