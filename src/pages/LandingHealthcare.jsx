import React from "react";
import IndustryNav from "@/components/landing/shared/IndustryNav";
import MicrosoftTrustBar from "@/components/landing/shared/MicrosoftTrustBar";
import SharedFooter from "@/components/landing/shared/SharedFooter";

const PILLARS = [
  {
    icon: "🏥",
    title: "Frontline Manager Support",
    desc: "Charge nurses, unit managers, and department leads carry enormous responsibility with limited leadership development support. Curiosity Led gives them a daily rhythm that surfaces how they're doing — not just how their unit is doing.",
  },
  {
    icon: "🔒",
    title: "Trust & Data Governance",
    desc: "Individual check-in data stays private to the manager. Aggregate signals surface only when patterns are consistent across time — never exposing a single moment of vulnerability to organisational review.",
  },
  {
    icon: "📉",
    title: "Workforce Stability",
    desc: "Turnover in healthcare is expensive and dangerous. Curiosity Led detects early leadership signals — disengagement, coaching deficit, burnout risk — before they translate to agency spend or patient care gaps.",
  },
  {
    icon: "💬",
    title: "Psychological Safety First",
    desc: "Managers need to be able to say 'I'm stretched' or 'I'm unsure' without it becoming a performance record. Our platform creates the space for honest self-reflection — the foundation of safe care environments.",
  },
];

const PROBLEMS = [
  {
    title: "Charge nurses promoted for clinical skill, not leadership readiness",
    detail: "The most capable clinician becomes the most isolated manager. Without structured leadership support, they default to managing tasks — not people.",
  },
  {
    title: "High-stakes decisions made under chronic overload",
    detail: "When leaders are running at 80% capacity, their coaching, communication, and decision quality all deteriorate. Healthcare can't afford that gap.",
  },
  {
    title: "Turnover treated as a recruitment problem, not a leadership one",
    detail: "Agency cost, onboarding time, and continuity of care all suffer when leadership quality isn't sustained. Curiosity Led addresses the upstream cause.",
  },
];

export default function LandingHealthcare() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <IndustryNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-900 to-teal-700 text-white px-4 pt-20 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-teal-400/20 text-teal-200 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
            Healthcare
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Support the people<br className="hidden md:block" /> who carry care.
          </h1>
          <p className="text-teal-100 text-lg max-w-2xl mx-auto mb-8">
            Healthcare's frontline managers need more than a performance system. They need a daily operating layer that supports their leadership — privately, safely, and in the tools they already use.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:hello@curiosityled.com?subject=Healthcare Pilot Request"
              className="bg-white text-teal-900 font-semibold px-6 py-3 rounded-lg hover:bg-teal-50 transition-colors"
            >
              Start a Pilot
            </a>
            <a
              href="mailto:hello@curiosityled.com?subject=Healthcare Demo Request"
              className="border border-white/30 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      <MicrosoftTrustBar />

      {/* The Real Problem */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              The leadership gap hiding in plain sight
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Healthcare organisations invest heavily in clinical capability. Leadership development for frontline managers — the people responsible for team cohesion, staff retention, and daily care culture — is rarely resourced at the same level.
            </p>
          </div>
          <div className="space-y-4">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="flex gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">{p.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{p.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four Pillars */}
      <section className="py-16 px-4 bg-teal-50 border-y border-teal-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Built for care environments
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Every design decision in Curiosity Led reflects the unique pressures of healthcare leadership.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PILLARS.map((p) => (
              <div key={p.title} className="bg-white border border-teal-100 rounded-xl p-6 shadow-sm">
                <div className="text-2xl mb-3">{p.icon}</div>
                <h3 className="font-bold text-slate-800 mb-2">{p.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Privacy callout */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-10">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-teal-400 font-semibold text-sm">Data Governance & Trust</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-4">
              Your managers' data is not an organisational audit tool.
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Curiosity Led is designed to be a support system, not a surveillance system. Individual check-in responses, self-assessments, and coaching notes are private to the manager by default. Aggregate signals are only surfaced to leadership when consistent patterns emerge — protecting both the individual and the organisation.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                "No individual data in org reports",
                "Manager controls their own visibility",
                "Designed for trust, not monitoring",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-slate-300">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it sits in the workflow */}
      <section className="py-16 px-4 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Works inside Microsoft Teams — no new portals
          </h2>
          <p className="text-slate-500 text-sm mb-10 max-w-xl mx-auto">
            Frontline leaders in healthcare are stretched. Curiosity Led meets them in the tools they're already using — so the leadership rhythm gets embedded, not abandoned.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: "Morning", desc: "A 2-minute priority and energy check-in surfaces what matters most before the shift." },
              { label: "During the Day", desc: "Pattern alerts surface if workload, coaching gaps, or escalation risks are building." },
              { label: "End of Day", desc: "A quick reflection loop closes the day and informs tomorrow's priorities." },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-5 text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-teal-600">{item.label}</span>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-teal-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to support your frontline leaders?
          </h2>
          <p className="text-teal-200 mb-8 text-sm">
            We'll walk through how Curiosity Led would fit into your leadership structure in a 30-minute conversation.
          </p>
          <a
            href="mailto:hello@curiosityled.com?subject=Healthcare Pilot Request"
            className="bg-white text-teal-900 font-semibold px-8 py-3 rounded-lg hover:bg-teal-50 transition-colors inline-block"
          >
            Start a Pilot Conversation
          </a>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}