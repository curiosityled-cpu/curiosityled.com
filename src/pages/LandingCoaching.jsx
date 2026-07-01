import React, { useEffect } from "react";
import { ArrowRight, Layers, RefreshCw, Settings, TrendingUp, Repeat, Palette } from "lucide-react";
import { motion } from "framer-motion";
import LandingNav from "@/components/landing/LandingNav";
import IndustryTrustStrip from "@/components/landing/IndustryTrustStrip";
import IndustryFooter from "@/components/landing/IndustryFooter";

export default function LandingCoaching() {
  useEffect(() => {
    document.title = "Coaching & Consulting — Curiosity Led";
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
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: "#6366f1" }} />

        <div className="relative max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-6">Coaching &amp; Consulting Firms</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6"
              >
                Turn your methodology into{" "}
                <span style={{ color: "#0202ff" }}>a daily operating system.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-lg text-gray-600 leading-relaxed mb-8 font-medium"
              >
                Curiosity Led acts as the white-label operating layer behind your firm's IP — delivering your competency models, coaching flows, and leadership frameworks as a daily rhythm your clients actually use between sessions.
              </motion.p>
              <motion.ul
                className="space-y-3 mb-10"
                initial="hidden"
                animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } } }}
              >
                {[
                  "Bridge the gap between episodic coaching sessions with daily continuity.",
                  "Configure your own competency models, frameworks, and branded prompts.",
                  "Scale your methodology across 10 clients or 1,000 — without scaling headcount.",
                ].map((b, i) => (
                  <motion.li key={i} variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#0202ff" }}>✓</span>
                    <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.1 }} className="flex flex-col sm:flex-row gap-3">
                <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90" style={{ backgroundColor: "#0202ff" }}>
                  Explore the partner model <ArrowRight className="w-4 h-4" />
                </a>
                <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Book a demo
                </a>
              </motion.div>
            </div>

            {/* Right: Coaching Firm Mockup */}
            <motion.div initial={{ opacity: 0, x: 80, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }} className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-[220px] mx-auto text-center">YourFirm.curiosityled.com</div>
                  </div>
                </div>
                <div className="bg-white p-4 h-[400px] overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">YF</div>
                    <div className="text-sm font-bold text-gray-900">Your Firm — Partner Dashboard</div>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3">Client engagement overview · 6 active clients</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Active Clients", value: "6", color: "#6366f1" },
                      { label: "Avg. Engagement", value: "87%", color: "#16a34a" },
                      { label: "Between-Session", value: "Daily", color: "#0202ff" },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center">
                        <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-3">
                    <div className="text-[10px] font-bold text-indigo-700 mb-1">✦ Your framework · Active</div>
                    <div className="text-[9px] text-indigo-600">CLARITY Leadership Model configured · 5 competencies · Branded as "Your Firm Intelligence"</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
                    <div className="px-3 py-2 border-b border-gray-100"><span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Client Progress Since Last Session</span></div>
                    {[
                      { name: "Acme Corp — M. Johnson", progress: "3 commitments kept", delta: "+12% clarity", color: "#16a34a" },
                      { name: "BuildCo — T. Singh", progress: "1 commitment shifted", delta: "Decision stall noted", color: "#f59e0b" },
                      { name: "FinServ — D. Osei", progress: "Daily rhythm active", delta: "+8% confidence", color: "#16a34a" },
                    ].map((m) => (
                      <div key={m.name} className="px-3 py-2 flex items-center justify-between border-b border-gray-50 last:border-0">
                        <div>
                          <div className="text-[11px] font-semibold text-gray-800">{m.name}</div>
                          <div className="text-[9px] text-gray-400">{m.progress}</div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: m.color + "20", color: m.color }}>{m.delta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 1.6 }} className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: "#6366f1" }}>IP</div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Your brand. Your framework.</div>
                  <div className="text-[10px] text-gray-500">White-label from day one</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <IndustryTrustStrip />

      {/* The Continuity Problem */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The coaching continuity problem</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Your methodology is powerful. But it only works when clients practise it. Most firms lose ground between sessions — Curiosity Led bridges that gap.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: RefreshCw, color: "#ef4444", title: "The Between-Session Gap", desc: "Clients leave a great coaching session motivated — then return two weeks later having reverted to old patterns. Without daily support, your methodology loses traction between touchpoints." },
              { icon: Layers, color: "#6366f1", title: "Methodology at Scale", desc: "Your frameworks are repeatable, but delivery is constrained by coach hours. Curiosity Led embeds your IP into a daily operating layer — extending your reach without extending your headcount." },
              { icon: TrendingUp, color: "#0202ff", title: "Demonstrating ROI", desc: "Clients and sponsors need to see measurable progress. Curiosity Led tracks commitment follow-through, competency development, and decision quality — giving you objective evidence of impact." },
              { icon: Repeat, color: "#10b981", title: "Continuity Across Engagements", desc: "When a client engagement ends, the development stops. Curiosity Led creates a persistent growth layer your clients can carry forward — making your firm's value sticky beyond the contract." },
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

      {/* White-Label Configuration */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-6 inline-block">White-Label &amp; Configuration</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Your brand. Your framework. Your IP.</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">Curiosity Led is configured around your firm's competency model, not ours. Your clients see your branding, your language, and your coaching philosophy — powered by our operating infrastructure.</p>
              <div className="space-y-4">
                {[
                  { icon: Palette, title: "Full white-label branding", desc: "Your logo, your colour palette, your domain. Clients experience your firm, not Curiosity Led." },
                  { icon: Layers, title: "Custom competency frameworks", desc: "Map your leadership model into the platform — any competency structure, any behavioural anchors." },
                  { icon: Settings, title: "Configurable coaching prompts", desc: "Define the questions, reflections, and nudges your clients receive — aligned to your methodology's language." },
                  { icon: TrendingUp, title: "Impact reporting for sponsors", desc: "Generate objective progress reports to share with HR sponsors — commitment tracking, competency growth, decision quality." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4">
                      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eef0ff" }}>
                        <Icon className="w-4 h-4" style={{ color: "#0202ff" }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 border border-indigo-100">
              <h3 className="text-lg font-bold text-gray-900 mb-2">What your clients get daily</h3>
              <p className="text-xs text-gray-500 mb-6">Between every coaching session, your methodology stays active.</p>
              <div className="space-y-3">
                {[
                  { time: "Morning", action: "Daily priority and energy check-in — aligned to your framework's language.", color: "#0202ff" },
                  { time: "Midday", action: "Progress pulse on committed leadership behaviours from the session.", color: "#6366f1" },
                  { time: "Evening", action: "Reflection prompt — what worked, what shifted, what to carry forward.", color: "#10b981" },
                  { time: "Session Prep", action: "Auto-generated prework: commitments kept, decisions made, patterns detected.", color: "#f59e0b" },
                ].map((row) => (
                  <div key={row.time} className="flex gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="text-[10px] font-bold w-16 flex-shrink-0 mt-0.5" style={{ color: row.color }}>{row.time}</div>
                    <div className="text-xs text-gray-600 leading-relaxed">{row.action}</div>
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
          <h2 className="text-3xl font-bold text-white mb-4">Your methodology, in the tools your clients already use.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">Clients don't adopt new tools. Curiosity Led delivers your coaching prompts, commitment trackers, and development nudges inside Microsoft Teams — where your clients already live.</p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { title: "Session prework, automated", desc: "Before every coaching session, clients receive a structured summary: commitments kept, decisions made, and patterns detected since the last meeting." },
              { title: "Commitment tracking between sessions", desc: "Each behavioural commitment a client makes in a session is tracked daily — giving you objective data on follow-through, not self-report." },
              { title: "Scalable across your client portfolio", desc: "Once configured, the platform runs your methodology across all clients simultaneously — freeing your coaches to focus on high-value session work." },
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
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">Ready to scale your methodology without scaling your headcount?</h2>
          <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">Explore the Curiosity Led partner model — white-label, configurable, and designed to embed your firm's IP into a daily leadership operating system.</p>
          <a href="https://cal.com/curiosityled/bookdemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white font-bold text-sm px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg" style={{ color: "#0202ff" }}>
            Explore the partner model <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <IndustryFooter />
    </div>
  );
}