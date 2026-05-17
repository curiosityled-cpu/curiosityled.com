import React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

export default function LandingHero() {
  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 overflow-hidden bg-white">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Blue accent blob */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "#0202ff" }}
      />

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6">
              Spot leadership risk{" "}
              <span style={{ color: "#0202ff" }}>before it hits your metrics.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-gray-600 leading-relaxed mb-8 font-medium">
              Earlier signals. In-workflow support. Clearer leadership visibility.
            </p>

            {/* Bullets */}
            <ul className="space-y-3 mb-10">
              {[
                "Support at\u2011risk managers before issues escalate.",
                "Deliver coaching and learning in the flow of work.",
                "Give one shared view of progress, readiness, and where to intervene.",
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    ✓
                  </span>
                  <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://cal.com/curiosityled/discoverycall"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#0202ff" }}
              >
                Book a demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={scrollToHow}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                See how it works
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Photo */}
          <div className="relative lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
              <img
                src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/73d48bf76_image.png"
                alt="Leadership team in conversation"
                className="w-full h-[420px] object-cover object-center"
              />
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#0202ff" }}>
                ↑
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Early risk detected</div>
                <div className="text-[10px] text-gray-500">3 managers flagged this week</div>
              </div>
            </div>
          </div>
        </div>

        {/* Proof strip */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400 max-w-2xl mx-auto">
            Designed for healthcare HR and L&D teams. Early programs indicate stronger manager engagement, lower admin burden, and clearer links between development activity and leadership visibility.
          </p>
        </div>
      </div>
    </section>
  );
}