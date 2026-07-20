import React, { useEffect } from "react";
import { ArrowRight, FileText, ListChecks, Map, MessageSquare, FileCheck } from "lucide-react";
import { motion } from "framer-motion";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";

// ── Section wrapper: gives the page its "executive document" rhythm ──────────
function ReportSection({ number, id, children, className = "" }) {
  return (
    <section
      id={id}
      className={`px-6 py-16 sm:py-20 border-t border-gray-200 ${className}`}
    >
      <div className="max-w-2xl mx-auto">
        {number && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-4 font-mono"
          >
            {number}
          </motion.p>
        )}
        {children}
      </div>
    </section>
  );
}

// ── Reusable CTA button (diagnostic-first) ──────────────────────────────────
function DiagnosticCTA({ label = "Take the diagnostic", center = true }) {
  return (
    <div className={center ? "flex justify-center" : ""}>
      <a
        href="#diagnostic"
        className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-lg font-semibold text-white text-sm tracking-wide transition-all hover:opacity-90 shadow-sm"
        style={{ backgroundColor: "#0202ff" }}
      >
        {label}
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

// ── Problem bullets ─────────────────────────────────────────────────────────
const PROBLEM_BULLETS = [
  "Support arrives after the impact is already visible.",
  "Managers experience development as one more requirement.",
  "HR and Talent are stitching together updates, reporting, and follow-through by hand.",
  "Leadership asks what is working, and the answer is still too hard to defend.",
];

// ── What you get (Blueprint modules) ────────────────────────────────────────
const BLUEPRINT_MODULES = [
  {
    icon: ListChecks,
    title: "Diagnostic of breakdowns",
    body: "A clear diagnostic of where leadership support is breaking down across your organization.",
  },
  {
    icon: MessageSquare,
    title: "Top pressure points",
    body: "Your top pressure points identified, and what they likely mean right now.",
  },
  {
    icon: Map,
    title: "90-day roadmap",
    body: "A tailored 90-day roadmap you can implement with the tools and systems you already have.",
  },
  {
    icon: FileText,
    title: "Executive talking points",
    body: "Talking points you can bring to leadership to show exactly where change is needed.",
  },
  {
    icon: FileCheck,
    title: "Internal starting document",
    body: "A starting document you can use internally — with or without Curiosity Led.",
  },
];

// ── How it works steps ──────────────────────────────────────────────────────
const STEPS = [
  "Answer a short set of questions about your current leadership support reality.",
  "Get your tailored 90-Day Leadership Development Reboot Blueprint.",
  "Use it internally, or review it with Curiosity Led to pressure-test implementation.",
];

// ── Who it's for ────────────────────────────────────────────────────────────
const AUDIENCES = [
  "HR",
  "Talent",
  "L&D",
  "People Ops",
  "Executive leaders responsible for manager readiness and support systems",
];

export default function OfferPage() {
  useEffect(() => {
    document.title = "90-Day Leadership Development Reboot Blueprint · Curiosity Led";
    return () => { document.title = "Curiosity Led"; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <LandingNav hideCtas />

      {/* ─── HERO ─── Immediate clarity. Pain + utility. */}
      <section
        id="hero"
        className="relative min-h-[90vh] flex flex-col justify-center pt-28 pb-16 px-6 overflow-hidden bg-white"
      >
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(#0202ff 1px, transparent 1px), linear-gradient(90deg, #0202ff 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
        />

        <div className="relative max-w-2xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-[0.3em] mb-6 font-mono"
            style={{ color: "#0202ff" }}
          >
            Free Diagnostic · 90-Day Blueprint
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold text-[#0a0a0a] leading-[1.08] tracking-tight mb-6"
          >
            Leadership support is breaking down in more places than you can see.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg text-gray-600 leading-relaxed mb-10 max-w-xl"
          >
            For HR, Talent, L&amp;D, and executive leaders who know support is too
            reactive, too manual, or too disconnected from daily work — this
            diagnostic gives you a tailored{" "}
            <span className="font-semibold text-[#0a0a0a]">90-day roadmap</span>{" "}
            to fix it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <DiagnosticCTA label="Take the diagnostic" />
            <p className="text-sm text-gray-400 text-center mt-4">
              No commitment. No generic report. A tailored starting plan you can use internally.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── 02 · PROBLEM ─── Fast pattern recognition */}
      <ReportSection number="02 · The Problem" id="problem">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-tight mb-8"
        >
          You do not need more leadership activity. You need a better support system.
        </motion.h2>
        <ul className="space-y-4">
          {PROBLEM_BULLETS.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-3"
            >
              <span
                className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#0202ff" }}
              />
              <span className="text-gray-700 leading-relaxed text-[15px]">{item}</span>
            </motion.li>
          ))}
        </ul>
      </ReportSection>

      {/* ─── 03 · COST ─── Agitate, but stay credible */}
      <ReportSection number="03 · The Cost" id="cost" className="bg-gray-50/60">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-tight mb-6"
        >
          The cost of waiting is usually higher than it looks.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-gray-600 leading-relaxed text-[15px]"
        >
          When leadership support starts too late or depends on too much manual
          coordination, the downstream cost shows up in manager strain, slower
          readiness, weaker follow-through, uneven team performance, and growing
          pressure on HR, Talent, and L&amp;D.
        </motion.p>
      </ReportSection>

      {/* ─── 04 · WHAT YOU GET ─── Core conversion section */}
      <ReportSection number="04 · What You Get" id="what-you-get">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-tight mb-2"
        >
          A 90-Day Leadership Development Reboot Blueprint
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-sm text-gray-400 mb-10"
        >
          More than a report — a decision-ready document.
        </motion.p>

        <div className="space-y-5">
          {BLUEPRINT_MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="flex items-start gap-4 p-5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
              >
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#0202ff10" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#0202ff" }} />
                </span>
                <div>
                  <h3 className="font-semibold text-[#0a0a0a] text-[15px] mb-1">{mod.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{mod.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ReportSection>

      {/* ─── 05 · HOW IT WORKS ─── 3 steps, remove friction */}
      <ReportSection number="05 · How It Works" id="how-it-works" className="bg-gray-50/60">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-tight mb-10"
        >
          How it works
        </motion.h2>

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-start gap-5"
            >
              <span
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm text-white"
                style={{ backgroundColor: "#0202ff" }}
              >
                {i + 1}
              </span>
              <p className="text-gray-700 leading-relaxed text-[15px] pt-1">{step}</p>
            </motion.div>
          ))}
        </div>
      </ReportSection>

      {/* ─── 06 · WHO IT'S FOR ─── Qualification */}
      <ReportSection number="06 · Who It's For" id="who-its-for">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-tight mb-8"
        >
          Built for teams responsible for leadership outcomes, not just leadership programs.
        </motion.h2>
        <div className="flex flex-wrap gap-2.5">
          {AUDIENCES.map((aud, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="text-sm font-medium px-4 py-2 rounded-full border border-gray-200 text-gray-700"
            >
              {aud}
            </motion.span>
          ))}
        </div>
      </ReportSection>

      {/* ─── 07 · IMPLEMENTATION BRIDGE ─── Lightly introduce Curiosity Led */}
      <ReportSection number="07 · Implementation" id="bridge" className="bg-gray-50/60">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-tight mb-6"
        >
          A roadmap is valuable. Implementation is where it gets hard.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-gray-600 leading-relaxed text-[15px]"
        >
          Most teams do not struggle because they cannot name the problem. They
          struggle because fixing it means reducing friction for managers,
          creating earlier intervention points, coordinating across tools, and
          sustaining follow-through without adding more burden to the internal
          team. That is where{" "}
          <span className="font-semibold text-[#0a0a0a]">Curiosity Led</span> can
          help.
        </motion.p>
      </ReportSection>

      {/* ─── 08 · FINAL CTA ─── Drive into the diagnostic */}
      <section
        id="diagnostic-cta"
        className="px-6 py-24 border-t border-gray-200 bg-white"
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-5 font-mono"
          >
            08 · Get Started
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] leading-tight mb-4"
          >
            Get your 90-Day Leadership Development Reboot Blueprint
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-500 mb-10 text-[15px]"
          >
            Use it as a starting point for internal action, leadership
            conversations, or your next implementation decision.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <DiagnosticCTA label="Take the diagnostic" />
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}