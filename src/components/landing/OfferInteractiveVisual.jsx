import React from "react";
import { motion } from "framer-motion";
import { Activity, Radar, TrendingUp } from "lucide-react";

/**
 * OfferInteractiveVisual — Option B "Interactive Transition"
 * A clean Leadership Intelligence Hub mockup (the means) with three
 * outcome highlights that pull into focus on scroll (Manager, HR/Exec, Executive).
 */
export default function OfferInteractiveVisual() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Base dashboard mockup (the means) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <span className="ml-3 text-xs font-medium text-gray-400">
            Leadership Intelligence Hub
          </span>
        </div>

        {/* Dashboard body */}
        <div className="p-5 sm:p-6 grid grid-cols-12 gap-4 bg-gradient-to-br from-gray-50/60 to-white">
          {/* Sidebar */}
          <div className="col-span-3 hidden sm:flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full ${i === 0 ? "bg-[#0202ff]/30" : "bg-gray-100"}`}
                style={{ width: `${80 - i * 12}%` }}
              />
            ))}
          </div>

          {/* Main panel */}
          <div className="col-span-12 sm:col-span-9 flex flex-col gap-4">
            {/* KPI row (the means — clean UI) */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Energy", val: "3.8", trend: "+0.4" },
                { label: "Focus", val: "4.1", trend: "+0.6" },
                { label: "Load", val: "2.9", trend: "−0.3" },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-lg border border-gray-100 bg-white p-3"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    {k.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-bold text-gray-800">{k.val}</span>
                    <span
                      className={`text-[10px] font-medium ${
                        k.trend.startsWith("−")
                          ? "text-rose-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {k.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Trend chart mockup */}
            <div className="rounded-lg border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-2 w-24 rounded-full bg-gray-100" />
                <Activity className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <svg viewBox="0 0 300 70" className="w-full h-16" preserveAspectRatio="none">
                <polyline
                  points="0,52 40,48 80,40 120,44 160,30 200,26 240,18 300,12"
                  fill="none"
                  stroke="#0202ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="0,52 40,48 80,40 120,44 160,30 200,26 240,18 300,12"
                  fill="none"
                  stroke="#0202ff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.15"
                />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Outcome highlights — pull into focus on scroll */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OutcomeCard
          delay={0.1}
          icon={<Activity className="w-4 h-4" />}
          accent="#0202ff"
          label="For Managers"
          outcome="Daily clarity on what matters most"
        />
        <OutcomeCard
          delay={0.25}
          icon={<Radar className="w-4 h-4" />}
          accent="#7c3aed"
          label="For HR / Talent"
          outcome="See risk & readiness across the cohort"
        />
        <OutcomeCard
          delay={0.4}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="#059669"
          label="For Executives"
          outcome="Defensible ROI in one live Hub"
        />
      </div>
    </div>
  );
}

function OutcomeCard({ delay, icon, accent, label, outcome }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay }}
      className="rounded-xl border bg-white p-4 shadow-md flex items-start gap-3"
      style={{ borderColor: `${accent}22` }}
    >
      <span
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: accent }}
        >
          {label}
        </p>
        <p className="text-sm font-medium text-gray-700 leading-snug">{outcome}</p>
      </div>
    </motion.div>
  );
}