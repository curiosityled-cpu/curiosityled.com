import React from "react";
import { getIndustryConfig } from "./industryConfig";

const defaultProofPoints = [
  { title: "Development happens after strain is already visible.", body: "Support gets triggered once a behavior has impacted the team — not before." },
  { title: "HR gets disconnected signals instead of one defensible story.", body: "Assessments, coaching, and goals sit in different places, making impact hard to explain." },
  { title: "Succession discussions begin without enough visibility.", body: "Readiness conversations start without a clear view of bench strength or progression." },
];

const defaultHeading = "Most leadership development starts too late and stays too fragmented.";
const defaultIntro = "Healthcare organizations are already investing in manager development, coaching, and assessments. The challenge is that support often sits outside the flow of work, leadership signals are scattered across systems, and succession conversations start without a clear view of readiness or progress.";
const defaultImage = "/web_overworked_CREDIT-PeopleImages_iStock-654187068.png";
const defaultQuotesLabel = "What we hear from healthcare teams";
const defaultQuotes = [
  { persona: "Manager", quote: "I do not need another program to finish. I need help with what is happening this week." },
  { persona: "HR / Talent", quote: "I have programs and coaching, but no single, defensible leadership story." },
  { persona: "Executive Sponsor", quote: "We are investing in leadership, but succession conversations still start without a clear picture of who is ready." },
];

export default function LandingProblem({ industry }) {
  const cfg = industry ? getIndustryConfig(industry) : null;
  const ps = cfg?.problemSection;

  const heading = ps?.heading || defaultHeading;
  const intro = ps?.intro || defaultIntro;
  const image = ps?.image || defaultImage;
  const proofPoints = ps?.proofPoints || defaultProofPoints;
  const quotesLabel = ps?.quotesLabel || defaultQuotesLabel;
  const quotes = ps?.quotes || defaultQuotes;

  return (
    <section className="py-24 bg-[#1a1a2e]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-white/20 bg-white/10">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">The problem</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">{heading}</h2>
            <p className="text-gray-200 text-lg leading-relaxed mb-8">{intro}</p>
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img src={image} alt="Overworked manager" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {proofPoints.map((p, i) => (
            <div key={i} className="rounded-2xl border border-white/15 p-6 flex flex-col gap-3" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                <span className="text-white text-sm font-bold">{i + 1}</span>
              </div>
              <div className="text-white font-semibold text-sm leading-snug">{p.title}</div>
              <div className="text-gray-300 text-sm leading-relaxed">{p.body}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">{quotesLabel}</div>
          <div className="rounded-3xl border border-white/20 p-8 md:p-10" style={{ backgroundColor: "rgba(60,55,90,0.5)" }}>
            <div className="grid md:grid-cols-3 gap-8">
              {quotes.map((q, i) => (
                <div key={i} className="flex flex-col">
                  <div className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-300">{q.persona}</div>
                  <blockquote className="text-gray-100 text-sm leading-relaxed italic font-light">"{q.quote}"</blockquote>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}