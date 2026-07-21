import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import OfferHeader from "@/components/landing/offer/OfferHeader";
import OfferPreviewCard from "@/components/landing/offer/OfferPreviewCard";

const STEPS = [
  { num: "01", title: "Leadership Support Score", desc: "See what is working now" },
  { num: "02", title: "Your #1 Pressure Point", desc: "Know where to start" },
  { num: "03", title: "Your 90-Day Reboot Plan", desc: "Print it and share it" },
];

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
  });

  useEffect(() => {
    document.title = "Leadership Reboot Diagnostic · Curiosity Led";
    return () => { document.title = "Curiosity Led"; };
  }, []);

  const startDiagnostic = () => {
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
    <div className="min-h-screen bg-white font-sans text-[#0a0a0a] flex flex-col">
      <OfferHeader />

      {/* Two-column body */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl w-full mx-auto">
        {/* Left column — content */}
        <div
          className="flex-1 px-6 lg:px-10 py-12 lg:py-16 relative"
          style={{ backgroundColor: "#fcfaf8" }}
        >
          <div className="max-w-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400 mb-4">
              01 &nbsp; Leadership Reboot Review &nbsp; By Curiosity Led
            </p>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold leading-[1.1] tracking-tight mb-5">
              What is the #1 thing holding back your{" "}
              <span style={{ color: "#0202ff" }}>leadership support?</span>
            </h1>

            <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-md">
              Answer a short set of questions about your current leadership support reality.
              Get your top pressure points, a support-readiness score, and download a
              90-day reboot plan built from your answers.
            </p>

            {/* CTA */}
            <button
              onClick={startDiagnostic}
              className="w-full max-w-sm inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: "#0202ff" }}
            >
              {showForm ? "Continue below" : "Continue My Diagnostic"}
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-3 text-sm text-gray-500">Start a New Assessment</p>
            <p className="mt-1 text-xs text-gray-400">
              Free &nbsp;•&nbsp; About 2 Minutes &nbsp;•&nbsp; Instant Downloadable PDF
            </p>

            {/* Inline form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  id="lead-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-10"
                >
                  {submitted ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#0202ff" }} />
                      <h3 className="text-lg font-bold mb-1">You're on the list.</h3>
                      <p className="text-sm text-gray-600">
                        Your 90-Day Reboot Blueprint is on its way to your inbox.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmit}
                      className="space-y-3 text-left max-w-sm"
                    >
                      <Field label="Name">
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="input"
                          placeholder="Your name"
                        />
                      </Field>
                      <Field label="Work email">
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="input"
                          placeholder="you@company.com"
                        />
                      </Field>
                      <Field label="Organization">
                        <input
                          type="text"
                          value={form.organization}
                          onChange={(e) => setForm({ ...form, organization: e.target.value })}
                          className="input"
                          placeholder="Company name"
                        />
                      </Field>
                      <Field label="Role">
                        <select
                          value={form.role}
                          onChange={(e) => setForm({ ...form, role: e.target.value })}
                          className="input bg-white"
                        >
                          <option>HR</option>
                          <option>Talent</option>
                          <option>L&D</option>
                          <option>People Ops</option>
                          <option>Executive Leader</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: "#0202ff" }}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Take the diagnostic
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3-step grid */}
            <div className="mt-12 border-t border-gray-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-gray-300">
                {STEPS.map((s) => (
                  <div
                    key={s.num}
                    className="py-5 px-4 border-t sm:border-t-0 sm:border-r border-gray-300 last:border-r-0 sm:border-b-0"
                  >
                    <p className="text-xs font-bold tracking-wider text-gray-400 mb-1">{s.num}</p>
                    <p className="text-sm font-semibold text-[#0a0a0a] mb-1">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom branding */}
            <div className="mt-8 flex items-center gap-3">
              <span
                className="px-2 py-1 rounded text-xs font-bold"
                style={{ backgroundColor: "#0202ff", color: "white" }}
              >
                CL
              </span>
              <p className="text-xs text-gray-500 max-w-sm">
                Built for HR, Talent, and executive leaders who want a clear answer they can use.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px" style={{ backgroundColor: "#0202ff" }} />

        {/* Right column — preview */}
        <div className="lg:w-[360px] xl:w-[400px] flex-shrink-0 px-6 lg:px-8 py-12 lg:py-16 bg-white">
          <OfferPreviewCard />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-gray-100 px-6 py-6 text-center" style={{ backgroundColor: "#fcfaf8" }}>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Curiosity Led · Leadership Development Platform
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          Results are based on your answers and are not a promise of business performance.
        </p>
      </footer>

      <style>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          outline: none;
          font-size: 0.875rem;
          transition: all 0.15s;
        }
        .input:focus {
          border-color: #0202ff;
          box-shadow: 0 0 0 2px rgba(2, 2, 255, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}