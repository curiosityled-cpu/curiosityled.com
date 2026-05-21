import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const outcomes = [
  {
    title: "Earlier support",
    body: "Spot when managers need support sooner and make interventions more timely and practical.",
  },
  {
    title: "Stronger bench visibility",
    body: "See where bench strength is growing, where readiness is lagging, and where succession gaps need attention.",
  },
  {
    title: "Better talent conversations",
    body: "Bring more structure and evidence into conversations about progression, readiness, and development priorities.",
  },
  {
    title: "A more measurable development story",
    body: "Connect leadership activity to a clearer, more defensible view of progress over time.",
  },
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
              <span className="text-xs font-semibold text-white uppercase tracking-wider">What this makes possible</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
              A clearer system for manager development, readiness, and succession.
            </h2>

            <ul className="space-y-5 mb-8">
              {outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-white" />
                  <div>
                    <div className="text-white font-semibold text-sm mb-0.5">{o.title}</div>
                    <div className="text-gray-300 text-sm leading-relaxed">{o.body}</div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-white/30 pl-4 italic">
              The goal is not more leadership activity. The goal is earlier visibility, better timing, and a leadership-development story HR can defend when executives ask what is working.
            </p>
          </div>

          {/* Right: image */}
          <div className="rounded-2xl overflow-hidden">
            <img
              src="/18T115222051.png"
              alt="Progress and timeline"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}