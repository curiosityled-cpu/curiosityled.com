import React from "react";
import { motion } from "framer-motion";

const stepsContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 }
  }
};

const stepItemVariants = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 }
  }
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
};

const steps = [
  {
    num: "01",
    title: "Assess early",
    desc: "Establish a baseline for newly promoted or newly hired leaders and surface where support may be needed before issues escalate.",
  },
  {
    num: "02",
    title: "Focus the next action",
    desc: "Turn insight into one clear goal and one practical next step tied to what the manager is actually handling in their team right now.",
  },
  {
    num: "03",
    title: "Reinforce in the workflow",
    desc: "Deliver nudges, learning, and coaching loops in the tools managers already use, so support stays connected to real situations instead of becoming another disconnected program.",
  },
  {
    num: "04",
    title: "Give leadership one view",
    desc: "Bring assessments, actions, progress, and key lifecycle metrics from across HR into a single Leadership Intelligence Hub so HR and executive sponsors can see who is at risk, who is progressing, and where to focus intervention or investment next.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">How it works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4">
            One system from assessment to executive view.
          </h2>
        </motion.div>

        {/* Steps + App screenshot */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Steps */}
          <motion.div
            className="space-y-6"
            variants={stepsContainerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            {steps.map((step, i) => (
              <motion.div key={i} variants={stepItemVariants} className="flex gap-5">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  {step.num}
                </div>
                <div>
                  <div className="font-bold text-[#0a0a0a] mb-1">{step.title}</div>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* App UI: Leadership Intelligence Hub mockup */}
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white"
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

            <div className="p-5 bg-white">
              <div className="text-sm font-bold text-gray-900 mb-4">Org Leadership Overview</div>

              {/* Risk grid */}
              <motion.div
                className="grid grid-cols-3 gap-3 mb-4"
                variants={gridContainerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
              >
                {[
                  { label: "At Risk", count: "3", color: "#ef4444", bg: "#fef2f2" },
                  { label: "Progressing", count: "18", color: "#10b981", bg: "#f0fdf4" },
                  { label: "On Watch", count: "7", color: "#f59e0b", bg: "#fffbeb" },
                ].map((s) => (
                  <motion.div
                    key={s.label}
                    variants={gridItemVariants}
                    className="rounded-xl p-3 text-center border"
                    style={{ backgroundColor: s.bg, borderColor: s.color + "33" }}
                  >
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Manager list */}
              <motion.div
                className="space-y-2"
                variants={gridContainerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
              >
                {[
                  { name: "Sarah M.", role: "Charge Nurse → Manager", risk: "High", prog: 35 },
                  { name: "Daniel K.", role: "Clinical Lead → Director", risk: "Medium", prog: 62 },
                  { name: "Priya R.", role: "Operations → VP", risk: "Low", prog: 84 },
                ].map((m, i) => (
                  <motion.div
                    key={i}
                    variants={gridItemVariants}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: "#0202ff" }}
                    >
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{m.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{m.role}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${m.prog}%`,
                            backgroundColor: m.prog > 70 ? "#10b981" : m.prog > 50 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: m.risk === "High" ? "#ef4444" : m.risk === "Medium" ? "#f59e0b" : "#10b981",
                          backgroundColor:
                            m.risk === "High" ? "#fef2f2" : m.risk === "Medium" ? "#fffbeb" : "#f0fdf4",
                        }}
                      >
                        {m.risk}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}