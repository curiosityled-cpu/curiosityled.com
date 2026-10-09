import React, { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

export default function AboutPage() {
  useEffect(() => {
    setPageSEO(
      "About Curiosity Led — Founder & Mission",
      "Meet the founder of Curiosity Led — why we built a manager intelligence platform that develops judgment and proves it changed, inside the flow of work."
    );
    return () => { document.title = "Curiosity Led"; };
  }, []);

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

          {/* Founder block */}
          <div className="flex flex-col sm:flex-row gap-8 mb-12">
            <div className="flex-shrink-0">
              <img
                src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/f336eb700_g6u1oy.jpg"
                alt="Emilio Osoria, Founder of Curiosity Led"
                className="w-32 h-32 rounded-2xl object-cover border border-gray-200"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0a0a0a] mb-1">Emilio Osoria</h2>
              <p className="text-sm text-gray-500 mb-4">Founder, Curiosity Led</p>
              <a
                href="https://www.linkedin.com/in/emilioosoria"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#0202ff] hover:underline"
              >
                Connect on LinkedIn →
              </a>
            </div>
          </div>

          {/* Founder voice */}
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              I started Curiosity Led because manager development is broken. Organizations spend billions on training, coaching, and assessments every year. Almost none of it produces evidence that anything actually changed. Managers sit through workshops, get assessed, and return to the same habits. The tools meant to help produce activity metrics — courses completed, sessions attended, hours logged — not proof of better judgment. I kept seeing the same gap in every organization I worked with: investment without evidence, activity without outcomes, and managers who needed support in the moment but got it weeks too late.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              Curiosity Led is what I wish I had when I was building and leading teams. It is a manager intelligence platform that develops better judgment and proves it changed. It works inside the tools managers already use — Teams, Slack, email — so support arrives in the flow of work, not in a separate portal nobody opens. It is built for HR, Talent, and L&D leaders who are tired of defending programs with anecdotes. Success looks simple: a manager makes a better decision this week than last week, and you can see it in the data.
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