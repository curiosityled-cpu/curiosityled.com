import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const bullets = [
  "Use our competency library or your own framework.",
  "Complement existing leadership development programs and coaching.",
  "Add clearer visibility without creating another disconnected process.",
];

export default function LandingFitSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50">
              <span className="w-2 h-2 rounded-full bg-[#0202ff]" />
              <span className="text-xs font-semibold text-[#0202ff] uppercase tracking-wider">Built to fit your world</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-[#0a0a0a] mb-6 leading-tight">
              Designed to work with what you already have.
            </h2>

            <p className="text-gray-500 leading-relaxed mb-8">
              Curiosity Led does not ask HR teams to start over. It helps bring existing leadership programs, assessments, coaching, and competency models into one clearer system for manager support, readiness visibility, and succession planning.
            </p>

            <ul className="space-y-4">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: image */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl overflow-hidden"
          >
            <img
              src="/Body (50).png"
              alt="Integrated systems"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}