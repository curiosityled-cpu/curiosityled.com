import React, { useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import IndustryHero from "@/components/landing/IndustryHero";
import IndustryProblem from "@/components/landing/IndustryProblem";
import IndustryMicrosoft from "@/components/landing/IndustryMicrosoft";
import IndustryFinalCTA from "@/components/landing/IndustryFinalCTA";
import IndustryTrustStrip from "@/components/landing/IndustryTrustStrip";
import IndustryFooter from "@/components/landing/IndustryFooter";
import { getIndustryConfig } from "@/components/landing/industryConfig";

const PATTERNS = [
  {
    bucket: "Operational Risk",
    color: "#ef4444",
    bg: "#fff1f1",
    items: [
      { name: "Reactive Leadership", kpis: ["SLA Adherence", "Escalation Rate"], def: "Leaders respond only when metrics breach thresholds — no proactive coaching rhythm in place." },
      { name: "Metric Myopia", kpis: ["AHT", "QA Score"], def: "Over-focus on one KPI (e.g. AHT) at the expense of holistic team performance and morale." },
      { name: "Accountability Gap", kpis: ["Escalation Rate", "FCR"], def: "Low ownership of outcomes; team members lack clear expectations tied to observable behaviour." },
    ],
  },
  {
    bucket: "People Risk",
    color: "#f59e0b",
    bg: "#fffbeb",
    items: [
      { name: "Attrition Risk Behaviour", kpis: ["Attrition Rate", "Morale"], def: "Signals of disengagement, lack of recognition, or one-way communication from the team leader." },
      { name: "Coaching Deficit", kpis: ["QA Drift", "FCR"], def: "Insufficient or inconsistent coaching conversations — feedback loops are broken or absent." },
      { name: "Performance Avoidance", kpis: ["QA Score", "SLA"], def: "Leaders delay or avoid difficult performance conversations, allowing gaps to compound." },
    ],
  },
  {
    bucket: "Execution Risk",
    color: "#0202ff",
    bg: "#eef0ff",
    items: [
      { name: "Delegation Failure", kpis: ["Capacity Utilisation", "AHT"], def: "Work remains at the leader level; team is under-utilised and growth opportunities are lost." },
    ],
  },
];

export default function LandingBPO() {
  const cfg = getIndustryConfig("bpo");

  useEffect(() => {
    document.title = cfg.pageTitle;
    window.scrollTo(0, 0);
  }, [cfg.pageTitle]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <IndustryHero industry="bpo" />
      <IndustryTrustStrip />
      <IndustryProblem industry="bpo" />

      {/* Seven Patterns Matrix — BPO specific */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Seven BPO Leadership Patterns</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Each pattern is mapped to the operational KPIs it most directly affects — so every coaching action is grounded in business impact.</p>
          </div>
          <div className="space-y-8">
            {PATTERNS.map((bucket) => (
              <div key={bucket.bucket}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: bucket.color }}>{bucket.bucket}</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {bucket.items.map((item) => (
                    <div key={item.name} className="rounded-xl border p-5" style={{ borderColor: bucket.color + "30", backgroundColor: bucket.bg }}>
                      <h4 className="font-bold text-gray-900 text-sm mb-2">{item.name}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{item.def}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.kpis.map((kpi) => (
                          <span key={kpi} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: bucket.color + "20", color: bucket.color }}>{kpi}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <IndustryMicrosoft industry="bpo" />
      <IndustryFinalCTA industry="bpo" />
      <IndustryFooter />
    </div>
  );
}