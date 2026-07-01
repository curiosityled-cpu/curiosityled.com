import React from "react";
import { getIndustryConfig } from "./industryConfig";

export default function IndustryMicrosoft({ industry }) {
  const cfg = getIndustryConfig(industry);
  const msFeatures = MS_FEATURES[industry] || MS_FEATURES.bpo;

  return (
    <section className="py-20 bg-[#0f0f1a]">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-6">
          <div className="w-5 h-5 rounded-sm bg-[#0078d4] flex items-center justify-center text-white text-[10px] font-bold">
            T
          </div>
          <span className="text-white text-xs font-medium">Microsoft Teams Native</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">{msFeatures.heading}</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">{msFeatures.intro}</p>
        <div className="grid md:grid-cols-3 gap-6 text-left">
          {msFeatures.items.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h4 className="text-white font-semibold text-sm mb-2">{f.title}</h4>
              <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MS_FEATURES = {
  bpo: {
    heading: "BPO managers live in Teams. So do we.",
    intro:
      "Receive risk nudges, view your daily priority dashboard, and access coaching flows without ever switching windows or logging into a heavy portal. Curiosity Led meets your team where work happens.",
    items: [
      { title: "Pattern Alerts in Teams", desc: "Get a nudge when a leadership risk pattern is detected — right in your Teams sidebar, not a separate app." },
      { title: "Coaching Flows On Demand", desc: "Each pattern triggers a pre-built, lightweight coaching checklist your team lead can action immediately." },
      { title: "Daily Rhythm Without the Portal", desc: "Check-ins, priorities, and progress tracking happen in the tools your managers already use daily." },
    ],
  },
  healthcare: {
    heading: "Low-burden rhythm for high-burden leaders.",
    intro:
      "Healthcare managers don't have time for another portal. Curiosity Led check-ins, nudges, and development prompts happen directly in Microsoft Teams — where they already communicate.",
    items: [
      { title: "60-second daily check-ins", desc: "A private energy and focus pulse — surfacing overload before it becomes a patient safety or retention issue." },
      { title: "Coaching in Teams", desc: "Development prompts and leadership support delivered in context, without requiring a separate login or platform switch." },
      { title: "Readiness visible to HR", desc: "As managers develop, their readiness scores update in real-time — giving HR a live succession and bench-strength view." },
    ],
  },
  coaching: {
    heading: "Your methodology, in the tools your clients already use.",
    intro:
      "Clients don't adopt new tools. Curiosity Led delivers your coaching prompts, commitment trackers, and development nudges inside Microsoft Teams — where your clients already live.",
    items: [
      { title: "Session prework, automated", desc: "Before every coaching session, clients receive a structured summary: commitments kept, decisions made, and patterns detected since the last meeting." },
      { title: "Commitment tracking between sessions", desc: "Each behavioural commitment a client makes in a session is tracked daily — giving you objective data on follow-through, not self-report." },
      { title: "Scalable across your client portfolio", desc: "Once configured, the platform runs your methodology across all clients simultaneously — freeing your coaches to focus on high-value session work." },
    ],
  },
};