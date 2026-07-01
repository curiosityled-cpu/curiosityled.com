import React, { useState } from "react";
import IndustryNav from "@/components/landing/shared/IndustryNav";
import MicrosoftTrustBar from "@/components/landing/shared/MicrosoftTrustBar";
import SharedFooter from "@/components/landing/shared/SharedFooter";

const CONTINUITY_POINTS = [
  {
    before: "A powerful session insight",
    after: "A daily coaching prompt that reinforces the same insight — automatically",
  },
  {
    before: "A competency framework in a deck",
    after: "A live competency model that managers interact with daily in Teams",
  },
  {
    before: "A 90-day programme",
    after: "An operating rhythm that continues beyond the engagement window",
  },
  {
    before: "Your firm's IP delivered in workshops",
    after: "Your methodology embedded into every manager's daily routine",
  },
];

const WHITE_LABEL_FEATURES = [
  {
    icon: "🎨",
    title: "Your Branding",
    desc: "Full white-label capability — your firm's name, logo, and colour palette throughout the manager experience.",
  },
  {
    icon: "🧠",
    title: "Your Competency Framework",
    desc: "Configure our platform to reflect your firm's proprietary leadership model — not a generic one.",
  },
  {
    icon: "💬",
    title: "Your Coaching Prompts",
    desc: "Load your methodology's language, frameworks, and reflection questions directly into the daily rhythm.",
  },
  {
    icon: "📊",
    title: "Your Client Reporting",
    desc: "Aggregate leadership trend data per client engagement — giving you evidence of your programme's real-world impact.",
  },
];

const PARTNER_MODELS = [
  {
    title: "Programme Extension",
    desc: "Deploy Curiosity Led as the between-session layer for an existing coaching or leadership programme. Your methodology, our operating rhythm.",
    cta: "Extend your programme",
  },
  {
    title: "White-Label Delivery",
    desc: "License Curiosity Led under your firm's brand and integrate it as a core component of your leadership development offer.",
    cta: "Explore white-label",
  },
  {
    title: "Client Pilot",
    desc: "Run a structured 90-day pilot with one client to validate the model before scaling across your portfolio.",
    cta: "Run a pilot",
  },
];

export default function LandingCoaching() {
  const [activeModel, setActiveModel] = useState(0);

  return (
    <div className="min-h-screen bg-white font-sans">
      <IndustryNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-900 to-violet-700 text-white px-4 pt-20 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-violet-400/20 text-violet-200 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
            Coaching & Consulting Firms
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Turn your methodology into<br className="hidden md:block" /> a daily operating system.
          </h1>
          <p className="text-violet-200 text-lg max-w-2xl mx-auto mb-8">
            The impact of great coaching shouldn't stop when the session ends. Curiosity Led gives your clients a daily leadership rhythm that keeps your firm's methodology alive — inside Microsoft Teams, every working day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:hello@curiosityled.com?subject=Partner Model Inquiry"
              className="bg-white text-violet-900 font-semibold px-6 py-3 rounded-lg hover:bg-violet-50 transition-colors"
            >
              Explore the Partner Model
            </a>
            <a
              href="mailto:hello@curiosityled.com?subject=Coaching Demo Request"
              className="border border-white/30 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      <MicrosoftTrustBar />

      {/* The Continuity Problem */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Coaching's biggest unsolved problem
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Your sessions create real insight. But without a structure for daily application, those insights fade between sessions. The gap between "session day" and "back at work" is where your firm's impact erodes.
            </p>
          </div>
          <div className="space-y-3">
            {CONTINUITY_POINTS.map((point, i) => (
              <div key={i} className="grid sm:grid-cols-2 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">✗</span>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Without Curiosity Led</span>
                    <p className="text-slate-600 text-sm mt-0.5">{point.before}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-500 text-lg mt-0.5">✓</span>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">With Curiosity Led</span>
                    <p className="text-slate-700 text-sm font-medium mt-0.5">{point.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* White-Label Features */}
      <section className="py-16 px-4 bg-violet-50 border-y border-violet-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">White-Label & Configuration</span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 mb-3">
              Your framework. Your brand. Our infrastructure.
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Curiosity Led is built to carry your firm's IP — not replace it. Every configurable layer is designed to feel like a natural extension of your methodology.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHITE_LABEL_FEATURES.map((f) => (
              <div key={f.title} className="bg-white border border-violet-100 rounded-xl p-5 shadow-sm">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-slate-800 text-sm mb-2">{f.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Models */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
              Three ways to partner
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Whether you want to extend an existing programme or build Curiosity Led into your core offer, there's a model that fits.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PARTNER_MODELS.map((model, i) => (
              <div
                key={model.title}
                onClick={() => setActiveModel(i)}
                className={`rounded-xl border p-6 cursor-pointer transition-all ${
                  activeModel === i
                    ? "border-violet-500 bg-violet-50 shadow-md"
                    : "border-slate-200 hover:border-violet-200 hover:bg-violet-50/40"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4 ${activeModel === i ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {i + 1}
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{model.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{model.desc}</p>
                <a
                  href={`mailto:hello@curiosityled.com?subject=Partner Model: ${model.title}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-violet-600 text-sm font-semibold hover:underline"
                >
                  {model.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence of impact */}
      <section className="py-16 px-4 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Give your clients evidence of change
          </h2>
          <p className="text-slate-500 text-sm mb-8 max-w-xl mx-auto">
            Curiosity Led surfaces aggregate leadership trend data per client — so your firm can demonstrate real-world behaviour change over time, not just session completion rates.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { stat: "Daily", label: "Leadership rhythm built" },
              { stat: "30–90 day", label: "Trend visibility per client" },
              { stat: "Your IP", label: "Embedded into daily practice" },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="text-2xl font-bold text-violet-700 mb-1">{item.stat}</div>
                <div className="text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-violet-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to make your coaching permanent?
          </h2>
          <p className="text-violet-200 mb-8 text-sm">
            We'll explore which partner model fits your firm's structure and current client portfolio.
          </p>
          <a
            href="mailto:hello@curiosityled.com?subject=Partner Model Inquiry"
            className="bg-white text-violet-900 font-semibold px-8 py-3 rounded-lg hover:bg-violet-50 transition-colors inline-block"
          >
            Explore the Partner Model
          </a>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}