import React, { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Step 1 complete</p>
          <h2 className="text-lg font-bold text-gray-900 mt-1">That's your profile — three answers, one honest read.</h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            The full Leadership Index uses a validated item bank across {Object.keys(DIMENSIONS).length}+ dimensions.
            This is the shape of it, enough to show you what you'd be working from.
          </p>
        </div>

        <ProfileSummary scores={scores} />

        <Button
          onClick={() => onComplete(scores)}
          className="text-white"
          style={{ backgroundColor: "#0202ff" }}
        >
          Now get the support for it
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Leadership Index · {idx + 1} of {LI_ITEMS.length}
          </span>
          <div className="flex gap-1">
            {LI_ITEMS.map((it) => (
              <span
                key={it.id}
                className="h-1 w-6 rounded-full"
                style={{ backgroundColor: answers[it.id] ? "#0202ff" : "#e5e7eb" }}
              />
            ))}
          </div>
        </div>

        <p className="text-base font-semibold text-gray-900 leading-snug mb-5">{item.statement}</p>

        <div className="grid grid-cols-5 gap-1.5">
          {SCALE_LABELS.map((label, i) => {
            const value = i + 1;
            const selected = current === value;
            return (
              <button
                key={label}
                onClick={() => setAnswers((a) => ({ ...a, [item.id]: value }))}
                className={`rounded-lg border px-1 py-2.5 text-[10px] font-semibold leading-tight transition-all ${
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

      <div className="flex items-center gap-2">
        {idx > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setIdx((i) => i - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
        )}
        <Button
          disabled={!current}
          onClick={() => (idx === LI_ITEMS.length - 1 ? setShowProfile(true) : setIdx((i) => i + 1))}
          className="text-white"
          style={{ backgroundColor: "#0202ff" }}
        >
          {idx === LI_ITEMS.length - 1 ? "See my profile" : "Next"}
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}