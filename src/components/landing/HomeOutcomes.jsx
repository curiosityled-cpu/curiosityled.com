import React from "react";
import { motion } from "framer-motion";
import { Clock, Wallet, LineChart, UserCheck } from "lucide-react";

const OUTCOMES = [
  {
    icon: Clock,
    title: "Save your HR team's time",
    promise: "Stop rebuilding manager development from scratch every quarter.",
    detail:
      "One place for the check, the practice, the follow-up, and the record. No spreadsheet to reconcile, no separate survey to run, no chasing completion.",
  },
  {
    icon: Wallet,
    title: "Spend where it actually moves",
    promise: "Fund the managers who need it, not the whole cohort by default.",
    detail:
      "See which managers are practising, which are stuck, and which need a real intervention — so coaching hours and budget land on the people who will use them.",
  },
  {
    icon: LineChart,
    title: "Prove ROI with your numbers",
    promise: "We don't sell you a percentage. We make the change legible.",
    detail:
      "Bring your own turnover cost, span of control, and engagement data. Curiosity Led supplies the behavioural record — what changed, for whom, and when — so the arithmetic is yours and defensible.",
  },
  {
    icon: UserCheck,
    title: "Keep the leaders you'd hate to lose",
    promise: "Hear about the wobble before the resignation letter.",
    detail:
      "Sustained overload, stalled goals, and disengagement show up in the check-in rhythm weeks before they show up in attrition. Managers get support; you get a signal.",
  },
];

export default function HomeOutcomes() {
  return (
    <section id="outcomes" className="py-24 bg-gray-50 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-5">
              What changes for you
            </p>
            <h2 className="text-3xl lg:text-[2.6rem] font-bold text-[#0a0a0a] leading-[1.15] tracking-tight">
              The same platform, read four ways.
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Managers see a place to get better. HR sees less guesswork. Owners and boards see a
              story with evidence underneath it.
            </p>
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                The question we're built to answer
              </p>
              <p className="text-lg font-semibold text-gray-900 leading-snug">
                "Are our managers getting better — and how would we know?"
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {OUTCOMES.map((o, i) => {
              const Icon = o.icon;
              return (
                <motion.div
                  key={o.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: "#eef0ff" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "#0202ff" }} />
                  </div>
                  <h3 className="text-base font-bold text-[#0a0a0a] leading-snug">{o.title}</h3>
                  <p className="mt-2 text-sm font-medium text-gray-800 leading-snug">{o.promise}</p>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{o.detail}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}