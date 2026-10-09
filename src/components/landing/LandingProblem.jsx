import React from "react";
import { getIndustryConfig } from "./industryConfig";

const defaultProofPoints = [
  { title: "You're already paying for bad management — you just can't see it.", body: "$482B/year in lost productivity, turnover, and stress-related costs. 40–50% of employees would leave over a bad manager. The cost is real; the line item isn't." },
  { title: "No HR team can answer the question that matters most.", body: "“Are our managers getting better?” Assessments, coaching, and 1:1 tools all produce activity data — none of it proves judgment actually changed." },
  { title: "Manager development spend is a black box.", body: "You invest in programs, coaching, and platforms. What you can't show is which managers improved, which didn't, and whether the investment moved anything." },
];

const defaultHeading = "The most expensive thing in your org is the one you can't measure.";
const defaultIntro = "Every organization invests in manager development. Almost none can prove it's working. The cost of bad management is hidden in turnover, disengagement, and failed initiatives. The tools meant to fix it produce activity metrics, not evidence of change.";
const defaultImage = "/web_overworked_CREDIT-PeopleImages_iStock-654187068.png";
const defaultQuotesLabel = "What we hear from healthcare teams";
const defaultQuotes = [
  { persona: "CHRO", quote: "I can tell you what we spent on manager development. I can't tell you whether any of it worked." },
  { persona: "HR / Talent", quote: "We have assessments, coaching, and 1:1 tools. What we don't have is evidence that judgment actually changed." },
  { persona: "Executive Sponsor", quote: "The board asks if our managers are capable. I have activity data. I don't have proof." },
];

export default function LandingProblem({ industry }) {
  const cfg = industry ? getIndustryConfig(industry) : null;
  const ps = cfg?.problemSection;

  const heading = ps?.heading || defaultHeading;
  const intro = ps?.intro || defaultIntro;
  const eyebrow = ps?.eyebrow || "The problem";
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
              <span className="text-xs font-semibold text-white uppercase tracking-wider">{eyebrow}</span>
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

        <p className="text-[10px] text-gray-500 mb-14">
          Sources: Gallup, <em>State of the American Manager</em> (2015). {/* TODO: verify the $482B figure's exact source or replace with a sourced claim */}
        </p>

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