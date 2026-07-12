import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getIndustryConfig } from "@/components/landing/industryConfig";

const DEFAULT_FAQ = {
  eyebrow: "Common questions",
  headline: "Frequently Asked Questions",
  subtext: "Answers to the questions HR and talent leaders actually ask.",
  items: [
    {
      q: "What is Curiosity Led?",
      a: "Curiosity Led is a leadership support and visibility platform built to help organizations support managers earlier, inside the flow of work, while giving HR and executives a clearer view of risk, readiness, and progress in one place.",
    },
    {
      q: "Who is Curiosity Led for?",
      a: "It is designed for HR, Talent, and executive leaders who need a more defensible leadership story, and for managers who need timely support with real leadership moments instead of another disconnected program.",
    },
    {
      q: "Will managers actually use it?",
      a: "The experience is built around real leadership moments, so support feels timely and useful rather than like another program to complete. Managers see practical next steps tied to what they are handling right now.",
    },
    {
      q: "How is this different from traditional training, coaching, or an LMS?",
      a: "Curiosity Led connects assessment, action, and progress into one clearer leadership story instead of scattering signals across separate systems, and it focuses on in-the-workflow support rather than only courses or sessions.",
    },
    {
      q: "Can we prove impact more clearly?",
      a: "Yes. Curiosity Led is designed to help HR and leaders tie development activity to one clearer leadership narrative, showing where managers are at risk, how support is landing, and where intervention should happen next.",
    },
    {
      q: "Will this create more admin work for HR and Talent?",
      a: "No. The system is designed to reduce fragmentation and give HR a more scalable way to support manager cohorts, by pulling assessments, goals, and signals into one place instead of adding another disconnected tool.",
    },
    {
      q: "Will this fit our existing leadership framework or competency model?",
      a: "Yes. Curiosity Led can align to your organization's existing competency model, including established frameworks, or use its built-in competency library, so you do not have to replace the leadership language you already use.",
    },
    {
      q: "What do individual managers see versus HR and executives?",
      a: "Managers get a private development view focused on their own strengths, patterns, and next steps, while HR and executives see aggregated trends, readiness signals, and cohort-level visibility rather than raw individual responses.",
    },
    {
      q: "Which segments does Curiosity Led support today?",
      a: "Curiosity Led is built for healthcare organizations, BPO and contact center teams, and coaching and consulting firms, with focused pilots and language tailored to each segment's leadership and workforce stability challenges.",
    },
    {
      q: "How is the pilot priced, and what is the guarantee?",
      a: "Pilots are priced to sit below the cost of one bad leadership outcome in each segment, with a clear guarantee that by the end of the pilot you will have a clearer, defensible view of where support is needed next—or the pilot is extended at no additional cost.",
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