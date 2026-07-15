import React from "react";
import { motion } from "framer-motion";
import { Activity, Radar, TrendingUp, ShieldCheck } from "lucide-react";

/**
 * OfferUnifiedHub — Option A "Single Unified View"
 * One high-fidelity composite Leadership Intelligence Hub mockup that
 * subtly spotlights the three outcomes (Manager, HR/Exec, Executive)
 * so each reader can see their own outcome at a glance.
 */
export default function OfferUnifiedHub() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          </div>
          <span className="text-xs font-medium text-gray-400">
            Leadership Intelligence Hub
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
        </div>

        {/* Unified grid — three lenses in one view */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-gray-50/60 to-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* MANAGER lens — daily clarity */}
            <Panel
              accent="#0202ff"
              icon={<Activity className="w-3.5 h-3.5" />}
              label="Manager · Today"
              className="lg:col-span-7"
            >
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { l: "Energy", v: "3.8", t: "+0.4" },
                  { l: "Focus", v: "4.1", t: "+0.6" },
                  { l: "Load", v: "2.9", t: "−0.3" },
                ].map((k) => (
                  <div key={k.l} className="rounded-md border border-gray-100 bg-white p-2">
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
                      {k.l}
                    </p>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="text-sm font-bold text-gray-800">{k.v}</span>
                      <span
                        className={`text-[9px] font-medium ${
                          k.t.startsWith("−") ? "text-rose-500" : "text-emerald-500"
                        }`}
                      >
                        {k.t}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <svg viewBox="0 0 280 56" className="w-full h-12" preserveAspectRatio="none">
                <polyline
                  points="0,42 40,38 80,32 120,36 150,24 185,20 220,14 280,8"
                  fill="none"
                  stroke="#0202ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Panel>

            {/* HR lens — readiness radar */}
            <Panel
              accent="#7c3aed"
              icon={<Radar className="w-3.5 h-3.5" />}
              label="HR · Readiness"
              className="lg:col-span-5"
            >
              <div className="flex items-center justify-center py-1">
                <svg viewBox="0 0 120 120" className="w-24 h-24">
                  {[20, 40, 60, 80].map((r) => (
                    <circle
                      key={r}
                      cx="60"
                      cy="60"
                      r={r}
                      fill="none"
                      stroke="#7c3aed"
                      strokeOpacity="0.12"
                      strokeWidth="1"
                    />
                  ))}
                  <polygon
                    points="60,18 102,52 86,98 30,92 14,48"
                    fill="#7c3aed"
                    fillOpacity="0.14"
                    stroke="#7c3aed"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {[
                    [60, 18],
                    [102, 52],
                    [86, 98],
                    [30, 92],
                    [14, 48],
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="2.5" fill="#7c3aed" />
                  ))}
                </svg>
              </div>
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="text-gray-400">At risk</span>
                <span className="font-semibold text-violet-600">3 · Ready 7</span>
              </div>
            </Panel>

            {/* EXECUTIVE lens — defensible ROI / risk */}
            <Panel
              accent="#059669"
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="Executive · Risk & ROI"
              className="lg:col-span-12"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: "Risk score", v: "12", sub: "Low", tone: "emerald" },
                  { l: "Readiness", v: "74%", sub: "+11 pts", tone: "emerald" },
                  { l: "Stalled goals", v: "2", sub: "−5", tone: "emerald" },
                  { l: "1:1 cadence", v: "92%", sub: "On track", tone: "emerald" },
                ].map((m) => (
                  <div
                    key={m.l}
                    className="rounded-md border bg-white p-3"
                    style={{ borderColor: `${m.tone === "emerald" ? "#059669" : "#94a3b8"}22` }}
                  >
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                      {m.l}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-gray-800">{m.v}</span>
                      <span className="text-[10px] font-medium text-emerald-600">
                        {m.sub}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] text-gray-500 font-medium">
                  Cohort trend: leadership capacity recovering — defensible at next QBR.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </motion.div>

      {/* Caption row — names each outcome so each reader finds theirs */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-500">
        <Legend swatch="#0202ff" text="Managers → daily clarity" />
        <Legend swatch="#7c3aed" text="HR → risk & readiness" />
        <Legend swatch="#059669" text="Executives → defensible ROI" />
      </div>
    </div>
  );
}

function Panel({ accent, icon, label, className = "", children }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 ${className}`}
      style={{ borderColor: `${accent}22` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-white"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </span>
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: accent }}
        >
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

function Legend({ swatch, text }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: swatch }} />
      {text}
    </span>
  );
}