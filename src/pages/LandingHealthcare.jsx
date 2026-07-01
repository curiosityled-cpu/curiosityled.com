import React, { useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import IndustryHero from "@/components/landing/IndustryHero";
import IndustryProblem from "@/components/landing/IndustryProblem";
import IndustryMicrosoft from "@/components/landing/IndustryMicrosoft";
import IndustryFinalCTA from "@/components/landing/IndustryFinalCTA";
import IndustryTrustStrip from "@/components/landing/IndustryTrustStrip";
import IndustryFooter from "@/components/landing/IndustryFooter";
import { getIndustryConfig } from "@/components/landing/industryConfig";

export default function LandingHealthcare() {
  const cfg = getIndustryConfig("healthcare");

  useEffect(() => {
    document.title = cfg.pageTitle;
    window.scrollTo(0, 0);
  }, [cfg.pageTitle]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <IndustryHero industry="healthcare" />
      <IndustryTrustStrip />
      <IndustryProblem industry="healthcare" />

      {/* Trust & Data Governance — Healthcare specific */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-6 inline-block">Trust &amp; Data Governance</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for healthcare's privacy standards</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">Curiosity Led was designed with healthcare's data sensitivity in mind. Individual manager data is never surfaced to senior leadership without aggregation — the system supports, not monitors.</p>
              <div className="space-y-4">
                {[
                  { title: "Individual data stays private", desc: "A manager's check-in data, energy signals, and development history belong to them — not to their supervisor or HR by default." },
                  { title: "Aggregated insights for HR", desc: "HR and Talent teams see workforce-level trends — readiness scores, succession gaps, overload patterns — without individual exposure." },
                  { title: "No surveillance architecture", desc: "We don't track productivity or monitor behaviour. Curiosity Led is a support layer, not a performance monitoring system." },
                  { title: "Microsoft-compliant infrastructure", desc: "Built to integrate with your existing Microsoft 365 tenant — using your organisation's security and compliance controls." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: "#10b981" }}>✓</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 border border-emerald-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">How data flows in healthcare</h3>
              <div className="space-y-4">
                {[
                  { who: "The Manager", sees: "Their own patterns, check-ins, development, and growth — fully private.", bg: "#eef0ff", border: "#c7ccff" },
                  { who: "HR & Talent", sees: "Aggregated readiness scores, overload signals, succession bench strength — no individual exposure.", bg: "#f0fdf4", border: "#bbf7d0" },
                  { who: "Senior Leadership", sees: "Workforce stability trends, attrition risk, and readiness gaps — at the cohort or unit level.", bg: "#fffbeb", border: "#fde68a" },
                ].map((row) => (
                  <div key={row.who} className="rounded-xl p-4 border" style={{ backgroundColor: row.bg, borderColor: row.border }}>
                    <div className="text-xs font-bold text-gray-800 mb-1">{row.who}</div>
                    <div className="text-xs text-gray-600 leading-relaxed">{row.sees}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <IndustryMicrosoft industry="healthcare" />
      <IndustryFinalCTA industry="healthcare" />
      <IndustryFooter />
    </div>
  );
}