import React from "react";

const chips = ["Bench strength", "Readiness", "Succession visibility"];

export default function LandingLeadershipHub() {
  return (
    <section id="home-leadership-hub" className="py-24 bg-white px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
              Executive visibility
            </p>
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-5">
              Beyond support: leadership visibility
            </h2>
            <p className="text-base text-gray-500 leading-relaxed mb-8">
              Curiosity Led helps organizations move from scattered development activity to a clearer picture of bench strength, readiness, and where leadership investment should go next.
            </p>
            <div className="flex flex-wrap gap-3">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-[#0202FF] border border-[#0202FF] bg-white"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right: visual panel */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-7 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
              Leadership Intelligence Hub
            </div>

            {/* Bench strength bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Bench strength</span>
                <span className="text-sm font-semibold text-gray-900">68%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0202FF] rounded-full" style={{ width: "68%" }} />
              </div>
            </div>

            {/* Readiness bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Readiness score</span>
                <span className="text-sm font-semibold text-gray-900">72%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: "72%" }} />
              </div>
            </div>

            {/* Risk markers */}
            <div className="border-t border-gray-100 pt-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Risk and intervention
              </div>
              <div className="space-y-3">
                {[
                  { label: "High risk", count: 3, color: "bg-red-400" },
                  { label: "Moderate risk", count: 5, color: "bg-amber-400" },
                  { label: "On track", count: 11, color: "bg-emerald-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.count} leaders</span>
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