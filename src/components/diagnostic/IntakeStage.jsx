import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { INTAKE_FIELDS } from "@/lib/diagnostic/questions";

const SECTIONS = ["Context", "Current reality"];

export default function IntakeStage({ onComplete, onBack, firstName, progress, onProgress }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [conditionalAnswers, setConditionalAnswers] = useState({});

  const currentSection = SECTIONS[sectionIndex];
  const sectionFields = INTAKE_FIELDS.filter((f) => f.section === currentSection);

  // Jump to the top of the page the instant a new section renders.
  useEffect(() => {
    window.scrollTo(0, 0);
    onProgress?.(sectionIndex === 0 ? 25 : 42);
  }, [sectionIndex]);

  const handleFieldChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleConditionalChange = (fieldId, value) => {
    setConditionalAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const isFieldValid = (field) => {
    if (!field.required) return true;
    const val = answers[field.id];
    if (field.type === "multi_select") {
      return val && val.length > 0;
    }
    return val && val.trim && val.trim().length > 0;
  };

  const isSectionValid = () => {
    return sectionFields.every((field) => {
      if (!isFieldValid(field)) return false;
      // Check conditional reveal
      if (field.conditionalReveal) {
        const triggerVal = answers[field.id];
        if (Array.isArray(triggerVal)) {
          if (triggerVal.includes(field.conditionalReveal.triggerValue)) {
            const condField = field.conditionalReveal.field;
            const condVal = conditionalAnswers[condField.id];
            if (!condVal || (condVal.trim && condVal.trim().length === 0)) {
              return false;
            }
          }
        } else if (triggerVal === field.conditionalReveal.triggerValue) {
          const condField = field.conditionalReveal.field;
          const condVal = conditionalAnswers[condField.id];
          if (!condVal || (condVal.trim && condVal.trim().length === 0)) {
            return false;
          }
        }
      }
      return true;
    });
  };

  const handleNext = () => {
    if (sectionIndex < SECTIONS.length - 1) {
      setSectionIndex(sectionIndex + 1);
    } else {
      onComplete({ ...answers, ...conditionalAnswers });
    }
  };

  const handlePrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
    } else {
      onBack();
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto px-6"
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#0202ff" }}>
          Intake · Section {sectionIndex + 1} of {SECTIONS.length}
        </p>
        <p className="text-xs text-gray-400">{Math.round(progress)}% · 0{sectionIndex + 2} / 06</p>
      </div>

      <div className="w-full h-1 bg-gray-100 rounded-full mb-10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: "#0202ff" }}
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight mb-3 text-[#0a0a0a]">
        {sectionIndex === 0
          ? `${firstName}, Tell Me About Your Context`
          : `${firstName}, What's Your Current Reality?`}
      </h1>
      <p className="text-sm text-gray-600 mb-8">
        {sectionIndex === 0
          ? "This helps me tailor the report to your lens and population."
          : "Choose what feels most true right now. This sharpens your blueprint."}
      </p>

      <div className="space-y-6">
        {sectionFields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(val) => handleFieldChange(field.id, val)}
            conditionalAnswers={conditionalAnswers}
            onConditionalChange={handleConditionalChange}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-10">
        <button
          onClick={handlePrev}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isSectionValid()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          style={{ backgroundColor: "#0202ff" }}
        >
          {sectionIndex < SECTIONS.length - 1 ? "Continue" : "Start Diagnostic Questions"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function FieldRenderer({ field, value, onChange, conditionalAnswers, onConditionalChange }) {
  const showConditional = (() => {
    if (!field.conditionalReveal) return false;
    if (Array.isArray(value)) {
      return value.includes(field.conditionalReveal.triggerValue);
    }
    return value === field.conditionalReveal.triggerValue;
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <label className="block text-sm font-semibold text-[#0a0a0a] mb-1">
        {field.label}
      </label>
      {field.helper && (
        <p className="text-xs text-gray-500 mb-4">{field.helper}</p>
      )}

      {field.type === "single_select" && (
        <div className="space-y-2">
          {field.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                value === opt
                  ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0a0a0a]"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {field.type === "multi_select" && (
        <div className="space-y-2">
          {field.options.map((opt) => {
            const selected = (value || []).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = value || [];
                  if (selected) {
                    onChange(current.filter((v) => v !== opt));
                  } else {
                    if (field.maxSelect && current.length >= field.maxSelect) return;
                    onChange([...current, opt]);
                  }
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-3 ${
                  selected
                    ? "border-[#0202ff] bg-[#0202ff]/5 text-[#0a0a0a]"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selected ? "bg-[#0202ff] border-[#0202ff]" : "border-gray-300"
                  }`}
                >
                  {selected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                {opt}
              </button>
            );
          })}
          {field.maxSelect && (
            <p className="text-xs text-gray-400 mt-1">
              Select up to {field.maxSelect}
            </p>
          )}
        </div>
      )}

      {field.type === "short_text" && (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#0a0a0a] focus:outline-none focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/10 transition-all"
          style={{ backgroundColor: "#F2F5FF" }}
          placeholder={field.required ? "Required" : "Optional"}
        />
      )}

      {showConditional && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.conditionalReveal.field.label}
          </label>
          <input
            type="text"
            value={conditionalAnswers[field.conditionalReveal.field.id] || ""}
            onChange={(e) =>
              onConditionalChange(field.conditionalReveal.field.id, e.target.value)
            }
            className="w-full px-4 py-3 rounded-lg border border-gray-200 text-[#0a0a0a] focus:outline-none focus:border-[#0202ff] focus:ring-2 focus:ring-[#0202ff]/10 transition-all"
            style={{ backgroundColor: "#F2F5FF" }}
          />
        </div>
      )}
    </div>
  );
}