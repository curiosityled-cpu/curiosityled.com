import React, { useState } from "react";

const tabs = [
  {
    id: "jane",
    label: "For Jane, the Manager",
    headline: "Help when leadership gets real.",
    body: "Newly promoted leaders do not need another program to finish. They need timely support for what is happening with their team, workload, and decisions right now.",
    pains: [
      "New to leadership, strong at the work",
      "Overwhelmed by people issues and workload",
      "Quiet fear: \u201cI\u2019m failing\u201d",
    ],
    solution: "Curiosity Led turns insight into one goal, one action, and in-the-moment support.",
    outcome: "Managers get support at the moment of need.",
  },
  {
    id: "terry",
    label: "For Terry, the HR Director",
    headline: "One defensible leadership story.",
    body: "HR and Talent teams already have programs, coaching, and tools. The challenge is pulling those efforts into one view that shows risk, progress, and where intervention matters most.",
    pains: [
      "Data spread across systems",
      "Programs hard to measure",
      "Executive pressure for answers",
    ],
    solution: "Curiosity Led helps HR assign leaders, monitor progress, and show one clearer talent story.",
    outcome: "HR gets one clearer system for support, progress, and reporting.",
  },
  {
    id: "cpo",
    label: "For the CPO",
    headline: "See risk before it becomes loss.",
    body: "Executive sponsors need to know where leadership risk is building, whether development is working, and where attention and budget should go next.",
    pains: [
      "Risk stays invisible too long",
      "No clear line from development to impact",
      "Bench strength is hard to see early",
    ],
    solution: "The Leadership Intelligence Hub shows risk, readiness, and intervention visibility in one place.",
    outcome: "Leaders can focus development dollars and attention with more confidence.",
  },
];

export default function LandingPersonas() {
  const [active, setActive] = useState("jane");
  const tab = tabs.find((t) => t.id === active);

  return (
    <section id="home-personas" className="py-24 bg-gray-50 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
          See it by buyer
        </p>
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-4 max-w-2xl">
          Different pressures, one clearer system
        </h2>
        <p className="text-base text-gray-500 leading-relaxed max-w-2xl mb-10">
          Curiosity Led helps each stakeholder solve a different version of the same problem: support is too late, too fragmented, and too hard to measure.
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-0 border-b border-gray-200 mb-10">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                active === t.id
                  ? "border-[#0202FF] text-[#0202FF]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: copy */}
          <div>
            <h3 className="text-2xl font-serif font-bold text-gray-950 mb-4">{tab.headline}</h3>
            <p className="text-base text-gray-600 leading-relaxed mb-7">{tab.body}</p>
            <div className="space-y-2.5 mb-8">
              {tab.pains.map((pain) => (
                <div key={pain} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                  {pain}
                </div>
              ))}
            </div>
          </div>

          {/* Right: solution + outcome */}
          <div className="bg-white border border-gray-100 rounded-xl p-7 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              How Curiosity Led helps
            </div>
            <p className="text-base text-gray-800 leading-relaxed mb-6">{tab.solution}</p>
            <div className="border-t border-gray-100 pt-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Outcome
              </div>
              <p className="text-sm font-semibold text-[#0202FF]">{tab.outcome}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}