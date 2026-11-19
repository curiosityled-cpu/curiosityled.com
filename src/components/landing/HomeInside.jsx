import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const FOR_MANAGER = [
  "Your own development view — nobody else reads your conversations",
  "Rehearsal for the 1:1 you're dreading, in ten minutes",
  "A commitment you can keep this week, and a follow-up that asks how it went",
];

const FOR_ORG = [
  "Aggregate movement by team and manager band, never raw transcripts",
  "Early warning on sustained overload and stalled goals",
  "One record you can take to a board review without a slide rebuild",
];

export default function HomeInside() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-5">
            Two views, one record
          </p>
          <h2 className="text-3xl lg:text-[2.6rem] font-bold text-[#0a0a0a] leading-[1.15] tracking-tight">
            Privacy isn't a setting here. It's the design.
          </h2>
          <p className="mt-4 text-gray-600 text-lg leading-relaxed">
            Managers won't use a system that reports on them. So we built one that reports
            <em> to</em> them, and gives the organisation only what it can act on.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-gray-200 p-7"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              What a manager sees
            </p>
            <h3 className="text-lg font-bold text-[#0a0a0a] mb-5">Their own practice, privately.</h3>
            <ul className="space-y-3.5">
              {FOR_MANAGER.map((m) => (
                <li key={m} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">{m}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl p-7 text-white"
            style={{ backgroundColor: "#0f0f1a" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
              What the organisation sees
            </p>
            <h3 className="text-lg font-bold mb-5">Aggregates and early signals.</h3>
            <ul className="space-y-3.5">
              {FOR_ORG.map((m) => (
                <li key={m} className="flex items-start gap-3">
                  <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-white/15">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                  <span className="text-sm text-gray-300 leading-relaxed">{m}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <p className="mt-6 text-xs text-gray-400 leading-relaxed max-w-3xl">
          Role-based visibility is enforced in the platform, not promised in a slide: managers own
          their development record, HR and analysts see organisation-level trends, and access is
          scoped to the organisation the person belongs to.
        </p>
      </div>
    </section>
  );
}