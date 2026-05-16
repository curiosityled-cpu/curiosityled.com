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
            {/* Label */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
              <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
              <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">
                Built for healthcare organizations
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6">
              Spot manager risk signals early,{" "}
              <span style={{ color: "#0202ff" }}>before that risk shows up</span>{" "}
              in retention, readiness, and team performance.
            </h1>

            {/* Subheadline */}
            <p className="text-lg text-gray-500 leading-relaxed mb-4 font-medium">
              For healthcare organizations that need earlier leadership signals and one clearer story of manager progress, intervention, and impact.
            </p>

            {/* Support paragraph */}
            <p className="text-base text-gray-500 leading-relaxed mb-8">
              Curiosity Led helps HR and Talent teams identify at-risk new leaders sooner, deliver support in the flow of work, and track progress in one leadership view—so development is no longer reactive, fragmented, or impossible to defend.
            </p>

            {/* Bullets */}
            <ul className="space-y-3 mb-10">
              {[
                "See earlier signals of leadership risk and overload.",
                "Support managers in the moment of need, not after the damage is done.",
                "Give HR one clear system for progress, readiness, and intervention visibility.",
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

          {/* Right: App screenshot */}
          <div className="relative lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
              {/* Browser chrome */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-[200px] mx-auto text-center">
                    app.curiosityled.com
                  </div>
                </div>
              </div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
                alt="Curiosity Led app"
                className="w-full hidden"
              />
              {/* App UI mockup using actual app colors */}
              <div className="bg-white">
                {/* Sidebar + content layout */}
                <div className="flex h-[420px]">
                  {/* Sidebar */}
                  <div className="w-52 bg-[#0f0f1a] flex flex-col py-4 flex-shrink-0">
                    <div className="px-4 mb-6 flex items-center gap-2">
                      <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be036d547_CuriosityLedIcon_20241030_085533_0000.png"
                        alt=""
                        className="w-6 h-6"
                      />
                      <span className="text-white text-xs font-bold">Curiosity Led</span>
                    </div>
                    {[
                      { label: "My Leadership", active: true },
                      { label: "Development Manager", active: false },
                      { label: "Goal Manager", active: false },
                      { label: "Report Builder", active: false },
                      { label: "User Management", active: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`px-4 py-2 mx-2 rounded-lg mb-1 text-xs ${
                          item.active
                            ? "text-[#0202ff] bg-blue-900/20 font-semibold"
                            : "text-gray-400"
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-5 bg-gray-50 overflow-hidden">
                    <div className="text-lg font-bold text-gray-900 mb-1">My Leadership</div>
                    <div className="text-xs text-gray-500 mb-4">Here's your leadership snapshot.</div>

                    {/* Archetype card */}
                    <div className="rounded-xl overflow-hidden mb-3 shadow-sm">
                      <div className="bg-[#0202ff] px-4 py-3">
                        <div className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider mb-1">
                          YOUR LEADERSHIP ARCHETYPE
                        </div>
                        <div className="text-white font-bold text-sm">The Performance Catalyst</div>
                      </div>
                      <div className="bg-white px-4 py-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Core Strengths</div>
                            <div className="text-[11px] text-gray-700">• Communication (80%)</div>
                            <div className="text-[11px] text-gray-700">• Situational Intelligence (75%)</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Growth Areas</div>
                            <div className="text-[11px] text-gray-700">• Resource Management (65%)</div>
                            <div className="text-[11px] text-gray-700">• Performance Mgmt (70%)</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Goals", value: "3", sub: "Active" },
                        { label: "Journeys", value: "5", sub: "In Progress" },
                        { label: "Risk Level", value: "Low", sub: "On Track" },
                      ].map((s) => (
                        <div key={s.label} className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
                          <div className="text-xs font-bold text-gray-900">{s.value}</div>
                          <div className="text-[10px] text-gray-500">{s.label}</div>
                          <div
                            className="text-[9px] font-medium mt-0.5"
                            style={{ color: "#0202ff" }}
                          >
                            {s.sub}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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
            Designed for healthcare organizations developing newly promoted and newly hired leaders. Early programs indicate stronger engagement, lower admin burden, and clearer links between development activity and leadership visibility.
          </p>
        </div>
      </div>
    </section>
  );
}