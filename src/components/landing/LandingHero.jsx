import React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingHero() {
  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 overflow-hidden bg-white">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Blue accent blob */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "#0202ff" }}
      />

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl lg:text-5xl xl:text-[52px] font-bold text-[#0a0a0a] leading-[1.1] tracking-tight mb-6"
            >
              Spot leadership risk{" "}
              <span style={{ color: "#0202ff" }}>before it hits your metrics.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg text-gray-600 leading-relaxed mb-8 font-medium"
            >
              Earlier signals. In-workflow support. Clearer leadership visibility.
            </motion.p>

            {/* Bullets */}
            <motion.ul
              className="space-y-3 mb-10"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } }
              }}
            >
              {[
                "Support at\u2011risk managers before issues escalate.",
                "Deliver coaching and learning in the flow of work.",
                "Give one shared view of progress, readiness, and where to intervene.",
              ].map((b, i) => (
                <motion.li
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#0202ff" }}
                  >
                    ✓
                  </span>
                  <span className="text-gray-700 text-sm leading-relaxed">{b}</span>
                </motion.li>
              ))}
            </motion.ul>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a
                href="https://calendly.com/team-curiosityled/discoverycall"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#0202ff" }}
              >
                Book a demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={scrollToHow}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                See how it works
                <ChevronDown className="w-4 h-4" />
              </button>
            </motion.div>
          </div>


        </div>

        {/* Proof strip */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400 max-w-2xl mx-auto">
            Designed for healthcare HR and L&D teams. Early programs indicate stronger manager engagement, lower admin burden, and clearer links between development activity and leadership visibility.
          </p>
        </div>
      </div>
    </section>
  );
}