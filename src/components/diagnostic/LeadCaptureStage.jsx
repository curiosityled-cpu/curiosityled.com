import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  {
    id: "email",
    label: "Where Should We Send Your Report?",
    placeholder: "jane@company.com",
    inputType: "email",
    helper: "We'll email your full blueprint PDF to this address.",
  },
  {
    id: "organization",
    label: "What Is Your Company Called?",
    placeholder: "Company name",
    inputType: "text",
    helper: "We'll use this name on your report and specialist brief.",
  },
  {
    id: "phone",
    label: "What's the Best Number to Reach You?",
    placeholder: "(555) 555-0123",
    inputType: "tel",
    helper: "Optional — in case our team needs to follow up about your report.",
  },
];

export default function LeadCaptureStage({ onComplete, onBack, firstName, progress, onProgress }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState({ email: "", organization: "", phone: "" });
  const [consent, setConsent] = useState(false);

  // Report overall completion progress to the parent flow.
  useEffect(() => {
    onProgress?.(72 + ((stepIndex + 1) / STEPS.length) * 25);
  }, [stepIndex]);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const isValid = () => {
    if (currentStep.id === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
    }
    if (currentStep.id === "organization") {
      return values.organization.trim().length > 0;
    }
    // Phone is optional
    return true;
  };

  const handleNext = () => {
    if (!isValid()) return;
    if (!isLastStep) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onComplete(values);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onBack();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {/* Left column — summary */}
      <div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#0202ff" }}>
              {Math.round(progress)}% Complete
            </p>
            <p className="text-xs text-gray-400">Report Ready</p>
          </div>
          <div className="w-full h-1 bg-gray-100 rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: "#0202ff" }}
            />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight mb-4 text-[#0a0a0a]">
          {firstName}, Your Leadership Reboot Blueprint Is Ready.
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Add your delivery details one step at a time. Your full score, pressure points, and 90-day plan are ready on the next screen.
        </p>

        <div className="space-y-3">
          {[
            { num: "01", title: "Five-Construct Scorecard", desc: "See what is strong and what needs work" },
            { num: "02", title: "Your Top 2 Pressure Points", desc: "Know where to focus first" },
            { num: "03", title: "Your 90-Day Plan", desc: "Download, print, and share it" },
          ].map((item) => (
            <div key={item.num} className="flex gap-4 py-3 border-t border-gray-100">
              <p className="text-sm font-bold w-8" style={{ color: "#0202ff" }}>{item.num}</p>
              <div>
                <p className="text-sm font-semibold text-[#0a0a0a]">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — form card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#0202ff" }}>
            Report Delivery
          </p>
          <p className="text-xs font-semibold text-[#0a0a0a]">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>

        {/* Mini progress bar */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all"
              style={{
                backgroundColor: i <= stepIndex ? "#0202ff" : "#E5E7EB",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <label className="block text-sm font-semibold text-[#0a0a0a] mb-2">
              {currentStep.label}
            </label>
            <input
              type={currentStep.inputType}
              value={values[currentStep.id]}
              onChange={(e) => setValues({ ...values, [currentStep.id]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid()) handleNext();
              }}
              autoFocus
              placeholder={currentStep.placeholder}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#0a0a0a] focus:outline-none focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/10 transition-all mb-2"
              style={{ backgroundColor: "#F2F5FF" }}
            />
            <p className="text-xs text-gray-500 mb-6">{currentStep.helper}</p>

            {isLastStep && (
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    Yes, Curiosity Led may call or text me about my assessment and related offers, including through automated technology. Consent is not required to buy. Message frequency varies. Reply STOP to opt out or HELP for help.
                  </span>
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  The checkbox is optional. Entering a number alone does not opt you into automated marketing messages.
                </p>
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={!isValid()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white text-base transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{ backgroundColor: "#0202ff" }}
            >
              {isLastStep ? "See My Results" : "Continue"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}