import React from "react";
import { motion } from "framer-motion";
import { Compass, MessageSquareText, ShieldCheck } from "lucide-react";

const steps = [
  {
    icon: Compass,
    label: "Assess",
    title: "Understand where judgment needs work",
    body: "The Leadership Index identifies where a manager's judgment is strong and where it needs development — a development compass, not a certification or a gate.",
    accent: "#0202ff",
    accentBg: "#eef0ff",
    visual: (
      <div className="space-y-2.5">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Leadership Index — Development Compass</div>
        {[
          { label: "Decision Making", score: 42, status: "Develop" },
          { label: "Situational Intelligence", score: 68, status: "Progressing" },
          { label: "Communication", score: 81, status: "Strong" },
          { label: "Delegation", score: 38, status: "Develop" },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-gray-700 mb-1">{c.label}</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${c.score}%`,
                    backgroundColor: c.score >= 70 ? "#10b981" : c.score >= 55 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
            <span className="text-[10px] font-semibold text-gray-500 flex-shrink-0">{c.score}%</span>
          </div>
        ))}
        <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] text-blue-700 leading-relaxed">
          This is a development compass, not a certification. Use it to focus development — not to gate or rank.
        </div>
      </div>
    ),
  },
  {
    icon: MessageSquareText,
    label: "Develop",
    title: "Build judgment through conversation",
    body: "Conversational learning, coaching flows, and a built-in AI coach — delivered in Teams, Slack, and email. Managers practice real situations and produce evidence of how they think, not just what they watched.",
    accent: "#7c3aed",
    accentBg: "#f3e8ff",
    visual: (
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Conversational Learning — in Teams</div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-3 py-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#0202ff] flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">CL</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-700">AI Coach</span>
            <span className="text-[9px] text-gray-400 ml-auto">Now</span>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-[11px] text-gray-600 leading-relaxed">
              You mentioned the QA review is falling on you. Walk me through what's making it hard to delegate.
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-[11px] text-gray-700 leading-relaxed">
              I don't trust them to catch the edge cases. It's faster if I just do it.
            </div>
            <div className="text-[11px] text-gray-600 leading-relaxed">
              That's a common pull. What would need to be true for you to feel safe handing it over?
            </div>
            <div className="flex gap-2 pt-1">
              <div className="text-[10px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: "#0202ff" }}>
                I'll try a checklist
              </div>
              <div className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600">
                Not yet
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Produces a transcript — behavioral evidence, not a view count
        </div>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    label: "Prove",
    title: "Evidence that judgment changed",
    body: "Every commitment closes a loop: commit → act → follow up → evidence. You can finally show which managers improved, which didn't, and whether your development spend moved anything.",
    accent: "#059669",
    accentBg: "#d1fae5",
    visual: (
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Closed-Loop Evidence</div>
        <div className="space-y-2">
          {[
            { step: "Commitment", text: "Delegate the QA review by Friday", done: true },
            { step: "Follow-up", text: "Did you hand it off? How did it go?", done: true },
            { step: "Evidence", text: "“Delegated Friday. Two edge cases caught — added to checklist.”", done: true },
          ].map((e, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: e.done ? "#10b981" : "#e5e7eb" }}>
                <span className="text-white text-[9px] font-bold">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{e.step}</div>
                <div className="text-[11px] text-gray-700 leading-snug">{e.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700 leading-relaxed">
          Evidence recorded against: Delegation competency · Linked to Leadership Index
        </div>
      </div>
    ),
  },
];

export default function LandingAssessDevelopProve() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">How it works</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4 leading-tight">
            Assess. Develop. Prove.
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Three steps that turn manager development from a black box into a defensible story.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: step.accentBg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: step.accent }} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Step {i + 1}</div>
                    <div className="text-sm font-bold" style={{ color: step.accent }}>{step.label}</div>
                  </div>
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a] mb-2 leading-snug">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{step.body}</p>
                <div className="mt-auto rounded-xl border border-gray-100 bg-gray-50 p-4">
                  {step.visual}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Flow arrow */}
        <motion.div
          className="flex items-center justify-center gap-3 mt-10 text-gray-300"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="h-px w-16 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Same intelligence, in Teams, Slack, and the platform</span>
          <div className="h-px w-16 bg-gray-200" />
        </motion.div>
      </div>
    </section>
  );
}