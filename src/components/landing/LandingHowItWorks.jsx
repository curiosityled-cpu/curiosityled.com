import React from "react";

const steps = [
  {
    number: "01",
    title: "Assess early",
    body: "Establish a baseline and surface where newly promoted or newly hired leaders may need support first.",
  },
  {
    number: "02",
    title: "Focus action",
    body: "Turn insight into one goal and one next step tied to what the manager is handling now.",
  },
  {
    number: "03",
    title: "Reinforce support",
    body: "Keep development connected to daily work with timely guidance instead of delayed intervention.",
  },
  {
    number: "04",
    title: "See clearly",
    body: "Give HR and executive sponsors one view of risk, progress, readiness, and intervention priorities.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="home-how-it-works" className="py-24 bg-gray-50 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-4">
          The workflow
        </p>
        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-950 mb-4 max-w-2xl">
          From assessment to executive view
        </h2>
        <p className="text-base text-gray-500 leading-relaxed max-w-2xl mb-14">
          One system helps teams assess earlier, guide action, reinforce behavior, and show leadership visibility in one place.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="relative bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              {/* Connector line on desktop */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-3 w-6 h-px bg-gray-200 z-10" />
              )}
              <div className="text-3xl font-serif font-bold text-[#0202FF] opacity-30 mb-4 leading-none">
                {step.number}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}