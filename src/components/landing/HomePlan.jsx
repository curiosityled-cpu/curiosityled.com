import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Compass, MessagesSquare, Repeat, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Compass,
    step: "01",
    label: "See yourself clearly",
    time: "8 minutes",
    body: "A short set of real management scenarios — not a personality quiz. You get a profile of where your judgment is strong and where it quietly costs you.",
    note: "No pass or fail. It's a compass, not a certificate.",
  },
  {
    icon: MessagesSquare,
    step: "02",
    label: "Practise the moment you're avoiding",
    time: "10 minutes, in Teams or email",
    body: "The conversation you keep postponing, rehearsed with a guide that asks the question you'd rather skip. Then one commitment you can actually keep this week.",
    note: "Built around your real week, not a module library.",
  },
  {
    icon: Repeat,
    step: "03",
    label: "Keep the record",
    time: "Ongoing",
    body: "Commit → act → follow up. You see what you did differently. Your organisation sees movement, never your private conversations.",
    note: "This is what makes progress provable — to you first.",
  },
];

export default function HomePlan() {
  return (
    <section id="how-it-works" className="py-24 bg-white scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-5">
            How it works
          </p>
          <h2 className="text-3xl lg:text-[2.6rem] font-bold text-[#0a0a0a] leading-[1.15] tracking-tight">
            Three steps. One habit.
          </h2>
          <p className="mt-4 text-gray-600 text-lg leading-relaxed">
            Not a programme to complete. A way of working that gets easier the more often you do it.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-2xl border border-gray-200 p-6 flex flex-col bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#eef0ff" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#0202ff" }} />
                  </div>
                  <span className="text-xs font-bold text-gray-300 tracking-wider">{s.step}</span>
                </div>

                <h3 className="text-lg font-bold text-[#0a0a0a] leading-snug">{s.label}</h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "#0202ff" }}>
                  {s.time}
                </p>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{s.body}</p>
                <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
                  {s.note}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5">
          <div>
            <p className="text-sm font-bold text-[#0a0a0a]">Reading about it isn't the same as doing it.</p>
            <p className="mt-1 text-sm text-gray-600">
              The whole loop takes five minutes, and nothing is gated behind a form.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white hover:opacity-90 flex-shrink-0"
            style={{ backgroundColor: "#0202ff" }}
          >
            Experience Curiosity Led for yourself
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}