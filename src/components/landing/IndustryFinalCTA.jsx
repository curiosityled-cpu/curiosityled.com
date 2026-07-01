import React from "react";
import { ArrowRight } from "lucide-react";
import { getIndustryConfig } from "./industryConfig";

export default function IndustryFinalCTA({ industry }) {
  const cfg = getIndustryConfig(industry);
  const { finalCta } = cfg;

  return (
    <section className="py-24 bg-[#0202ff]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
          {finalCta.headline}
        </h2>
        <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          {finalCta.subtext}
        </p>
        <a
          href={finalCta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
          style={{ color: "#0202ff" }}
        >
          {finalCta.buttonLabel}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
}