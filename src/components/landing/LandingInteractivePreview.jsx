import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, ChevronRight } from "lucide-react";

const IndividualView = () => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">SM</div>
      <div>
        <div className="text-sm font-bold text-gray-900">Sarah M.</div>
        <div className="text-xs text-gray-500">Nurse Manager · Level 2 Leader</div>
      </div>
      <div className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Watch</div>
    </div>

    {/* Competency scores */}
    <div className="space-y-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Competency Snapshot</div>
      {[
        { label: "Situational Intelligence", score: 72, color: "#10b981" },
        { label: "Performance Management", score: 44, color: "#ef4444" },
        { label: "Communication", score: 81, color: "#10b981" },
        { label: "Resource Management", score: 58, color: "#f59e0b" },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="text-xs text-gray-600 w-40 flex-shrink-0">{item.label}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <motion.div
              className="h-1.5 rounded-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${item.score}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="text-xs font-bold text-gray-500 w-8 text-right">{item.score}%</div>
        </div>
      ))}
    </div>

    {/* Active goal */}
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1.5">Active Development Goal</div>
      <div className="text-xs font-semibold text-gray-800 mb-1">Improve feedback clarity in team huddles</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-blue-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: "45%" }} />
        </div>
        <span className="text-[10px] text-blue-600 font-medium">45%</span>
      </div>
    </div>

    {/* Risk signal */}
    <div className="rounded-xl border border-red-100 bg-red-50 p-3 flex items-start gap-2.5">
      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-[10px] font-bold text-red-700 mb-0.5">Risk Signal</div>
        <div className="text-[11px] text-red-600">Performance Management below threshold — early intervention recommended before Q3 review.</div>
      </div>
    </div>

    {/* Next step */}
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Recommended Next Step</div>
      <div className="text-xs text-gray-700 leading-relaxed">Schedule a coaching session focused on structured feedback delivery before next team meeting.</div>
      <button className="mt-2 text-[10px] font-semibold flex items-center gap-1" style={{ color: "#0202ff" }}>
        Assign coaching <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const ExecView = () => (
  <div className="space-y-4">
    {/* Summary cards */}
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Total Leaders", value: "48", sub: "Across 6 cohorts", color: "#0202ff" },
        { label: "At Risk", value: "7", sub: "Need intervention", color: "#ef4444" },
        { label: "On Track", value: "34", sub: "Progressing well", color: "#10b981" },
        { label: "Bench Ready", value: "62%", sub: "Succession strength", color: "#f59e0b" },
      ].map((s) => (
        <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 p-2.5 text-center">
          <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
          <div className="text-[10px] font-semibold text-gray-700 leading-tight">{s.label}</div>
          <div className="text-[9px] text-gray-400 mt-0.5">{s.sub}</div>
        </div>
      ))}
    </div>

    {/* Cohort breakdown */}
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cohort Risk Overview</div>
      <div className="space-y-1.5">
        {[
          { name: "Cohort A — Nurse Managers", total: 12, at_risk: 3, on_track: 7, watch: 2 },
          { name: "Cohort B — Dept. Directors", total: 10, at_risk: 2, on_track: 6, watch: 2 },
          { name: "Cohort C — New Hires Q1", total: 14, at_risk: 1, on_track: 11, watch: 2 },
          { name: "Cohort D — Hi-Po Pipeline", total: 12, at_risk: 1, on_track: 10, watch: 1 },
        ].map((cohort) => (
          <div key={cohort.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-100">
            <div className="text-xs text-gray-700 flex-1 font-medium">{cohort.name}</div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">{cohort.at_risk} risk</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">{cohort.watch} watch</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">{cohort.on_track} ✓</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Succession readiness */}
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Succession Readiness</div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { role: "Chief Nursing Officer", ready: 2, near: 3, color: "#10b981" },
          { role: "VP of Patient Services", ready: 1, near: 2, color: "#f59e0b" },
          { role: "Dir. of Quality", ready: 0, near: 2, color: "#ef4444" },
        ].map((s) => (
          <div key={s.role} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
            <div className="text-[9px] font-bold text-gray-500 leading-tight mb-2">{s.role}</div>
            <div className="flex items-end gap-1">
              <div className="text-base font-bold" style={{ color: s.color }}>{s.ready}</div>
              <div className="text-[9px] text-gray-400 mb-0.5">ready-now</div>
            </div>
            <div className="text-[9px] text-gray-400">{s.near} developing</div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
              <div className="h-1 rounded-full" style={{ width: `${(s.ready / (s.ready + s.near)) * 100}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recommended focus */}
    <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-start gap-2.5">
      <div className="w-1 min-h-[36px] rounded-full flex-shrink-0" style={{ backgroundColor: "#0202ff" }} />
      <div>
        <div className="text-[10px] font-bold text-gray-700 mb-0.5">Executive Recommendation</div>
        <div className="text-[11px] text-gray-500 leading-relaxed">3 managers in Cohort A require intervention before Q3 succession review. Dir. of Quality succession gap is critical — 0 ready-now candidates.</div>
      </div>
    </div>
  </div>
);

export default function LandingInteractivePreview() {
  const [view, setView] = useState("individual");

  return (
    <section className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">For Every Level</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4 leading-tight">
            One platform. Every perspective.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
            Managers get a clear development path. Executives get the organizational visibility to act before problems escalate.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setView("individual")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: view === "individual" ? "#ffffff" : "transparent",
                color: view === "individual" ? "#0202ff" : "#6b7280",
                boxShadow: view === "individual" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <User className="w-4 h-4" />
              Individual Leader View
            </button>
            <button
              onClick={() => setView("exec")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: view === "exec" ? "#ffffff" : "transparent",
                color: view === "exec" ? "#0202ff" : "#6b7280",
                boxShadow: view === "exec" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Users className="w-4 h-4" />
              Executive Org View
            </button>
          </div>
        </motion.div>

        {/* Preview window */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {/* Browser chrome */}
          <div className="rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center border border-gray-200">
                app.curiosityled.com / {view === "individual" ? "my-leadership" : "insights?tab=org"}
              </div>
              <div className="w-5 h-5 rounded bg-[#0202ff] flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">CL</span>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white p-6 min-h-[480px]">
              {/* Subheader */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-base font-bold text-gray-900">
                    {view === "individual" ? "My Leadership Dashboard" : "Leadership Intelligence Hub"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {view === "individual" ? "Your development journey and active goals" : "Organization-wide visibility and succession data"}
                  </div>
                </div>
                <div
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: view === "individual" ? "#eef0ff" : "#f0fdf4",
                    color: view === "individual" ? "#0202ff" : "#10b981",
                  }}
                >
                  {view === "individual" ? "Leader" : "Executive"}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: view === "exec" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: view === "exec" ? -20 : 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {view === "individual" ? <IndividualView /> : <ExecView />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Caption */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              At-risk leaders surfaced early
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Succession gaps identified
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0202ff" }} />
              Action tied to real behavior
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}