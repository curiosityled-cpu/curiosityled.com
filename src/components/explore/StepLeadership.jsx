import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { LI_ITEMS, SCALE_LABELS, DIMENSIONS } from "@/lib/exploreDemoContent";
import ProfileSummary from "@/components/explore/ProfileSummary";

export default function StepLeadership({ onComplete }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showProfile, setShowProfile] = useState(false);

  const item = LI_ITEMS[idx];
  const current = answers[item.id];

  const scores = LI_ITEMS.reduce((acc, it) => {
    acc[it.dimension] = answers[it.id] || 0;
    return acc;
  }, {});

  if (showProfile) {
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-3">
          Step 1 complete
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
          That's your profile. Three answers, one honest read.
        </h1>
        <p className="text-gray-600 leading-relaxed mb-6">
          The full Leadership Index uses {Object.keys(DIMENSIONS).length}+ dimensions and a
          validated item bank. This is the shape of it — enough to show you what you'd be
          working from.
        </p>

        <ProfileSummary scores={scores} />

        <button
          onClick={() => onComplete(scores)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white hover:opacity-90"
          style={{ backgroundColor: "#0202ff" }}
        >
          Now get the support for it
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-3">
        Leadership Index · sample
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
        See yourself clearly. Three questions.
      </h1>
      <p className="text-gray-600 leading-relaxed mb-7">
        Not a personality quiz and not a pass/fail. Just where your judgment is strong, and where
        it quietly costs you.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {idx + 1} of {LI_ITEMS.length}
          </span>
          <div className="flex gap-1">
            {LI_ITEMS.map((it, i) => (
              <span
                key={it.id}
                className="h-1 w-6 rounded-full"
                style={{ backgroundColor: answers[it.id] ? "#0202ff" : "#e5e7eb" }}
              />
            ))}
          </div>
        </div>

        <p className="text-lg font-semibold text-gray-900 leading-snug mb-6">{item.statement}</p>

        <div className="grid grid-cols-5 gap-1.5">
          {SCALE_LABELS.map((label, i) => {
            const value = i + 1;
            const selected = current === value;
            return (
              <button
                key={label}
                onClick={() => setAnswers((a) => ({ ...a, [item.id]: value }))}
                className={`rounded-xl border px-1 py-3 text-[10px] font-semibold leading-tight transition-all ${
                  selected
                    ? "text-white border-transparent"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
                style={selected ? { backgroundColor: "#0202ff" } : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        {idx > 0 && (
          <button
            onClick={() => setIdx((i) => i - 1)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-2"
          >
            Previous
          </button>
        )}
        <button
          disabled={!current}
          onClick={() => (idx === LI_ITEMS.length - 1 ? setShowProfile(true) : setIdx((i) => i + 1))}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          style={{ backgroundColor: "#0202ff" }}
        >
          {idx === LI_ITEMS.length - 1 ? "See my profile" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}