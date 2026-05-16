import React, { useState } from "react";

const faqs = [
  {
    q: "Will managers actually use it?",
    a: "The experience is built around real leadership moments, so support feels timely and useful rather than like another program to complete.",
  },
  {
    q: "Can we prove impact?",
    a: "Curiosity Led connects assessment, action, and progress into one clearer leadership story instead of scattering signals across systems.",
  },
  {
    q: "Will this create more admin work?",
    a: "The system is designed to reduce fragmentation and give HR a more scalable way to support manager cohorts.",
  },
  {
    q: "Will leaders get a usable view?",
    a: "The Leadership Intelligence Hub is designed to show risk, readiness, progress, and intervention visibility in one place.",
  },
];

export default function LandingFAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="home-objections" className="py-24 bg-gray-50 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
          Buyer questions
        </p>
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-12 max-w-2xl">
          Built for the questions HR asks
        </h2>

        <div className="max-w-2xl">
          {faqs.map((faq, i) => (
            <div key={faq.q} className={`border-b border-gray-200 ${i === 0 ? "border-t" : ""}`}>
              <button
                className="w-full flex items-center justify-between py-5 text-left group"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span className="text-base font-medium text-gray-900 group-hover:text-[#0202FF] transition-colors pr-4">
                  {faq.q}
                </span>
                <span
                  className={`flex-shrink-0 w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    open === i ? "rotate-45" : ""
                  }`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  open === i ? "max-h-40 pb-5" : "max-h-0"
                }`}
              >
                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}