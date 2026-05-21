import React from "react";
import { ArrowRight } from "lucide-react";

export default function LandingFinalCTA() {
  return (
    <section className="py-24 bg-[#0202ff]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
          See how Curiosity Led fits into your leadership and succession strategy.
        </h2>
        <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          Whether you are trying to support new managers, strengthen your bench, or make leadership development easier to measure, Curiosity Led helps bring it into one clearer system.
        </p>
        <a
          href="https://cal.com/curiosityled/bookdemo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
          style={{ color: "#0202ff" }}
        >
          Book a demo
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
}