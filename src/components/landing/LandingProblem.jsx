import React from "react";

const quotes = [
  {
    persona: "Manager",
    quote: "I do not need another program to finish. I need help with what is happening this week.",
    color: "#0202ff",
  },
  {
    persona: "HR / Talent",
    quote: "I have programs and coaching, but no single, defensible leadership story.",
    color: "#1a1a2e",
  },
  {
    persona: "Executive Sponsor",
    quote: "We are investing in leadership, but we still discover risk too late and cannot prove impact.",
    color: "#0202ff",
  },
];

export default function LandingProblem() {
  return (
    <section className="py-24 bg-[#0a0a14]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-900 bg-blue-950/40">
          <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">The problem</span>
        </div>

        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight max-w-2xl">
          Why support still arrives too late.
        </h2>

        <p className="text-gray-400 text-lg leading-relaxed max-w-3xl mb-16">
          Most healthcare organizations are not short on leadership activity. They already have programs, coaching, learning platforms, and interventions in place. The problem is that these are often time-consuming, disconnected from daily work, and triggered{" "}
          <span className="text-white font-medium">after the behavior has already affected teams, engagement, or patient-facing outcomes.</span>
        </p>

        {/* Quote cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col"
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-4 px-2.5 py-1 rounded-full self-start"
                style={{ color: q.color, backgroundColor: `${q.color}18` }}
              >
                {q.persona}
              </div>
              <blockquote className="text-gray-300 text-sm leading-relaxed flex-1 italic">
                "{q.quote}"
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}