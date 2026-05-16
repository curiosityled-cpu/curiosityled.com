import React from "react";

const bullets = [
  "At-risk new leaders are identified earlier.",
  "Managers get support at the moment of need.",
  "Development ties more closely to real behavior.",
  "Leaders see risk, progress, and where to intervene.",
];

export default function LandingOutcomes() {
  return (
    <section id="home-outcomes" className="py-24 bg-white px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
              In 90 days
            </p>
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-6">
              What changes first
            </h2>
            <div className="space-y-4">
              {bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-4">
                  <span className="w-5 h-5 rounded-full border-2 border-[#0202FF] flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0202FF]" />
                  </span>
                  <p className="text-base text-gray-700 leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              The case for HR
            </div>
            <p className="text-base text-gray-700 leading-relaxed">
              A clearer leadership story helps HR defend where support is working and where action is needed next.
            </p>
            <div className="mt-7 pt-7 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Earlier", sub: "Risk signals" },
                  { label: "One view", sub: "Leadership data" },
                  { label: "90 days", sub: "To measurable shift" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-xl font-bold text-[#0202FF] mb-0.5">{stat.label}</div>
                    <div className="text-xs text-gray-400">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}