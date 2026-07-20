import React, { useEffect } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import OfferUnifiedHub from "@/components/landing/OfferUnifiedHub";

const AUDIENCES = [
  {
    tag: "Managers",
    body: "Not another generic program. Get personalized support on real leadership challenges in tools you already use — without weaponizing or surveillance mining your private reflections.",
  },
  {
    tag: "HR / Talent",
    body: "Run a structured, competency-aligned reboot and finally see which leaders are at risk or ready and where support is landing.",
  },
  {
    tag: "Executive sponsors",
    body: "Use a live Intelligence Hub to decide where to focus attention and budget, with data you can stand behind.",
  },
];

const CALENDLY_URL = "https://calendly.com/team-curiosityled/discoverycall";

export default function OfferPage() {
  useEffect(() => {
    document.title = "12-Week Leadership Development Reboot · Curiosity Led";
    return () => { document.title = "Curiosity Led"; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav hideCtas />

      {/* Hero */}
      <section id="hero" className="relative min-h-screen flex flex-col justify-center pt-28 pb-16 overflow-hidden bg-white">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
          style={{ background: "#0202ff" }}
        />

        <div className="relative max-w-4xl mx-auto px-6 w-full text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium uppercase tracking-[0.3em] mb-5"
            style={{ color: "#0202ff" }}
          >
            Your 90-Day Blueprint
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#0a0a0a] leading-[1.05] tracking-tight mb-6"
          >
            12-Week Leadership Development <span style={{ color: "#0202ff" }}>Reboot</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-2xl sm:text-3xl font-semibold text-[#0a0a0a] leading-snug max-w-3xl mx-auto mb-5"
          >
            Stop funding leadership programs <span style={{ color: "#0202ff" }}>you can't defend.</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto font-medium mb-10"
          >
            With the 12-Week Leadership Development Reboot, Curiosity Led gives HR
            and executive sponsors a live view of manager risk, readiness, and progress
            in one Leadership Intelligence Hub — instead of scattered tools and spreadsheets.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#0202ff" }}
            >
              Book the pilot call
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#guarantee"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-gray-700 text-sm border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              See the guarantee
            </a>
          </motion.div>
        </div>
      </section>

      {/* Audience strip */}
      <section className="relative px-6 py-20 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center text-2xl sm:text-3xl font-bold text-[#0a0a0a] mb-10"
          >
            Turn daily management into your greatest competitive advantage.
          </motion.h2>

          <div className="mb-12">
            <OfferUnifiedHub />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AUDIENCES.map((a, i) => (
              <motion.div
                key={a.tag}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 flex flex-col shadow-sm"
              >
                <div className="mb-3">
                  <span
                    className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ color: "#0202ff", backgroundColor: "#0202ff15" }}
                  >
                    {a.tag}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{a.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section id="guarantee" className="relative px-6 py-24 border-t border-gray-100">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: "#0202ff" }}
            >
              <ShieldCheck className="w-5 h-5" />
            </span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400 mb-6"
          >
            Our Guarantee
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl sm:text-2xl font-medium text-[#0a0a0a] leading-relaxed"
          >
            If HR and your executive sponsor don't get a live Leadership Intelligence Hub
            and a clearer, competency-aligned story of which managers are at risk, ready,
            and where support should go next, we'll keep working with your cohort at no
            additional charge until they do.
          </motion.p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-24 text-center border-t border-gray-100">
        <div className="max-w-xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mb-4"
          >
            12 weeks. One Hub. A leadership story you can get behind.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-600 mb-8"
          >
            Limited pilot cohorts. Book a call to hold a seat.
          </motion.p>
          <motion.a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#0202ff" }}
          >
            Book the pilot call
            <ArrowRight className="w-4 h-4" />
          </motion.a>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}