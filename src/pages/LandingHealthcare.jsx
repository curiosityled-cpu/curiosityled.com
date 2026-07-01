import React, { useEffect } from "react";
import { ArrowRight, Heart, Shield, Users, Activity, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import LandingNav from "@/components/landing/LandingNav";
import IndustryTrustStrip from "@/components/landing/IndustryTrustStrip";
import IndustryFooter from "@/components/landing/IndustryFooter";

export default function LandingHealthcare() {
  useEffect(() => {
    document.title = "Healthcare — Curiosity Led";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 overflow-hidden bg-white">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: "#10b981" }} />

        <div className="relative max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-6">Healthcare</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6"
              >
                Support the people{" "}
                <span style={{ color: "#0202ff" }}>who carry care.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-lg text-gray-600 leading-relaxed mb-8 font-medium"
              >
                Frontline healthcare leaders carry extraordinary weight. Curiosity Led gives them a grounded, private daily rhythm — surfacing overload signals and supporting development without adding burden or surveillance.
              </motion.p>
              <motion.ul
                className="space-y-3 mb-10"
                initial="hidden"
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } } }}
              >
                {[
                  "Spot overload and burnout risk early — before it affects patient care.",
                  "Build psychological safety through low-burden, private check-ins.",
                  "Strengthen manager readiness and succession visibility for HR and Talent teams.",
                ].map((b, i) => (
                  <motion.li key={i} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#0202ff" }}>✓</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.1 }} className="flex flex-col sm:flex-row gap-3">
                <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90" style={{ backgroundColor: "#0202ff" }}>
                  Book a demo <ArrowRight className="w-4 h-4" />
                </a>
                <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  See how it works
                </a>
              </motion.div>
            </div>

            {/* Right: Healthcare Dashboard Mockup */}
            <motion.div initial={{ opacity: 0, x: 80, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }} className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-[200px] mx-auto text-center">app.curiosityled.com · Healthcare</div>
                  </div>
                </div>
                <div className="bg-white p-4 h-[400px] overflow-hidden">
                  <div className="text-sm font-bold text-gray-900 mb-1">Frontline Leader Support</div>
                  <div className="text-[10px] text-gray-500 mb-3">Workforce stability &amp; readiness snapshot · 22 managers</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Overload Signals", value: "2", color: "#f59e0b" },
                      { label: "Readiness Score", value: "81%", color: "#16a34a" },
                      { label: "Succession Gaps", value: "3", color: "#0202ff" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                        <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
                    <div className="text-[10px] font-bold text-amber-700 mb-1">⚠ Overload Watch — Charge Nurse Unit 4</div>
                    <div className="text-[9px] text-amber-600">High meeting load + low recovery signals for 8 days. Suggested: check-in conversation this week.</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
                    <div className="px-3 py-2 border-b border-gray-100"><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Leadership Readiness</span></div>
                    {[
                      { name: "A. Williams, RN Lead", readiness: "High", track: "On succession track", color: "#16a34a" },
                      { name: "B. Patel, Charge Nurse", readiness: "Developing", track: "Overload pattern active", color: "#f59e0b" },
                      { name: "C. Reyes, Unit Coord.", readiness: "High", track: "Ready for next role", color: "#16a34a" },
                    ].map((m) => (
                      <div key={m.name} className="px-3 py-2 flex items-center justify-between border-b border-gray-50 last:border-0">
                        <div>
                          <div className="text-[11px] font-semibold text-gray-800">{m.name}</div>
                          <div className="text-[9px] text-gray-400">{m.track}</div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: m.color + "20", color: m.color }}>{m.readiness}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 1.6 }} className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#10b981" }}>🛡</div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Private by design</div>
                  <div className="text-[10px] text-gray-500">Managers own their data — always</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <IndustryTrustStrip />

      {/* Problem */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The frontline leadership challenge in healthcare</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Your frontline managers are your most critical and most overlooked leadership layer — carrying clinical responsibility, team wellbeing, and operational continuity simultaneously.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Activity, color: "#ef4444", title: "Overload goes unseen", desc: "Charge nurses and unit coordinators rarely flag their own overload until it becomes a retention or care-quality issue. Curiosity Led surfaces these signals early — privately." },
              { icon: Shield, color: "#10b981", title: "Support, not surveillance", desc: "Healthcare leaders need to feel safe sharing their real state. Our system is built on private, individual data — never monitored by management without consent." },
              { icon: Users, color: "#0202ff", title: "Succession gaps compound silently", desc: "HR and Talent teams often discover succession weaknesses only when a key leader exits. Curiosity Led gives you a live readiness and bench-strength view." },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: p.color + "15" }}>
                    <Icon className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Data Governance */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-6 inline-block">Trust &amp; Data Governance</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for healthcare's privacy standards</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">Curiosity Led was designed with healthcare's data sensitivity in mind. Individual manager data is never surfaced to senior leadership without aggregation — the system supports, not monitors.</p>
              <div className="space-y-4">
                {[
                  { title: "Individual data stays private", desc: "A manager's check-in data, energy signals, and development history belong to them — not to their supervisor or HR by default." },
                  { title: "Aggregated insights for HR", desc: "HR and Talent teams see workforce-level trends — readiness scores, succession gaps, overload patterns — without individual exposure." },
                  { title: "No surveillance architecture", desc: "We don't track productivity or monitor behaviour. Curiosity Led is a support layer, not a performance monitoring system." },
                  { title: "Microsoft-compliant infrastructure", desc: "Built to integrate with your existing Microsoft 365 tenant — using your organisation's security and compliance controls." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: "#10b981" }}>✓</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 border border-emerald-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">How data flows in healthcare</h3>
              <div className="space-y-4">
                {[
                  { who: "The Manager", sees: "Their own patterns, check-ins, development, and growth — fully private.", bg: "#eef0ff", border: "#c7ccff" },
                  { who: "HR & Talent", sees: "Aggregated readiness scores, overload signals, succession bench strength — no individual exposure.", bg: "#f0fdf4", border: "#bbf7d0" },
                  { who: "Senior Leadership", sees: "Workforce stability trends, attrition risk, and readiness gaps — at the cohort or unit level.", bg: "#fffbeb", border: "#fde68a" },
                ].map((row) => (
                  <div key={row.who} className="rounded-xl p-4 border" style={{ backgroundColor: row.bg, borderColor: row.border }}>
                    <div className="text-xs font-bold text-gray-800 mb-1">{row.who}</div>
                    <div className="text-xs text-gray-600 leading-relaxed">{row.sees}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Microsoft Integration */}
      <section className="py-20 bg-[#0f0f1a]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-6">
            <div className="w-5 h-5 rounded-sm bg-[#0078d4] flex items-center justify-center text-white text-[10px] font-bold">T</div>
            <span className="text-white text-xs font-medium">Microsoft Teams Native</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Low-burden rhythm for high-burden leaders.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">Healthcare managers don't have time for another portal. Curiosity Led check-ins, nudges, and development prompts happen directly in Microsoft Teams — where they already communicate.</p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { title: "60-second daily check-ins", desc: "A private energy and focus pulse — surfacing overload before it becomes a patient safety or retention issue." },
              { title: "Coaching in Teams", desc: "Development prompts and leadership support delivered in context, without requiring a separate login or platform switch." },
              { title: "Readiness visible to HR", desc: "As managers develop, their readiness scores update in real-time — giving HR a live succession and bench-strength view." },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h4 className="text-white font-semibold text-sm mb-2">{f.title}</h4>
                <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-[#0202ff]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">Support your frontline managers. Strengthen your bench.</h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">See how Curiosity Led helps healthcare organisations spot overload, build succession readiness, and support frontline leaders — without surveillance or burden.</p>
          <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg" style={{ color: "#0202ff" }}>
            Book a demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <IndustryFooter />
    </div>
  );
}