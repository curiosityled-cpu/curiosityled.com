import React from "react";

const DEMO_URL = "https://cal.com/curiosityled/discoverycall";

const SignalCard = ({ label, value, color, sub }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`w-2 h-2 rounded-full ${color}`} />
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
    {sub && <div className="text-xs text-gray-400">{sub}</div>}
  </div>
);

export default function LandingHero() {
  const scrollToHowItWorks = () => {
    document.getElementById("home-how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home-hero"
      className="pt-32 pb-20 px-6 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0202FF] mb-5">
              For healthcare organizations
            </p>
            <h1 className="text-4xl lg:text-5xl font-serif font-bold text-gray-950 leading-tight mb-6">
              Spot manager risk signals early before they show up in retention, readiness, and team performance.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              One clearer system for manager support, progress, and leadership visibility.
            </p>
            <p className="text-base text-gray-500 leading-relaxed mb-8">
              Curiosity Led helps HR and Talent teams identify risk earlier, support new leaders in the flow of work, and track progress in one leadership view.
            </p>

            {/* Bullets */}
            <ul className="space-y-2.5 mb-10">
              {[
                "Earlier signals of leadership risk",
                "Support in the moment of need",
                "One clear view for HR",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0202FF] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 rounded-md text-sm font-semibold bg-[#0202FF] text-white hover:bg-[#0000dd] transition-colors"
              >
                Book a demo
              </a>
              <button
                onClick={scrollToHowItWorks}
                className="text-sm font-medium text-gray-700 hover:text-[#0202FF] transition-colors underline underline-offset-4"
              >
                See how it works
              </button>
            </div>
          </div>

          {/* Right: Visual panel */}
          <div className="relative">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leadership Signals</span>
                <span className="text-xs text-gray-400">Q2 · 14 leaders</span>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-5">
                <SignalCard label="At Risk" value="3" color="bg-red-400" sub="Newly promoted, signals active" />
                <SignalCard label="Progressing" value="8" color="bg-[#0202FF]" sub="On track with development goals" />
                <SignalCard label="Readiness" value="72%" color="bg-emerald-400" sub="Ready for increased scope" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-500 mb-3">Recent interventions</div>
                <div className="space-y-2">
                  {[
                    { name: "M. Torres", action: "Goal set · 2d ago", status: "blue" },
                    { name: "K. Osei", action: "Session logged · 4d ago", status: "green" },
                    { name: "R. Patel", action: "Risk flagged · today", status: "red" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center font-semibold">
                          {item.name[0]}
                        </div>
                        <span className="text-xs text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating accent chip */}
            <div className="absolute -bottom-4 -left-4 bg-[#0202FF] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
              One leadership view
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}