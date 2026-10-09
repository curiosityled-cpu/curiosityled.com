import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageSEO } from "@/lib/seo";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

const COMPARISONS = [
  {
    objection: "We already have an LMS. Why do we need another platform?",
    title: "Curiosity Led vs an LMS",
    alt: "an LMS",
    rows: [
      { lms: "Tracks course completions", cl: "Tracks judgment change" },
      { lms: "Asks 'did they finish the module?'", cl: "Asks 'did the manager get better?'" },
      { lms: "Content sits in a portal", cl: "Support arrives in Teams, Slack, email" },
      { lms: "Activity metrics", cl: "Evidence of behavioral change" },
    ],
    takeaway: "An LMS delivers courses. Curiosity Led delivers better judgment. They are not the same job.",
  },
  {
    objection: "We already invest in coaching. Won't this replace it?",
    title: "Curiosity Led vs a coaching app",
    alt: "a coaching app",
    rows: [
      { lms: "Connects coaches to coachees", cl: "Extends coaching between sessions" },
      { lms: "336 hours of gap between sessions", cl: "Daily rhythm keeps momentum" },
      { lms: "Self-reported progress", cl: "Objective follow-through data" },
      { lms: "Sponsors see session counts", cl: "Sponsors see behavior change" },
    ],
    takeaway: "Coaching apps manage the session. Curiosity Led manages the 336 hours between sessions.",
  },
  {
    objection: "We already do 360 reviews. What does this add?",
    title: "Curiosity Led vs a 360 tool",
    alt: "a 360 tool",
    rows: [
      { lms: "Annual snapshot", cl: "Weekly running signal" },
      { lms: "Tells you what people think", cl: "Tells you what the manager does" },
      { lms: "A photograph", cl: "A video" },
      { lms: "Feedback after the fact", cl: "Support in the moment" },
    ],
    takeaway: "A 360 is a photograph. Curiosity Led is a video. You need both, but only one helps you intervene in time.",
  },
];

export default function ComparePage() {
  useEffect(() => {
    setPageSEO(
      "Curiosity Led vs LMS, Coaching Apps & 360 Tools — Curiosity Led",
      "How Curiosity Led differs from an LMS, a coaching app, and a 360 review tool. It develops manager judgment and proves it changed — inside the flow of work."
    );
    return () => { document.title = "Curiosity Led"; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">How we're different</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] leading-tight mb-6">
            Curiosity Led vs the tools you already have
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed mb-12 max-w-2xl">
            Curiosity Led is a manager intelligence platform. It is not an LMS, a coaching app, or a 360 tool. Here is how it differs from each, and why the difference matters.
          </p>

          <div className="space-y-16">
            {COMPARISONS.map((c, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-[#0202ff] mb-2">The objection</p>
                <p className="text-lg text-gray-700 italic mb-6">"{c.objection}"</p>
                <h2 className="text-2xl font-bold text-[#0a0a0a] mb-6">{c.title}</h2>

                <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6">
                  <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
                    <div className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">{c.alt}</div>
                    <div className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#0202ff]">Curiosity Led</div>
                  </div>
                  {c.rows.map((r, j) => (
                    <div key={j} className="grid grid-cols-2 border-b border-gray-100 last:border-0">
                      <div className="px-5 py-4 flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{r.lms}</span>
                      </div>
                      <div className="px-5 py-4 flex items-start gap-2 bg-blue-50/30">
                        <CheckCircle className="w-4 h-4 text-[#0202ff] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-900 font-medium">{r.cl}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-base text-gray-700 leading-relaxed">{c.takeaway}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-gray-100">
            <p className="text-lg text-gray-700 mb-6">
              See it for yourself. Take the 8-minute diagnostic or book a demo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/diagnostic"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#0202ff" }}
              >
                Take the 8-minute diagnostic
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://cal.com/curiosityled/bookdemo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                Book a demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}