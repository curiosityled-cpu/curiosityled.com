import React from "react";

const quotes = [
  {
    persona: "Manager",
    quote: "I do not need another program to finish. I need help with what is happening this week.",
  },
  {
    persona: "HR / Talent",
    quote: "I have programs and coaching, but no single, defensible leadership story.",
  },
  {
    persona: "Executive Sponsor",
    quote: "We are investing in leadership, but risk is still discovered too late and impact is still hard to prove.",
  },
];

export default function LandingProblem() {
  return (
    <section className="py-24 bg-[#1a1a2e]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section label */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/20 bg-white/10">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">The problem</span>
        </div>

        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight max-w-2xl">
          Why manager support still arrives too late.
        </h2>

        <p className="text-gray-200 text-lg leading-relaxed max-w-3xl mb-16">
          Most healthcare organizations already have leadership programs, coaching, and learning platforms. The problem is that support often lives outside daily work and gets triggered only{" "}
          <span className="text-white font-bold">after a behavior has impacted the team, engagement has slipped, or risk has already grown.</span>{" "}
          Managers feel like they are juggling development on top of the job, while HR struggles to explain what is actually working.
        </p>

        {/* Overworked manager image */}
        <div className="mb-12 rounded-2xl overflow-hidden max-h-72 w-full">
          <img
            src="https://raw.githubusercontent.com/curiosityled-cpu/curiosityled.com/main/public/Body%20(37).png"
            alt="Overwhelmed manager under pressure"
            className="w-full h-72 object-cover object-center"
          />
        </div>

        {/* Quote cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/15 bg-white/8 p-6 flex flex-col"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-4 px-2.5 py-1 rounded-full self-start bg-white/15 text-white">
                {q.persona}
              </div>
              <blockquote className="text-gray-100 text-sm leading-relaxed flex-1 italic">
                "{q.quote}"
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}