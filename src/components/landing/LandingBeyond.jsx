import React from "react";
import { X, Check } from "lucide-react";
import { getIndustryConfig } from "./industryConfig";

const defaultNotList = [
  "Another LMS or e-learning platform",
  "Another standalone coaching app",
  "Another 360 or assessment tool",
  "Another 1:1 or check-in tool",
];

const defaultIsList = [
  "The intelligence layer that makes your existing tools produce evidence",
  "Conversational learning, coaching flows, and a built-in AI coach — in Teams, Slack, and email",
  "A closed loop: commit → act → follow up → evidence of change",
  "Consolidates 6–8 point tools into one layer. Net tool count goes down.",
];

export default function LandingBeyond({ industry }) {
  const cfg = industry ? getIndustryConfig(industry) : null;
  const b = cfg?.beyond;

  const label = b?.label || "Why it's different";
  const heading = b?.heading || "Not another tool. The layer that makes your tools produce evidence.";
  const intro = b?.intro || "Skillsoft builds skills. Zensai delivers in Teams. Workday owns enterprise context. Curiosity Led owns the one thing they can't assemble: understanding of managerial judgment and evidence that it changed. It consolidates the point tools you're already paying for and makes them produce evidence instead of activity.";
  const notList = b?.notList || defaultNotList;
  const isList = b?.isList || defaultIsList;

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">{label}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4 leading-tight">{heading}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">{intro}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">We are not</div>
              <ul className="space-y-3">
                {notList.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                      <X className="w-3 h-3 text-red-400" />
                    </div>
                    <span className="text-gray-500 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border p-6" style={{ backgroundColor: "#eef0ff", borderColor: "#c7ccff" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#0202ff" }}>We are</div>
              <ul className="space-y-3">
                {isList.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#0202ff" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium" style={{ color: "#0a0a2e" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}