import React from "react";
import { ArrowRight } from "lucide-react";

export default function LandingFinalCTA() {
  return (
    <section className="py-24 bg-[#0202ff]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
          See where your managers' judgment needs work.
        </h2>
        <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          8 minutes. No commitment, no platform to install. The diagnostic shows you exactly where your managers' judgment is strong and where it needs development — the question every HR team should be able to answer.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/diagnostic"
            className="inline-flex items-center justify-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            style={{ color: "#0202ff" }}
          >
            Take the 8-minute diagnostic
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="https://cal.com/curiosityled/bookdemo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-transparent font-bold text-sm px-8 py-4 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-all"
          >
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}