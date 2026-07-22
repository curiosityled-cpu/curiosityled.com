import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FOLLOW_UPS } from "@/lib/diagnostic/questions";
import { CONSTRUCT_LABELS } from "@/lib/diagnostic/scoring";

export default function FollowUpStage({
  triggeredFollowUps,
  intakeAnswers,
  onComplete,
  onBack,
  firstName,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  // Filter out any follow-ups that don't have valid data
  const validFollowUps = triggeredFollowUps.filter((key) => {
    const fu = FOLLOW_UPS[key];
    if (!fu) return false;
    if (key === "multiple_populations") {
      return (intakeAnswers.leader_populations || []).length >= 2;
    }
    return true;
  });

  // Skip to lead capture if no valid follow-ups
  useEffect(() => {
    if (validFollowUps.length === 0) {
      onComplete({});
    }
  }, [validFollowUps.length]);

  if (validFollowUps.length === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-sm text-gray-400">Preparing your report…</p>
      </div>
    );
  }

  const currentKey = validFollowUps[currentIndex];
  const currentFU = FOLLOW_UPS[currentKey];
  const total = validFollowUps.length;
  const progress = ((currentIndex + 1) / total) * 8 + 64; // 64%-72%

  const handleAnswer = (value) => {
    const newAnswers = { ...answers, [currentKey]: value };
    setAnswers(newAnswers);

    if (currentIndex < total - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 250);
    } else {
      setTimeout(() => onComplete(newAnswers), 250);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onBack();
    }
  };

  // For multiple_populations, use selected populations as options
  let options = currentFU.options;
  if (currentFU.type === "single_select_from_selected") {
    options = intakeAnswers.leader_populations || [];
  }

  const categoryLabel =
    currentFU.triggerType === "score"
      ? CONSTRUCT_LABELS[currentKey] || "Follow-up"
      : currentFU.triggerType === "context"
      ? "Context"
      : "Clarification";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#0202ff" }}>
          {categoryLabel} · Sharpening your report
        </p>
        <p className="text-xs text-gray-400">
          Follow-up {currentIndex + 1} of {total}
        </p>
      </div>

      <div className="w-full h-1 bg-gray-100 rounded-full mb-10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: "#0202ff" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold leading-snug tracking-tight mb-2 text-[#0a0a0a]">
            {currentFU.question}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            This makes your report more specific to your situation.
          </p>

          {currentFU.type === "short_text" ? (
            <input
              type="text"
              value={answers[currentKey] || ""}
              onChange={(e) => setAnswers({ ...answers, [currentKey]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && answers[currentKey]?.trim()) {
                  handleAnswer(answers[currentKey]);
                }
              }}
              autoFocus
              className="w-full px-4 py-3.5 rounded-lg border border-gray-200 text-[#0a0a0a] focus:outline-none focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/10 transition-all"
              style={{ backgroundColor: "#F2F5FF" }}
              placeholder="Type your answer..."
            />
          ) : (
            <div className="space-y-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className={`w-full text-left px-4 py-3.5 rounded-lg border text-sm transition-all flex items-center gap-3 ${
                    answers[currentKey] === opt
                      ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0a0a0a]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      answers[currentKey] === opt
                        ? "border-[#0202ff] bg-[#0202ff]"
                        : "border-gray-300"
                    }`}
                  >
                    {answers[currentKey] === opt && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {currentFU.type === "short_text" && (
          <button
            onClick={() => answers[currentKey]?.trim() && handleAnswer(answers[currentKey])}
            disabled={!answers[currentKey]?.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: "#0202ff" }}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}