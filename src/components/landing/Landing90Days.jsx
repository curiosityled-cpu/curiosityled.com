import React from "react";
import { CheckCircle2 } from "lucide-react";

const outcomes = [
  "At-risk new leaders are identified earlier.",
  "Managers receive support at the moment of need.",
  "Development is tied more closely to real behavior.",
  "Leaders get a clearer view of risk, readiness, and intervention priorities.",
];

export default function Landing90Days() {
  return (
    <section className="py-24 bg-[#1a1a2e]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/20 bg-white/10">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">90-day outcomes</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
              What changes in the first 90 days.
            </h2>

            <ul className="space-y-4 mb-8">
              {outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
                  <span className="text-gray-200 leading-relaxed">{o}</span>
                </li>
              ))}
            </ul>

            <p className="text-gray-200 text-sm leading-relaxed border-l-2 border-white/30 pl-4 italic">
              The goal is not more leadership activity. The goal is earlier visibility, better timing, and a leadership-development story that HR can defend with more confidence.
            </p>
          </div>

          {/* Right: timeline visual */}
          <div className="space-y-4">
            {[
              { week: "Week 1–2", label: "Baseline assessment complete", sub: "Leadership archetypes and risk signals identified", pct: 15 },
              { week: "Week 3–6", label: "First coaching loops active", sub: "Managers receive in-workflow support tied to real challenges", pct: 45 },
              { week: "Week 7–10", label: "Progress visible in one view", sub: "HR and exec sponsors see who is progressing vs. at risk", pct: 70 },
              { week: "Week 11–13", label: "Defensible leadership story", sub: "Development tied to behavior, not just program completion", pct: 90 },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-0.5">
                      {t.week}
                    </div>
                    <div className="text-sm font-bold text-white">{t.label}</div>
                    <div className="text-xs text-gray-200 mt-0.5">{t.sub}</div>
                  </div>
                  <div className="text-sm font-bold flex-shrink-0 ml-3 text-white">
                    {t.pct}%
                  </div>
                </div>
                <div className="w-full bg-white/15 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all bg-white"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}