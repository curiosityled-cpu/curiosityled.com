import React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

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
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6"
            >
              Spot leadership risk{" "}
              <span style={{ color: "#0202ff" }}>before it hits your metrics.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg text-gray-600 leading-relaxed mb-8 font-medium"
            >
              Earlier signals. In-workflow support. Clearer leadership visibility.
            </motion.p>

            {/* Bullets */}
            <motion.ul
              className="space-y-3 mb-10"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } }
              }}
            >
              {[
                "Support at\u2011risk managers before issues escalate.",
                "Deliver coaching and learning in the flow of work.",
                "Give one shared view of progress, readiness, and where to intervene.",
              ].map((b, i) => (
                <motion.li
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    ✓
                  </span>
                  <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                </motion.li>
              ))}
            </motion.ul>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a
                href="https://calendly.com/team-curiosityled/discoverycall"
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
            </motion.div>
          </div>

          {/* Right: App screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
            className="relative lg:block"
          >
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
              {/* App UI mockup — Leadership Risk Intelligence view */}
              <div className="bg-white">
                <div className="flex h-[420px]">
                  {/* Main content — Risk Intelligence Dashboard */}
                  <div className="flex-1 p-4 bg-gray-50 overflow-hidden">
                    <div className="text-sm font-bold text-gray-900 mb-0.5">Leadership Intelligence</div>
                    <div className="text-[10px] text-gray-500 mb-3">Organisation-wide risk & readiness snapshot</div>

                    {/* Top stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "At-Risk Managers", value: "3", color: "#ef4444" },
                        { label: "Interventions Active", value: "7", color: "#0202ff" },
                        { label: "Readiness Score", value: "74%", color: "#16a34a" },
                      ].map((s) => (
                        <div key={s.label} className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 text-center">
                          <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* At-risk manager list */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
                      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Flagged This Week</span>
                        <span className="text-[9px] text-red-500 font-semibold">3 managers</span>
                      </div>
                      {[
                        { name: "J. Martinez", risk: "High", signal: "Missed 3 check-ins", color: "#ef4444" },
                        { name: "T. Okafor", risk: "Medium", signal: "Goal stall · 6 weeks", color: "#f59e0b" },
                        { name: "S. Chen", risk: "Medium", signal: "Low engagement trend", color: "#f59e0b" },
                      ].map((m) => (
                        <div key={m.name} className="px-3 py-2 flex items-center justify-between border-b border-gray-50 last:border-0">
                          <div>
                            <div className="text-[11px] font-semibold text-gray-800">{m.name}</div>
                            <div className="text-[9px] text-gray-400">{m.signal}</div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: m.color + "20", color: m.color }}>
                            {m.risk}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Intervention progress */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2">
                      <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2">Intervention Progress</div>
                      {[
                        { label: "Coaching assigned", pct: 85 },
                        { label: "Learning in flow", pct: 62 },
                      ].map((p) => (
                        <div key={p.label} className="mb-1.5">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px] text-gray-500">{p.label}</span>
                            <span className="text-[9px] font-semibold text-gray-700">{p.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: "#0202ff" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#0202ff" }}>
                ↑
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900">Risk detected early</div>
                <div className="text-[10px] text-gray-500">Intervention triggered before escalation</div>
              </div>
            </motion.div>
          </motion.div>
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