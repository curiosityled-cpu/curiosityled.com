import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, CheckCircle2, Loader2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BlueprintPreview from "@/components/landing/BlueprintPreview";

export default function OfferPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    role: "HR",
  });

  useEffect(() => {
    document.title = "90-Day Leadership Development Reboot Blueprint · Curiosity Led";
    return () => { document.title = "Curiosity Led"; };
  }, []);

  const scrollToForm = () => {
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    <div className="min-h-screen font-sans text-[#0a0a0a]" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Header bar */}
      <header className="flex items-center justify-between px-5 py-3 bg-black text-white">
        <div className="flex items-center gap-2.5">
          <img
            src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
            alt="Curiosity Led"
            className="h-6 w-auto object-contain invert brightness-0"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <span className="hidden sm:inline text-xs font-semibold tracking-wider">CURIOSITY LED</span>
          <span className="hidden sm:inline text-xs text-gray-400">· LEADERSHIP REBOOT DIAGNOSTIC</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Private Assessment</span>
        </div>
      </header>

      {/* Split-screen hero */}
      <section className="grid md:grid-cols-[1.4fr_1fr] border-b border-gray-200" style={{ minHeight: "calc(100vh - 56px)" }}>
        {/* Left column */}
        <div className="flex flex-col justify-center px-8 py-12 md:px-16 md:py-20 md:border-r md:border-gray-200">
          <div className="max-w-xl">
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">01</p>
            <p className="text-xs font-semibold tracking-widest mb-6" style={{ color: "#0202ff" }}>
              LEADERSHIP SUPPORT DIAGNOSTIC · BY CURIOSITY LED
            </p>

            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight mb-6">
              What is the #1 thing holding back your <span style={{ color: "#0202ff" }}>leadership support</span>?
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-md">
              Answer a short set of questions. See where leadership support is breaking down, get your top pressure points, and download a 90-day blueprint built from your answers.
            </p>

            <button
              onClick={scrollToForm}
              className="w-full max-w-sm inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 shadow-lg"
              style={{ backgroundColor: "#0202ff" }}
            >
              Continue My Diagnostic
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-gray-400 mt-3">
              Free · About 2 Minutes · Instant Downloadable PDF
            </p>

            {/* 3-step cards */}
            <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-gray-200">
              {[
                { n: "01", t: "Support Readiness Score", s: "See what's working now" },
                { n: "02", t: "Your #1 Pressure Point", s: "Know where to start" },
                { n: "03", t: "Your 90-Day Blueprint", s: "Print it and share it" },
              ].map((step) => (
                <div key={step.n} className="text-left">
                  <p className="text-xs text-gray-400 font-medium mb-1">{step.n}</p>
                  <p className="text-sm font-bold leading-snug mb-0.5">{step.t}</p>
                  <p className="text-xs text-gray-500 leading-snug">{step.s}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2.5 mt-8">
              <span className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-bold text-white bg-black">CL</span>
              <p className="text-xs text-gray-500">
                Built for HR, Talent, L&D, and executive leaders who want a clear answer they can use.
              </p>
            </div>
          </div>
        </div>

        {/* Right column — preview */}
        <div className="hidden md:flex flex-col justify-center px-10 py-20 bg-white/40">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-gray-400">YOUR TAKEAWAY</p>
            <p className="text-xs text-gray-400">A Clear Leadership Blueprint</p>
          </div>
          <BlueprintPreview />
          <div className="flex items-center gap-2 mt-4 px-2">
            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "#0202ff" }} />
            <p className="text-xs text-gray-500">
              Built from your answers. Ready to print, share, and review with your team.
            </p>
          </div>
        </div>
      </section>

      {/* Condensed sections */}
      <section className="px-6 py-16 md:py-20 border-b border-gray-200">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold leading-tight mb-4">
            You don't need more leadership activity. You need a better support system.
          </h2>
          <ul className="space-y-2.5">
            {[
              "Support arrives after the impact is already visible.",
              "Managers experience development as one more requirement.",
              "HR and Talent are stitching together updates, reporting, and follow-through by hand.",
              "Leadership asks what is working, and the answer is still too hard to defend.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-600">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#0202ff" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold leading-tight mt-10 mb-3">
            The cost of waiting is usually higher than it looks.
          </h2>
          <p className="text-gray-600 leading-relaxed">
            When leadership support starts too late or depends on too much manual coordination, the downstream cost shows up in manager strain, slower readiness, weaker follow-through, uneven team performance, and growing pressure on HR, Talent, and L&D.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 py-16 md:py-20 border-b border-gray-200 bg-white/40">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold leading-tight mb-6">
            What you get: a <span style={{ color: "#0202ff" }}>90-Day Blueprint</span>
          </h2>
          <ul className="space-y-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 pt-8 border-t border-gray-200">
            {[
              "Answer a short set of questions about your current leadership support reality.",
              "Get your tailored 90-Day Leadership Development Reboot Blueprint.",
              "Use it internally, or review it with Curiosity Led to pressure-test implementation.",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#0202ff" }}>
                  {i + 1}
                </span>
                <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bridge + Form */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold leading-tight mb-4">
            A roadmap is valuable. Implementation is where it gets hard.
          </h2>
          <p className="text-gray-600 leading-relaxed mb-12 max-w-lg mx-auto">
            Most teams don't struggle because they can't name the problem. They struggle because fixing it means reducing friction for managers, creating earlier intervention points, and sustaining follow-through without adding more burden. That's where Curiosity Led can help.
          </p>

          <h2 className="text-3xl font-bold leading-tight mb-3">
            Get your 90-Day Blueprint
          </h2>
          <p className="text-gray-600 mb-10">
            Use it for internal action, leadership conversations, or your next implementation decision.
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-gray-200 bg-white p-8 max-w-md mx-auto"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#0202ff" }} />
                <h3 className="text-xl font-bold mb-2">You're on the list.</h3>
                <p className="text-gray-600">
                  Check your inbox — your 90-Day Blueprint is on its way.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                id="lead-form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 text-left max-w-md mx-auto"
              >
                <input
                  type="text" required placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                />
                <input
                  type="email" required placeholder="Work email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                />
                <input
                  type="text" placeholder="Organization"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/20 outline-none transition-all"
                >
                  <option>HR</option>
                  <option>Talent</option>
                  <option>L&D</option>
                  <option>People Ops</option>
                  <option>Executive Leader</option>
                  <option>Other</option>
                </select>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit" disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-60 shadow-lg"
                  style={{ backgroundColor: "#0202ff" }}
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                  ) : (
                    <>Take the diagnostic <ArrowRight className="w-5 h-5" /></>
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

      <footer className="px-6 py-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Curiosity Led · Leadership Development Platform</p>
      </footer>
    </div>
  );
}