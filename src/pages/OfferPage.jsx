import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Shield } from "lucide-react";
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
    <div className="min-h-screen font-sans text-[#0a0a0a]" style={{ backgroundColor: "#F9F7F5" }}>
      {/* Black header bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded bg-white">
            <img
              src="https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/5761758bf_CuriosityLegLogo.png"
              alt="Curiosity Led"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div className="text-white">
            <div className="text-sm font-bold tracking-wide">CURIOSITY LED</div>
            <div className="text-[10px] text-gray-400 leading-none">LEADERSHIP SUPPORT DIAGNOSTIC</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-white/90">
          <Shield className="w-4 h-4" />
          <span className="text-xs font-medium">Private Assessment</span>
        </div>
      </header>

      {/* Split-screen hero */}
      <section className="px-5 py-12 lg:py-16">
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
              No commitment · About 2 minutes · Instant downloadable blueprint
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
              <div className="flex items-center justify-center w-8 h-8 rounded bg-[#0a0a0a] text-white text-[11px] font-bold">CL</div>
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

      <footer className="px-6 py-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Curiosity Led · Leadership Development Platform</p>
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