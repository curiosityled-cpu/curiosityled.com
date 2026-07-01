import React, { useEffect } from "react";
import { ArrowRight, AlertTriangle, TrendingDown, Users, BarChart3, Clock, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import LandingNav from "@/components/landing/LandingNav";
import IndustryTrustStrip from "@/components/landing/IndustryTrustStrip";
import IndustryFooter from "@/components/landing/IndustryFooter";

const PATTERNS = [
  {
    bucket: "Operational Risk",
    color: "#ef4444",
    bg: "#fff1f1",
    items: [
      { name: "Reactive Leadership", kpis: ["SLA Adherence", "Escalation Rate"], def: "Leaders respond only when metrics breach thresholds — no proactive coaching rhythm in place." },
      { name: "Metric Myopia", kpis: ["AHT", "QA Score"], def: "Over-focus on one KPI (e.g. AHT) at the expense of holistic team performance and morale." },
      { name: "Accountability Gap", kpis: ["Escalation Rate", "FCR"], def: "Low ownership of outcomes; team members lack clear expectations tied to observable behaviour." },
    ],
  },
  {
    bucket: "People Risk",
    color: "#f59e0b",
    bg: "#fffbeb",
    items: [
      { name: "Attrition Risk Behaviour", kpis: ["Attrition Rate", "Morale"], def: "Signals of disengagement, lack of recognition, or one-way communication from the team leader." },
      { name: "Coaching Deficit", kpis: ["QA Drift", "FCR"], def: "Insufficient or inconsistent coaching conversations — feedback loops are broken or absent." },
      { name: "Performance Avoidance", kpis: ["QA Score", "SLA"], def: "Leaders delay or avoid difficult performance conversations, allowing gaps to compound." },
    ],
  },
  {
    bucket: "Execution Risk",
    color: "#0202ff",
    bg: "#eef0ff",
    items: [
      { name: "Delegation Failure", kpis: ["Capacity Utilisation", "AHT"], def: "Work remains at the leader level; team is under-utilised and growth opportunities are lost." },
    ],
  },
];

export default function LandingBPO() {
  useEffect(() => {
    document.title = "BPO & Operations — Curiosity Led";
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
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: "#ef4444" }} />

        <div className="relative max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded-full mb-6">BPO &amp; Operations</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6"
              >
                Spot leadership risk{" "}
                <span style={{ color: "#0202ff" }}>before it hits your SLA.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-lg text-gray-600 leading-relaxed mb-8 font-medium"
              >
                Curiosity Led maps leadership behaviour patterns directly to your BPO operational metrics — AHT, FCR, QA drift, escalation rates, and attrition — so you can coach faster and react earlier.
              </motion.p>
              <motion.ul
                className="space-y-3 mb-10"
                initial="hidden"
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } } }}
              >
                {[
                  "Replace subjective scorecards with objective leadership signals.",
                  "See the seven BPO leadership risk patterns before they compound.",
                  "Coach in the flow of work — inside Microsoft Teams.",
                ].map((b, i) => (
                  <motion.li key={i} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#0202ff" }}>✓</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.1 }} className="flex flex-col sm:flex-row gap-3">
                <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90" style={{ backgroundColor: "#0202ff" }}>
                  Start a 12-week pilot <ArrowRight className="w-4 h-4" />
                </a>
                <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Book a demo
                </a>
              </motion.div>
            </div>

            {/* Right: KPI Dashboard Mockup */}
            <motion.div initial={{ opacity: 0, x: 80, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }} className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-[200px] mx-auto text-center">app.curiosityled.com · BPO Operations</div>
                  </div>
                </div>
                <div className="bg-white p-4 h-[400px] overflow-hidden">
                  <div className="text-sm font-bold text-gray-900 mb-1">Operations Risk Intelligence</div>
                  <div className="text-[10px] text-gray-500 mb-3">Live leadership pattern detection · 14 team leaders</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "SLA Adherence", value: "91%", color: "#16a34a", trend: "↑" },
                      { label: "Active Patterns", value: "4", color: "#ef4444", trend: "↓ needed" },
                      { label: "FCR Rate", value: "78%", color: "#f59e0b", trend: "~" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                        <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
                    <div className="px-3 py-2 border-b border-gray-100"><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Active Risk Patterns</span></div>
                    {[
                      { name: "Reactive Leadership", leader: "L. Park", kpi: "SLA ↓ 4pts", color: "#ef4444" },
                      { name: "Coaching Deficit", leader: "M. Torres", kpi: "QA drift 3wk", color: "#f59e0b" },
                      { name: "Attrition Risk", leader: "D. Osei", kpi: "Morale signal", color: "#f59e0b" },
                    ].map((p) => (
                      <div key={p.name} className="px-3 py-2 flex items-center justify-between border-b border-gray-50 last:border-0">
                        <div>
                          <div className="text-[11px] font-semibold text-gray-800">{p.name}</div>
                          <div className="text-[9px] text-gray-400">{p.leader} · {p.kpi}</div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: p.color + "20", color: p.color }}>Active</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#eef0ff] rounded-lg px-3 py-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: "#0202ff" }}>✦</div>
                    <div className="text-[10px] text-[#0202ff] font-medium">Coaching flow ready for L. Park — sent via Teams</div>
                  </div>
                </div>
              </div>
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 1.6 }} className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#16a34a" }}>↑</div>
                <div>
                  <div className="text-xs font-bold text-gray-900">SLA recovering</div>
                  <div className="text-[10px] text-gray-500">Pattern flagged 9 days before breach</div>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The BPO leadership problem</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">BPO operations manage performance through dashboards, but miss the leadership signals that actually drive those numbers.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: AlertTriangle, title: "The Subjectivity Trap", color: "#ef4444", desc: "Performance management relies on fragmented scorecards and manager memory — creating a trust gap and inconsistent coaching that prevents you from seeing trends until they've already hit your SLA." },
              { icon: TrendingDown, title: "The Firefighting Cycle", color: "#f59e0b", desc: "Frontline managers are constantly reacting — monitoring AHT, QA, escalations in real-time. Without bridging leadership behaviour to operational KPIs, support stays reactive and your best agents leave." },
              { icon: Users, title: "Coaching at Scale Fails", color: "#0202ff", desc: "With 10–20+ team leaders, HR and Ops leaders can't see who is coaching well, who is avoiding difficult conversations, and where the next attrition spike is brewing." },
              { icon: BarChart3, title: "Metrics Without Context", color: "#6366f1", desc: "You see a QA dip — but not why. Curiosity Led surfaces the leadership pattern underneath the metric so your intervention can target the root cause, not the symptom." },
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

      {/* Seven Patterns Matrix */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Seven BPO Leadership Patterns</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Each pattern is mapped to the operational KPIs it most directly affects — so every coaching action is grounded in business impact.</p>
          </div>
          <div className="space-y-8">
            {PATTERNS.map((bucket) => (
              <div key={bucket.bucket}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: bucket.color }}>{bucket.bucket}</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {bucket.items.map((item) => (
                    <div key={item.name} className="rounded-xl border p-5" style={{ borderColor: bucket.color + "30", backgroundColor: bucket.bg }}>
                      <h4 className="font-bold text-gray-900 text-sm mb-2">{item.name}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{item.def}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.kpis.map((kpi) => (
                          <span key={kpi} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: bucket.color + "20", color: bucket.color }}>{kpi}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
          <h2 className="text-3xl font-bold text-white mb-4">BPO managers live in Teams. So do we.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">Receive risk nudges, view your daily priority dashboard, and access coaching flows without ever switching windows or logging into a heavy portal. Curiosity Led meets your team where work happens.</p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { title: "Pattern Alerts in Teams", desc: "Get a nudge when a leadership risk pattern is detected — right in your Teams sidebar, not a separate app." },
              { title: "Coaching Flows On Demand", desc: "Each pattern triggers a pre-built, lightweight coaching checklist your team lead can action immediately." },
              { title: "Daily Rhythm Without the Portal", desc: "Check-ins, priorities, and progress tracking happen in the tools your managers already use daily." },
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
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">Ready to see leadership risk before it hits your SLA?</h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">Start a 12-week pilot and see how Curiosity Led surfaces the seven BPO leadership patterns — mapped directly to your operational metrics.</p>
          <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg" style={{ color: "#0202ff" }}>
            Start a 12-week pilot <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <IndustryFooter />
    </div>
  );
}