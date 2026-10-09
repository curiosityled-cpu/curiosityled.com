import React from "react";

export const MEASURES = [
  { key: "energy_score", label: "Energy", color: "#0202ff" },
  { key: "confidence_score", label: "Confidence", color: "#22c55e" },
  { key: "focus_score", label: "Focus", color: "#f97316" },
  { key: "load_score", label: "Load", color: "#eab308" },
  { key: "growth_score", label: "Growth", color: "#8b5cf6" },
];

export const QUESTION_KEYS = [
  { key: "energy", label: "Energy", color: "#0202ff" },
  { key: "confidence", label: "Confidence", color: "#22c55e" },
  { key: "focus", label: "Focus", color: "#f97316" },
  { key: "load", label: "Load", color: "#eab308" },
  { key: "growth", label: "Growth", color: "#8b5cf6" },
];

export function shiftET(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function ScorePill({ label, score, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {score ?? "–"}
      </span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}

export function CustomAnswers({ answers }) {
  const entries = Object.entries(answers || {});
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        KPIs
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="text-[11px]">
            <span className="text-gray-500">{k}: </span>
            <span className="font-medium text-gray-700">
              {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuestionsUsed({ questions }) {
  const entries = Object.entries(questions || {});
  if (entries.length === 0) return null;
  const measureKeys = new Set(QUESTION_KEYS.map((m) => m.key));
  const customEntries = entries.filter(([k]) => !measureKeys.has(k));
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Questions
      </p>
      <div className="space-y-1">
        {QUESTION_KEYS.map((m) => {
          const text = questions?.[m.key];
          if (!text) return null;
          return (
            <div key={m.key} className="flex items-start gap-1.5 text-[11px]">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-gray-600">
                <span className="font-medium text-gray-700">{m.label}:</span>{" "}
                {text}
              </span>
            </div>
          );
        })}
        {customEntries.map(([k, text]) => (
          <div key={k} className="flex items-start gap-1.5 text-[11px]">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: "#0202ff" }}
            />
            <span className="text-gray-600">
              <span className="font-medium text-gray-700">Custom:</span> {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}