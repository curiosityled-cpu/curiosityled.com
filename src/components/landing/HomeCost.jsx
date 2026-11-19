import React from "react";
import { motion } from "framer-motion";

const COSTS = [
  {
    label: "The cost you can see",
    title: "A manager leaves, and the team leaves with them.",
    body: "Replacing a manager means recruiting, ramping, and months of lost momentum. The team that stays carries the rest.",
  },
  {
    label: "The cost you can't",
    title: "Feedback arrives once a year, months after the moment.",
    body: "By the time a review names the problem, the project, the 1:1, and the trust it damaged are long gone.",
  },
  {
    label: "The cost nobody owns",
    title: "People don't quit companies. They quit an untrained manager.",
    body: "Most managers were promoted for doing the work well, then handed a team and left to guess at the rest.",
  },
];

export default function HomeCost() {
  return (
    <section className="py-20 md:py-24" style={{ backgroundColor: "#0f0f1a" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-5">
            The problem
          </p>
          <h2 className="text-3xl lg:text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
            Manager development is the biggest line item in your people budget that
            <span className="text-gray-500"> nobody can reconcile.</span>
          </h2>
          <p className="mt-5 text-gray-300 text-lg leading-relaxed">
            You buy assessments, coaching, and courses. What comes back is completion data — not
            evidence that anyone manages differently on a Tuesday afternoon.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {COSTS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 p-6"
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-3">
                {c.label}
              </p>
              <p className="text-white font-semibold leading-snug">{c.title}</p>
              <p className="mt-2.5 text-gray-400 text-sm leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-[11px] text-gray-500 leading-relaxed max-w-3xl">
          Gallup's 2015 <em>State of the American Manager</em> put the cost of manager-related
          disengagement in the hundreds of billions of dollars a year across the US workforce. The
          exact figure is debated; the pattern is not. Your own turnover and exit data will tell you
          what it costs you.
        </p>
      </div>
    </section>
  );
}