import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ReportPreviewCard from "@/components/landing/ReportPreviewCard";

const STEPS = [
  { num: "1", desc: "Answer a short set of questions about your current leadership support reality." },
  { num: "2", desc: "Get your tailored 90-Day Leadership Development Reboot Blueprint." },
  { num: "3", desc: "Use it internally, or review it with Curiosity Led to pressure-test implementation." },
];

export default function OfferPage() {
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
    <div className="relative min-h-screen font-sans text-[#0a0a0a] bg-white overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
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

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img
            src="https://raw.githubusercontent.com/curiosityled-cpu/curiosityled.com/main/public/CuriosityLedLogoBBW%20(1).png"
            alt="Curiosity Led"
            className="h-10 object-contain"
          />
          <div className="flex items-center gap-1.5" style={{ color: "#0202ff" }}>
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Private Assessment</span>
          </div>
        </div>
      </header>

      {/* Split-screen hero */}
      <section className="relative px-5 pt-28 pb-12 lg:pt-32 lg:pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column — content */}
          <div className="max-w-xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-xs font-semibold uppercase tracking-[0.2em] mb-5"
              style={{ color: "#0202ff" }}
            >
              Leadership Support Diagnostic
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-5"
            >
              What is the #1 thing holding back your <span style={{ color: "#0202ff" }}>leadership development?</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-gray-600 leading-relaxed mb-7"
            >
              Answer a short set of questions. See where leadership support is getting stuck, get a clear readiness score, and download a 90-Day Leadership Development Reboot Blueprint built from your answers.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={scrollToForm}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 shadow-lg"
              style={{ backgroundColor: "#0202ff" }}
            >
              Continue my diagnostic
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center text-xs text-gray-500 mt-3"
            >
              No commitment · Instant downloadable blueprint
            </motion.p>

            {/* Three-step feature row */}
            <div className="mt-10 grid grid-cols-3 gap-0 border-t border-gray-200 pt-6">
              {STEPS.map((s) => (
                <div key={s.num} className="px-2 border-r border-gray-200 last:border-r-0">
                  <p className="text-sm font-bold mb-1" style={{ color: "#0202ff" }}>{s.num}</p>
                  <p className="text-[11px] text-gray-600 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Footer badge */}
            <div className="mt-6 flex items-center gap-3">
              <img
                src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/01f09d997_be036d547_CuriosityLedIcon_20241030_085533_0000.png"
                alt="Curiosity Led"
                className="w-8 h-8 object-contain rounded"
              />
              <p className="text-xs text-gray-500 leading-snug">
                Built for HR, Talent, L&D, and executive leaders who want a clear answer they can use.
              </p>
            </div>
          </div>

          {/* Right column — report preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="w-full"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-1">Your takeaway</p>
            <p className="text-lg font-bold text-[#0a0a0a] mb-4">A Clear Leadership Development Report</p>
            <ReportPreviewCard />
          </motion.div>
        </div>
      </section>

      <footer className="relative px-6 py-8 text-center" style={{ backgroundColor: "#FBFBFB" }}>
        <div className="max-w-md mx-auto space-y-1">
          <p className="text-xs" style={{ color: "#666666" }}>
            © 2026 Curiosity Led LLC · Leadership Support Diagnostic
          </p>
          <p className="text-xs" style={{ color: "#666666" }}>
            Results are based on your answers and are not a promise of business performance.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs">
          <Link to="/PrivacyPolicy" className="underline" style={{ color: "#666666" }}>Privacy Policy</Link>
          <span style={{ color: "#666666" }}>·</span>
          <Link to="/TermsOfService" className="underline" style={{ color: "#666666" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}

function Section({ children }) {
  return (
    <section className="px-6 py-16 border-t border-gray-200">
      <div className="max-w-2xl mx-auto text-center">{children}</div>
    </section>
  );
}