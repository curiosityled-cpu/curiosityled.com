import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getIndustryConfig } from "@/components/landing/industryConfig";

const DEFAULT_FAQ = {
  eyebrow: "Common questions",
  headline: "Frequently Asked Questions",
  subtext: "Answers to the questions HR teams actually ask.",
  items: [
    {
      q: "Will managers use it?",
      a: "Curiosity Led is designed around real leadership moments, not another course catalog. Managers get timely prompts, goals, and guidance linked to what they are facing that week, inside tools they already use.",
    },
    {
      q: "Can we prove impact?",
      a: "Every assessment, goal, and coaching loop feeds into one leadership view, so you can show how development activity connects to behavior, readiness, and risk instead of relying on anecdotes or scattered spreadsheets.",
    },
    {
      q: "Will this create more admin work?",
      a: "Curiosity Led is built to reduce fragmentation. Assigning cohorts, monitoring progress, and reporting outcomes happen in one place, so HR and L&D spend less time chasing updates and stitching data together.",
    },
    {
      q: "Will executives get a usable view?",
      a: "The Leadership Intelligence Hub summarizes bench strength, risk, and readiness at a glance and shows where intervention is happening, making leadership-development conversations more concrete and defensible.",
    },
  ],
};

export default function LandingFAQ({ industry }) {
  const [open, setOpen] = useState(null);
  const cfg = industry ? getIndustryConfig(industry)?.faq : null;
  const faq = cfg || DEFAULT_FAQ;

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">{faq.eyebrow}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] leading-tight">
            {faq.headline}
          </h2>
          <p className="mt-3 text-gray-500 text-sm">
            {faq.subtext}
          </p>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {faq.items.map((item, i) => (
            <div key={i}>
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900 text-sm">{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}