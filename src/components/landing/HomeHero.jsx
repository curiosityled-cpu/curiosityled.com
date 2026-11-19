import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";

const TRUST = [
  "Works inside Microsoft Teams and email",
  "Your leadership framework, or ours",
  "Individual data stays private",
];

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-20 md:pt-36">
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="absolute -top-40 right-0 w-[560px] h-[560px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: "#0202ff" }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-6"
            >
              For managers — and the people accountable for them
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="text-[2.1rem] leading-[1.08] sm:text-5xl lg:text-[3.4rem] font-bold text-[#0a0a0a] tracking-tight"
            >
              Nobody trained you for the{" "}
              <span style={{ color: "#0202ff" }}>people part</span> of managing.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18 }}
              className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl"
            >
              Curiosity Led gives managers a place to think through the hard moment before they walk
              into it — the stalled 1:1, the delegation you keep taking back, the feedback you've
              postponed twice. Ten minutes in the flow of work, and a record of what you actually did
              differently.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.28 }}
              className="mt-9 grid sm:grid-cols-2 gap-3 max-w-xl"
            >
              <Link
                to="/diagnostic"
                className="group rounded-xl border border-gray-200 bg-white p-4 hover:border-[#0202ff] hover:shadow-sm transition-all"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  I manage a team
                </p>
                <p className="mt-1.5 text-sm font-semibold text-gray-900 leading-snug">
                  Take the 8-minute manager check
                </p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Real scenarios, a profile you can keep. No account needed.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#0202ff" }}>
                  Start now
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <a
                href="https://cal.com/curiosityled/bookdemo"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-gray-300 hover:bg-white transition-all"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  I'm accountable for managers
                </p>
                <p className="mt-1.5 text-sm font-semibold text-gray-900 leading-snug">
                  See what the evidence looks like
                </p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  25 minutes, your org structure, no slide deck.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                  Book a walkthrough
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-2"
            >
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#0202ff" }} />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          {/* The manager's Monday — the product, in one card */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="relative"
          >
            <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0202ff" }} />
                  <span className="text-xs font-semibold text-gray-700">Monday, 8:40am</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Illustrative
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    In 20 minutes
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    1:1 with Dana — third reschedule
                  </p>
                  <p className="mt-2 text-[13px] text-gray-600 leading-relaxed">
                    Dana has gone quiet in standups since the reorg. You don't have a performance
                    problem yet. You have a conversation you've been avoiding.
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#0202ff" }}>
                    Try opening with
                  </p>
                  <p className="mt-1 text-[13px] text-gray-700 leading-relaxed">
                    "You've been quieter in standups since the changes. What's it been like from where
                    you sit?"
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ backgroundColor: "#0202ff" }}>
                    Rehearse this
                  </span>
                  <span className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-600 border border-gray-200">
                    Save for later
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Last week's commitment
                  </p>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: "#10b981" }}>
                      ✓
                    </span>
                    <div>
                      <p className="text-[12px] text-gray-700 leading-snug">
                        Hand the QA review to Marcus by Friday
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Follow-up due today · you'll be asked what happened
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-gray-400 text-center">
              A sample day. Your data stays yours; HR sees aggregates, never your conversations.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}