import React from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Puzzle, BarChart2 } from "lucide-react";

const cards = [
  {
    icon: Users,
    title: "Support managers in the moment",
    body: "Give newly promoted and stretched managers clear next steps inside the flow of work — not after the damage is done.",
  },
  {
    icon: TrendingUp,
    title: "See readiness and succession more clearly",
    body: "Surface progression, watch areas, and bench gaps earlier so readiness and succession planning are grounded in better visibility.",
  },
  {
    icon: Puzzle,
    title: "Work with your existing model",
    body: "Use Curiosity Led's competency library or align the experience to the leadership framework your organization already uses.",
  },
  {
    icon: BarChart2,
    title: "Show impact more clearly",
    body: "Connect assessments, goals, and development activity to a stronger story of leadership progress and organizational readiness.",
  },
];

export default function LandingBuyerNeeds() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
            <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
            <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">What HR and Talent leaders need</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-4 leading-tight">
            Built for the work HR and Talent leaders<br className="hidden lg:block" /> are actually responsible for.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8 flex gap-5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "#eef0ff" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#0202ff" }} />
                </div>
                <div>
                  <div className="text-base font-bold text-[#0a0a0a] mb-2">{card.title}</div>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}