import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function OfferPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "HR",
    phone: "",
  });

  useEffect(() => {
    document.title = "90-Day Leadership Development Reboot Blueprint · Curiosity Led";
    return () => { document.title = "Curiosity Led"; };
  }, []);

  const scrollToForm = () => {
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await base44.entities.Prospect.create({
        ...form,
        source: "offer_diagnostic",
        lead_status: "new",
      });
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#0a0a0a]">
      {/* Minimal brand mark */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-center py-4 bg-white/80 backdrop-blur-sm">
        <img
          src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
          alt="Curiosity Led"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 pt-24 pb-16 overflow-hidden">
        <div className="relative max-w-2xl mx-auto w-full text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-6"
            style={{ color: "#0202ff" }}
          >
            Leadership Development Diagnostic
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight mb-6"
          >
            Get a <span style={{ color: "#0202ff" }}>90-Day Leadership Development Reboot Blueprint</span> built around your real bottlenecks.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto"
          >
            For HR, Talent, L&D, and executive leaders who know support is too reactive, too manual, or too disconnected from daily work — this diagnostic gives you a tailored 90-day roadmap to fix it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-col items-center gap-3"
          >
            <button
              onClick={scrollToForm}
              className="w-full max-w-sm inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold text-white text-base transition-all hover:opacity-90 shadow-lg"
              style={{ backgroundColor: "#0202ff" }}
            >
              Take the diagnostic
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-gray-500">
              No commitment. No generic report. A tailored starting plan you can use internally.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-6">
          You don't need more leadership activity. You need a better support system.
        </h2>
        <ul className="space-y-3 text-left max-w-lg mx-auto">
          {[
            "Support arrives after the impact is already visible.",
            "Managers experience development as one more requirement.",
            "HR and Talent are stitching together updates, reporting, and follow-through by hand.",
            "Leadership asks what is working, and the answer is still too hard to defend.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#0202ff" }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Cost */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-5">
          The cost of waiting is usually higher than it looks.
        </h2>
        <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">
          When leadership support starts too late or depends on too much manual coordination, the downstream cost shows up in manager strain, slower readiness, weaker follow-through, uneven team performance, and growing pressure on HR, Talent, and L&D.
        </p>
      </Section>

      {/* What you get */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-6">
          What you get: a <span style={{ color: "#0202ff" }}>90-Day Blueprint</span>
        </h2>
        <ul className="space-y-3 text-left max-w-lg mx-auto">
          {[
            "A clear diagnostic of where leadership support is breaking down.",
            "Your top pressure points and what they likely mean right now.",
            "A tailored 90-day roadmap you can implement with what you already have.",
            "Talking points you can bring to leadership to show where change is needed.",
            "A starting document you can use internally, with or without Curiosity Led.",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#0202ff" }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* How it works */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-8">
          How it works
        </h2>
        <div className="space-y-5 max-w-md mx-auto text-left">
          {[
            "Answer a short set of questions about your current leadership support reality.",
            "Get your tailored 90-Day Leadership Development Reboot Blueprint.",
            "Use it internally, or review it with Curiosity Led to pressure-test implementation.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: "#0202ff" }}
              >
                {i + 1}
              </span>
              <p className="text-gray-700 leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Who it's for */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-6">
          Built for teams responsible for leadership outcomes, not just leadership programs.
        </h2>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {["HR", "Talent", "L&D", "People Ops", "Executive leaders responsible for manager readiness"].map((tag) => (
            <span
              key={tag}
              className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </Section>

      {/* Implementation bridge */}
      <Section>
        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-5">
          A roadmap is valuable. Implementation is where it gets hard.
        </h2>
        <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">
          Most teams don't struggle because they can't name the problem. They struggle because fixing it means reducing friction for managers, creating earlier intervention points, coordinating across tools, and sustaining follow-through without adding more burden to the internal team. That's where Curiosity Led can help.
        </p>
      </Section>

      {/* Final CTA + Form */}
      <section className="px-6 py-20 border-t border-gray-100">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Get your 90-Day Leadership Development Reboot Blueprint
          </h2>
          <p className="text-gray-600 mb-10">
            Use it as a starting point for internal action, leadership conversations, or your next implementation decision.
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-8"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#0202ff" }} />
                <h3 className="text-xl font-bold mb-2">You're on the list.</h3>
                <p className="text-gray-600">
                  Check your inbox — your 90-Day Blueprint is on its way. If you don't see it within a few minutes, check your spam folder.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                id="lead-form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: showForm ? 1 : 0.4 }}
                className="space-y-4 text-left max-w-md mx-auto"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization</label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all bg-white"
                  >
                    <option>HR</option>
                    <option>Talent</option>
                    <option>L&D</option>
                    <option>People Ops</option>
                    <option>Executive Leader</option>
                    <option>Other</option>
                  </select>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-60 shadow-lg"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Take the diagnostic
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center pt-1">
                  No commitment. No generic report. A tailored starting plan you can use internally.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Curiosity Led · Leadership Development Platform</p>
      </footer>
    </div>
  );
}

function Section({ children }) {
  return (
    <section className="px-6 py-16 border-t border-gray-100">
      <div className="max-w-2xl mx-auto text-center">{children}</div>
    </section>
  );
}