import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOCKUP_CONTENT = [
  // Step 01 — Assess early
  <div key="01" className="space-y-3">
    <div className="text-xs text-gray-500 mb-2">Competency scores — Sarah M.</div>
    {[
      { label: "Decision Making", score: 42, color: "#ef4444" },
      { label: "Communication", score: 67, color: "#f59e0b" },
      { label: "Resource Mgmt", score: 55, color: "#f59e0b" },
      { label: "Situational Intel", score: 38, color: "#ef4444" },
    ].map((c) => (
      <div key={c.label}>
        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
          <span>{c.label}</span>
          <span style={{ color: c.color }}>{c.score}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <motion.div
            className="h-1.5 rounded-full"
            style={{ backgroundColor: c.color }}
            initial={{ width: 0 }}
            animate={{ width: `${c.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          />
        </div>
      </div>
    ))}
    <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-100 text-[10px] text-red-700">
      ⚠ 2 competencies below threshold — coaching recommended
    </div>
  </div>,

  // Step 02 — Focus the next action
  <div key="02" className="space-y-2">
    <div className="text-xs text-gray-500 mb-2">Action plan — Sarah M.</div>
    {[
      { action: "Complete Decision-Making module", type: "Learning", due: "This week", color: "#0202ff", bg: "#eff0ff" },
      { action: "Schedule 1:1 coaching session", type: "Coaching", due: "By Friday", color: "#10b981", bg: "#f0fdf4" },
      { action: "Set 30-day development goal", type: "Goal", due: "Today", color: "#f59e0b", bg: "#fffbeb" },
    ].map((a, i) => (
      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-white">
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ color: a.color, backgroundColor: a.bg }}>{a.type}</span>
        <span className="text-[10px] text-gray-700 flex-1">{a.action}</span>
        <span className="text-[9px] text-gray-400">{a.due}</span>
      </div>
    ))}
  </div>,

  // Step 03 — Reinforce in the workflow
  <div key="03" className="space-y-2">
    <div className="text-xs text-gray-500 mb-2">Active touchpoints — this week</div>
    {[
      { icon: "📬", label: "Slack nudge sent", sub: "Decision-making tip", time: "2h ago", done: true },
      { icon: "📚", label: "Module unlocked", sub: "Conflict Resolution 101", time: "Yesterday", done: true },
      { icon: "🗓", label: "Coaching session", sub: "Confirmed for Thursday 2pm", time: "Upcoming", done: false },
      { icon: "🎯", label: "Goal check-in", sub: "30-day milestone due", time: "In 3 days", done: false },
    ].map((n, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
        <span className="text-sm">{n.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-gray-800">{n.label}</div>
          <div className="text-[9px] text-gray-400 truncate">{n.sub}</div>
        </div>
        <span className={`text-[9px] font-medium ${n.done ? "text-green-600" : "text-blue-500"}`}>{n.time}</span>
      </div>
    ))}
  </div>,

  // Step 04 — Use your model or ours
  <div key="04" className="space-y-3">
    <div className="text-xs text-gray-500 mb-2">Competency framework — active model</div>
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
      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.mapped ? "#10b981" : "#d1d5db" }} />
        <span className="text-[10px] text-gray-700 flex-1">{c.label}</span>
        <span className="text-[9px] font-medium" style={{ color: c.mapped ? "#10b981" : "#9ca3af" }}>{c.mapped ? "Mapped" : "Pending"}</span>
      </div>
    ))}
    <div className="mt-1 p-2 rounded-lg bg-blue-50 border border-blue-100 text-[10px] text-blue-700">
      3 of 4 competencies mapped to your framework
    </div>
  </div>,
];

const steps = [
  { num: "01", title: "Assess early", desc: "Establish a baseline for newly promoted or newly hired leaders and surface where support may be needed before issues escalate." },
  { num: "02", title: "Focus the next action", desc: "Turn insight into one clear goal and one practical next step tied to what the manager is actually handling in their team right now." },
  { num: "03", title: "Reinforce in the workflow", desc: "Deliver nudges, learning, and coaching loops in the tools managers already use, so support stays connected to real situations." },
  { num: "04", title: "Use your model or ours", desc: "Map Curiosity Led to your organization's existing competency model, including frameworks such as Korn Ferry, or use our built-in library of leadership competencies." },
];

const MOCKUP_HEADINGS = ["Baseline Assessment", "Recommended Next Steps", "Workflow Nudges", "Competency Framework"];

export default function LandingHowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">How it works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4">
            One system from assessment to executive view.
          </h2>
        </motion.div>



        {/* Steps + App mockup */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Steps list */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <motion.div
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className="flex gap-5 p-4 rounded-xl cursor-pointer border transition-colors duration-200"
                  style={{
                    backgroundColor: isActive ? "#eff0ff" : "transparent",
                    borderColor: isActive ? "#0202ff55" : "transparent",
                  }}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-colors duration-200"
                    style={{
                      backgroundColor: isActive ? "#0202ff" : "#e5e7eb",
                      color: isActive ? "#fff" : "#6b7280",
                    }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <div className="font-bold text-[#0a0a0a] mb-1">{step.title}</div>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* App UI mockup */}
          <motion.div
            className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white sticky top-24"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Chrome bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-gray-400 ml-2">Leadership Intelligence Hub</span>
            </div>

            <div className="p-5 bg-white min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#0202ff" }}>
                      {steps[activeStep].num}
                    </span>
                    <div className="text-sm font-bold text-gray-900">{MOCKUP_HEADINGS[activeStep]}</div>
                  </div>
                  {MOCKUP_CONTENT[activeStep]}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}