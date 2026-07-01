import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getIndustryConfig } from "./industryConfig";

const panels = [
  {
    id: 1,
    title: "Spot risk early",
    body: "Assess leaders earlier and surface where support may be needed before problems escalate.",
    visual: () => (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Assessment Insight Panel</div>
        {[
          { label: "Situational Intelligence", score: 72, tag: "Progressing", tagColor: "#10b981", tagBg: "#f0fdf4" },
          { label: "Performance Management", score: 44, tag: "Support Needed", tagColor: "#ef4444", tagBg: "#fef2f2" },
          { label: "Communication", score: 81, tag: "Strong", tagColor: "#10b981", tagBg: "#f0fdf4" },
          { label: "Resource Management", score: 55, tag: "Watch", tagColor: "#f59e0b", tagBg: "#fffbeb" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 mb-1.5">{item.label}</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${item.score}%`,
                    backgroundColor: item.score >= 70 ? "#10b981" : item.score >= 55 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-gray-500">{item.score}%</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: item.tagColor, backgroundColor: item.tagBg }}
              >
                {item.tag}
              </span>
            </div>
          </div>
        ))}
        <div className="mt-4 p-3 rounded-lg border border-red-100 bg-red-50 flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full bg-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-red-700">Risk signal detected</div>
            <div className="text-[11px] text-red-500 mt-0.5">Performance Management below threshold — recommend early intervention</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Turn insight into action",
    body: "Translate assessment signals into one clear goal and one practical next step for the manager.",
    visual: () => (
      <div className="space-y-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Guided Action Panel</div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Your focus this week</div>
          <div
            className="rounded-lg p-3 mb-3 border"
            style={{ backgroundColor: "#eef0ff", borderColor: "#c7ccff" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#0202ff" }}>
              Goal
            </div>
            <div className="text-sm font-semibold text-gray-900">
              Improve clarity in team performance conversations
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Next step</div>
            <div className="text-sm text-gray-700">
              Schedule a 15-minute check-in with one direct report this week and practice naming a specific behavior before giving feedback.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Linked to assessment signal: Performance Management (44%)
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Reinforce in the workflow",
    body: "Deliver support through the tools managers already use so development stays connected to real work.",
    visual: () => (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">In-Workflow Support</div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#0202ff] flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">CL</span>
            </div>
            <span className="text-xs font-semibold text-gray-700">Curiosity Led</span>
            <span className="text-[10px] text-gray-400 ml-auto">Today, 9:02 AM</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-500 font-medium">Hi Sarah — a quick nudge for this week:</div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-700 leading-relaxed">
              Your goal this week is to practice naming specific behaviors in feedback. You have a team meeting Thursday — that's a good moment to try it.
            </div>
            <div className="flex gap-2">
              <div
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: "#0202ff" }}
              >
                Mark complete
              </div>
              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600">
                Reschedule
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Delivered in the tools your managers already use
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Use your model or ours",
    body: "Map Curiosity Led to your organization's existing competency model, including frameworks such as Korn Ferry, or use our built-in library of leadership competencies.",
    visual: () => (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Competency Framework</div>
        <div className="flex gap-2 mb-3">
          {["Your Model", "Built-in Library"].map((label, i) => (
            <div key={label} className="flex-1 rounded-lg p-2.5 text-center border text-[10px] font-semibold" style={{ backgroundColor: i === 0 ? "#eff0ff" : "#f9fafb", borderColor: i === 0 ? "#0202ff55" : "#e5e7eb", color: i === 0 ? "#0202ff" : "#6b7280" }}>
              {label}
            </div>
          ))}
        </div>
        {[
          { label: "Korn Ferry: Strategic Agility", mapped: true },
          { label: "Korn Ferry: Inspiring Others", mapped: true },
          { label: "Decision Making", mapped: true },
          { label: "Stakeholder Management", mapped: false },
        ].map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.mapped ? "#10b981" : "#d1d5db" }} />
            <span className="text-xs text-gray-700 flex-1">{c.label}</span>
            <span className="text-[10px] font-medium" style={{ color: c.mapped ? "#10b981" : "#9ca3af" }}>{c.mapped ? "Mapped" : "Pending"}</span>
          </div>
        ))}
        <div className="mt-1 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] text-blue-700">
          3 of 4 competencies mapped to your framework
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: "Give leaders visibility",
    body: "Show readiness, bench strength, and where attention or investment should go next.",
    visual: () => (
      <div className="space-y-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Leadership Intelligence Hub</div>
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
          <div className="text-sm font-bold text-gray-900 mb-3">Org Readiness Summary</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Bench Strength", value: "62%", sub: "Ready-now successors", color: "#10b981" },
              { label: "Risk Coverage", value: "3", sub: "Roles needing attention", color: "#ef4444" },
              { label: "Active Interventions", value: "8", sub: "In progress", color: "#0202ff" },
              { label: "Avg. Readiness", value: "71%", sub: "Across all cohorts", color: "#10b981" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</div>
                <div className="text-[10px] text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 flex items-start gap-2">
            <div className="w-1 h-full min-h-[24px] rounded-full flex-shrink-0" style={{ backgroundColor: "#0202ff" }} />
            <div>
              <div className="text-[10px] font-bold text-gray-700">Recommended focus</div>
              <div className="text-[11px] text-gray-500 mt-0.5">3 managers in Cohort A require intervention before Q3 succession review.</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function LandingExplainer({ industry }) {
  const [active, setActive] = useState(0);
  const cfg = industry ? getIndustryConfig(industry) : null;
  const ex = cfg?.explainer;

  const ActiveVisual = panels[active].visual;

  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="mb-14 grid lg:grid-cols-2 gap-10 items-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <div>
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">{ex?.label || "How it works"}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4 leading-tight max-w-2xl">
            {ex?.heading || "How Curiosity Led turns early signals into timely support."}
          </h2>
          <p className="text-gray-500 max-w-xl leading-relaxed">
            {ex?.intro || "One system helps you spot risk, guide action, reinforce behavior in the flow of work, and give leadership a clearer view of progress."}
          </p>
          </div>
          {/* Manager engaged with platform image */}
          <div className="rounded-2xl overflow-hidden shadow-sm hidden lg:block">
            <img
              src={ex?.image || "/White and Blue How to Start a Saas Product Webinar Instagram Post_edited.jpg"}
              alt="Manager engaging with the platform"
              className="w-full h-64 object-cover object-top"
            />
          </div>
        </motion.div>

        {/* Desktop: side-by-side tabs */}
        <motion.div
          className="hidden md:grid md:grid-cols-5 gap-8 items-start"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Left: tab list */}
          <div className="col-span-2 space-y-1">
            {panels.map((panel, i) => (
              <button
                key={panel.id}
                onClick={() => setActive(i)}
                className="w-full text-left px-4 py-4 rounded-xl transition-all duration-200 flex items-start gap-3 group"
                style={{
                  backgroundColor: active === i ? "#ffffff" : "transparent",
                  border: active === i ? "1px solid #e5e7eb" : "1px solid transparent",
                  boxShadow: active === i ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <div
                  className="w-0.5 rounded-full flex-shrink-0 mt-1 transition-all duration-200"
                  style={{
                    height: "18px",
                    backgroundColor: active === i ? "#0202ff" : "transparent",
                  }}
                />
                <div>
                  <div
                    className="text-sm font-semibold transition-colors duration-200"
                    style={{ color: active === i ? "#0202ff" : "#374151" }}
                  >
                    {panel.title}
                  </div>
                  {active === i && (
                    <p className="text-xs text-gray-500 leading-relaxed mt-1.5">{panel.body}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right: visual panel */}
          <div className="col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm min-h-[340px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <ActiveVisual />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Mobile: accordion */}
        <motion.div
          className="md:hidden space-y-2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
        >
          {panels.map((panel, i) => (
            <div
              key={panel.id}
              className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: active === i ? "#c7ccff" : "#e5e7eb" }}
            >
              <button
                onClick={() => setActive(active === i ? -1 : i)}
                className="w-full text-left px-4 py-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: active === i ? "#0202ff" : "#e5e7eb" }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: active === i ? "#0202ff" : "#374151" }}
                  >
                    {panel.title}
                  </span>
                </div>
                <span className="text-gray-400 text-lg leading-none">{active === i ? "−" : "+"}</span>
              </button>
              <AnimatePresence>
                {active === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 space-y-4">
                      <p className="text-sm text-gray-500 leading-relaxed">{panel.body}</p>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <panel.visual />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}