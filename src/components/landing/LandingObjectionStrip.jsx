import React from "react";
import { getIndustryConfig } from "./industryConfig";

const defaultText =
  "Already have leadership programs, assessments, or a competency model? Curiosity Led helps bring them into one clearer system for action, readiness, and visibility.";

export default function LandingObjectionStrip({ industry }) {
  const cfg = industry ? getIndustryConfig(industry) : null;
  const text = cfg?.objectionStrip || defaultText;

  // Bold the question portion (up to and including the first "?")
  const qIdx = text.indexOf("?");
  const boldPart = qIdx >= 0 ? text.slice(0, qIdx + 1) : text;
  const restPart = qIdx >= 0 ? text.slice(qIdx + 1) : "";

  return (
    <div className="bg-[#eef0ff] border-y border-[#c7ccff] py-5 px-6">
      <p className="text-center text-sm text-[#0a0a2e] max-w-2xl mx-auto leading-relaxed">
        <span className="font-semibold">{boldPart}</span>
        {restPart}
      </p>
    </div>
  );
}