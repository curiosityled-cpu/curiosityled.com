import React, { useEffect } from "react";
import { Layers, RefreshCw, Settings, TrendingUp, Repeat, Palette } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import IndustryHero from "@/components/landing/IndustryHero";
import IndustryProblem from "@/components/landing/IndustryProblem";
import IndustryMicrosoft from "@/components/landing/IndustryMicrosoft";
import IndustryFinalCTA from "@/components/landing/IndustryFinalCTA";
import IndustryTrustStrip from "@/components/landing/IndustryTrustStrip";
import IndustryFooter from "@/components/landing/IndustryFooter";
import { getIndustryConfig } from "@/components/landing/industryConfig";

export default function LandingCoaching() {
  const cfg = getIndustryConfig("coaching");

  useEffect(() => {
    document.title = cfg.pageTitle;
    window.scrollTo(0, 0);
  }, [cfg.pageTitle]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <IndustryHero industry="coaching" />
      <IndustryTrustStrip />
      <IndustryProblem industry="coaching" />

      {/* White-Label Configuration — Coaching specific */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-6 inline-block">White-Label &amp; Configuration</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Your brand. Your framework. Your IP.</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">Curiosity Led is configured around your firm's competency model, not ours. Your clients see your branding, your language, and your coaching philosophy — powered by our operating infrastructure.</p>
              <div className="space-y-4">
                {[
                  { icon: Palette, title: "Full white-label branding", desc: "Your logo, your colour palette, your domain. Clients experience your firm, not Curiosity Led." },
                  { icon: Layers, title: "Custom competency frameworks", desc: "Map your leadership model into the platform — any competency structure, any behavioural anchors." },
                  { icon: Settings, title: "Configurable coaching prompts", desc: "Define the questions, reflections, and nudges your clients receive — aligned to your methodology's language." },
                  { icon: TrendingUp, title: "Impact reporting for sponsors", desc: "Generate objective progress reports to share with HR sponsors — commitment tracking, competency growth, decision quality." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4">
                      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eef0ff" }}>
                        <Icon className="w-4 h-4" style={{ color: "#0202ff" }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2">What your clients get daily</h3>
              <p className="text-xs text-gray-500 mb-6">Between every coaching session, your methodology stays active.</p>
              <div className="space-y-3">
                {[
                  { time: "Morning", action: "Daily priority and energy check-in — aligned to your framework's language.", color: "#0202ff" },
                  { time: "Midday", action: "Progress pulse on committed leadership behaviours from the session.", color: "#6366f1" },
                  { time: "Evening", action: "Reflection prompt — what worked, what shifted, what to carry forward.", color: "#10b981" },
                  { time: "Session Prep", action: "Auto-generated prework: commitments kept, decisions made, patterns detected.", color: "#f59e0b" },
                ].map((row) => (
                  <div key={row.time} className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold w-16 flex-shrink-0 mt-0.5" style={{ color: row.color }}>{row.time}</div>
                    <div className="text-xs text-gray-600 leading-relaxed">{row.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <IndustryMicrosoft industry="coaching" />
      <IndustryFinalCTA industry="coaching" />
      <IndustryFooter />
    </div>
  );
}