import React from "react";

const proofPoints = [
  {
    title: "Development happens after strain is already visible.",
    body: "Support gets triggered once a behavior has impacted the team — not before.",
  },
  {
    title: "HR gets disconnected signals instead of one defensible story.",
    body: "Assessments, coaching, and goals sit in different places, making impact hard to explain.",
  },
  {
    title: "Succession discussions begin without enough visibility.",
    body: "Readiness conversations start without a clear view of bench strength or progression.",
  },
];

const voices = [
  { persona: "Manager", quote: "I do not need another program to finish. I need help with what is happening this week." },
  { persona: "HR / Talent", quote: "I have programs and coaching, but no single, defensible leadership story." },
  { persona: "Executive Sponsor", quote: "We are investing in leadership, but succession conversations still start without a clear picture of who is ready." },
];

export default function LandingProblem() {
  return (
    <section className="py-24 bg-[#1a1a2e]">
      <div className="max-w-6xl mx-auto px-6">

        {/* Top: label + headline */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-white/20 bg-white/10">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">The problem</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight max-w-2xl">
            Most leadership development starts too late and stays too fragmented.
          </h2>
        </div>

        {/* Middle: image left, proof points right */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="rounded-2xl overflow-hidden">
            <img
              src="/web_overworked_CREDIT-PeopleImages_iStock-654187068.png"
              alt="Overworked manager"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <p className="text-gray-300 text-lg leading-relaxed mb-10">
              Healthcare organizations are already investing in manager development, coaching, and assessments. The challenge is that support often sits{" "}
              <span className="text-white font-bold">outside the flow of work</span>, leadership signals are scattered across systems, and succession conversations start without a clear view of readiness or progress.
            </p>

            <div className="space-y-6">
              {proofPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <span className="text-white text-xs font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm leading-snug mb-1">{p.title}</div>
                    <div className="text-gray-400 text-sm leading-relaxed">{p.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: voices strip */}
        <div className="border-t border-white/10 pt-10">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">What we hear from healthcare teams</p>
          <div className="grid md:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden">
            {voices.map((v, i) => (
              <div key={i} className="p-6 flex flex-col gap-3" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{v.persona}</span>
                <blockquote className="text-gray-100 text-sm leading-relaxed italic">
                  "{v.quote}"
                </blockquote>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}