import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { SCORED_ITEMS, SCORE_SCALE } from "@/lib/diagnostic/questions";
import { CONSTRUCT_LABELS } from "@/lib/diagnostic/scoring";

export default function ScoredQuestionsStage({ onComplete, onBack, firstName }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});

  const total = SCORED_ITEMS.length;
  const currentItem = SCORED_ITEMS[currentIndex];
  const constructLabel = CONSTRUCT_LABELS[currentItem.construct] || "";
  const progress = ((currentIndex + 1) / total) * 32 + 32; // 32%-64%

  const handleSelect = (optionIndex) => {
    const newResponses = { ...responses, [currentItem.id]: optionIndex };
    setResponses(newResponses);

    // Auto-advance after a brief delay
    setTimeout(() => {
      if (currentIndex < total - 1) {
        setCurrentIndex(currentIndex + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        onComplete(newResponses);
      }
    }, 250);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onBack();
    }
  };

  const selectedIndex = responses[currentItem.id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#0202ff" }}>
          {constructLabel}
        </p>
        <p className="text-xs text-gray-400">
          Question {currentIndex + 1} of {total}
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
          <h1 className="text-xl sm:text-2xl font-bold leading-snug tracking-tight mb-4 text-[#0a0a0a]">
            {currentItem.text}
          </h1>

          <div className="space-y-2">
            {SCORE_SCALE.map((option, optionIndex) => (
              <button
                key={option}
                onClick={() => handleSelect(optionIndex)}
                className={`w-full text-left px-4 py-3.5 rounded-lg border text-sm transition-all flex items-center gap-3 ${
                  selectedIndex === optionIndex
                    ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0a0a0a]"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedIndex === optionIndex
                      ? "border-[#0202ff] bg-[#0202ff]"
                      : "border-gray-300"
                  }`}
                >
                  {selectedIndex === optionIndex && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                {option}
                <span className="ml-auto text-xs text-gray-400 font-mono">
                  {optionIndex + 1}
                </span>
              </button>
            ))}
          </div>
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
        <p className="text-xs text-gray-400">
          {Object.keys(responses).length} of {total} answered
        </p>
      </div>
    </motion.div>
  );
}