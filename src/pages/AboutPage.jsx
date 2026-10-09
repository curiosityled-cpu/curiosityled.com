import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">About</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] leading-tight mb-8">
            Why I built Curiosity Led
          </h1>

          {/* Founder block — TODO: replace bracketed placeholders with real details */}
          <div className="flex flex-col sm:flex-row gap-8 mb-12">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                [Founder photo]
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0a0a0a] mb-1">[Founder Name]</h2>
              <p className="text-sm text-gray-500 mb-4">Founder, Curiosity Led</p>
              <a
                href="[LINKEDIN_URL]"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#0202ff] hover:underline"
              >
                Connect on LinkedIn →
              </a>
            </div>
          </div>

          {/* Founder voice — TODO: replace with real founder narrative */}
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              [One to two paragraphs in the founder's own voice: why you started Curiosity Led, what you saw in the market that was broken, and what you believe about how manager development should work.]
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              [Second paragraph: what you're building, who it's for, and what success looks like — in plain language, not marketing copy.]
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <a
              href="https://cal.com/curiosityled/bookdemo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#0202ff" }}
            >
              Book a demo
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}