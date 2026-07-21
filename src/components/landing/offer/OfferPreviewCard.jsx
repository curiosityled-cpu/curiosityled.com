import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { Download, Check } from "lucide-react";

const SCORE = 72;

const RADAR_DATA = [
  { area: "Support", value: 68 },
  { area: "Intervention", value: 55 },
  { area: "Coordination", value: 72 },
  { area: "Follow-Through", value: 61 },
  { area: "Reporting", value: 80 },
];

const TABS = ["SCORE", "GROWTH BLOCK", "90-DAY PLAN"];

export default function OfferPreviewCard() {
  const [active, setActive] = useState("SCORE");

  return (
    <div className="w-full bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      {/* Card header */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ backgroundColor: "#0202ff" }}
          >
            CL
          </span>
          <span className="text-[11px] font-semibold tracking-[0.15em]">LEADERSHIP REBOOT BRIEF</span>
        </div>
        <span className="text-[10px] tracking-[0.15em] text-gray-400">PDF REPORT</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className="py-3 text-[11px] font-semibold tracking-[0.1em] transition-colors relative"
            style={{ color: active === tab ? "#0202ff" : "#9ca3af" }}
          >
            {tab}
            {active === tab && (
              <span
                className="absolute left-0 right-0 -bottom-px h-0.5"
                style={{ backgroundColor: "#0202ff" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-5">
        {active === "SCORE" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-start justify-center gap-6 w-full">
              {/* Circular score */}
              <ScoreRing value={SCORE} />
              {/* Radar chart */}
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={RADAR_DATA} outerRadius="75%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="area" tick={{ fontSize: 8, fill: "#9ca3af" }} />
                    <Radar
                      dataKey="value"
                      stroke="#0202ff"
                      fill="#0202ff"
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 text-center w-full">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-gray-500 mb-1">
                01 / YOUR SCORE
              </p>
              <p className="text-sm font-semibold text-[#0a0a0a]">See All Five Areas in One View.</p>
              <p className="text-xs text-gray-500 mt-1">
                See what is working and which part of leadership support needs attention first.
              </p>
            </div>
          </motion.div>
        )}

        {active === "GROWTH BLOCK" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <p className="text-[11px] font-semibold tracking-[0.1em] text-gray-500 mb-2">
              02 / GROWTH BLOCK
            </p>
            <p className="text-sm font-semibold text-[#0a0a0a] mb-1">Your First Area to Fix</p>
            <p className="text-xs text-gray-500 mb-5 max-w-xs">
              Get a clear answer about what may be slowing leadership support right now.
            </p>
            <ScaleBar />
          </motion.div>
        )}

        {active === "90-DAY PLAN" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <p className="text-[11px] font-semibold tracking-[0.1em] text-gray-500 mb-2">
              03 / 90-DAY PLAN
            </p>
            <p className="text-sm font-semibold text-[#0a0a0a] mb-1">Your 90-Day Reboot Roadmap</p>
            <p className="text-xs text-gray-500 mb-4 max-w-xs">
              A tailored starting plan you can use internally, with or without Curiosity Led.
            </p>
            <div className="w-full space-y-2 text-left">
              {[
                "Diagnose where support is breaking down",
                "Identify your top pressure points",
                "90-day roadmap with clear next moves",
              ].map((step) => (
                <div key={step} className="flex items-start gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
                  <span className="text-xs text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Download bar */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-center gap-2">
        <Download className="w-4 h-4" style={{ color: "#0202ff" }} />
        <span className="text-[11px] font-semibold tracking-[0.15em]">DOWNLOADABLE PDF INCLUDED</span>
      </div>

      {/* Badge */}
      <div className="px-5 py-3 flex items-start gap-2">
        <span
          className="flex-shrink-0 w-3 h-3 rounded-sm mt-0.5"
          style={{ backgroundColor: "#0202ff" }}
        />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Built from your answers. Ready to print, share, and review with your team.
        </p>
      </div>
    </div>
  );
}

function ScoreRing({ value }) {
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#0202ff"
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#0a0a0a] leading-none">{value}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function ScaleBar() {
  return (
    <div className="w-full max-w-xs">
      <div className="relative h-px bg-gray-200 my-6">
        <div className="absolute inset-x-0 h-px" style={{ backgroundColor: "#0202ff", opacity: 0.5 }} />
        {[
          { label: "30", sub: "Review", pos: "0%" },
          { label: "60", sub: "Fix", pos: "50%", active: true },
          { label: "90", sub: "Grow", pos: "100%" },
        ].map((m) => (
          <div
            key={m.label}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: m.pos, top: "-10px" }}
          >
            <span
              className="w-3 h-3 rounded-full border-2 bg-white"
              style={{ borderColor: m.active ? "#0202ff" : "#d1d5db" }}
            />
            <span
              className="text-xs font-bold mt-2"
              style={{ color: m.active ? "#0202ff" : "#9ca3af" }}
            >
              {m.label}
            </span>
            <span className="text-[10px] text-gray-400">{m.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}