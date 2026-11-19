import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingFinalCTA() {
  return (
    <section className="py-24" style={{ backgroundColor: "#0202ff" }}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl lg:text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
          Start with the manager you're worried about.
        </h2>
        <p className="mt-5 text-blue-100 text-lg leading-relaxed max-w-2xl mx-auto">
          One manager, one real situation, eight minutes. You'll see exactly what the check reveals
          — and what your organisation would be able to prove if every manager did it.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/diagnostic"
            className="inline-flex items-center justify-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            style={{ color: "#0202ff" }}
          >
            Take the 8-minute manager check
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://cal.com/curiosityled/bookdemo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-transparent font-bold text-sm px-8 py-4 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-all"
          >
            Book a walkthrough
          </a>
        </div>

        <p className="mt-5 text-xs text-blue-200">
          No account required for the check. No pitch on the walkthrough.
        </p>
      </div>
    </section>
  );
}