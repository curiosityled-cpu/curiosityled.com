import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Will managers use it?",
    a: "Curiosity Led is designed around real management moments, so support is tied to current challenges rather than another training layer to complete later.",
  },
  {
    q: "Can we prove impact?",
    a: "The platform connects assessment, action, and progress into one clearer leadership story instead of scattering signals across programs and systems.",
  },
  {
    q: "Will this create more admin work?",
    a: "Curiosity Led is built to reduce fragmentation and give HR a more scalable way to support manager cohorts without manually stitching together updates, interventions, and reporting.",
  },
  {
    q: "Will executives get a usable view?",
    a: "The Leadership Intelligence Hub is designed to show risk, readiness, bench strength, and intervention visibility in one place.",
  },
];

export default function LandingFAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Common questions</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] leading-tight">
            Built for the questions HR teams actually ask.
          </h2>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900 text-sm">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}