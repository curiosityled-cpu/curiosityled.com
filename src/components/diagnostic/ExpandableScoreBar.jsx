import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import ScoreBar from "./ScoreBar";

// Compact, collapsible score row: shows label + score/100 + bar by default,
// expands on tap to reveal "what this measures" and "what stronger looks like".
// Keeps the score summary short while preserving the interpretive detail.
export default function ExpandableScoreBar({
  label,
  score,
  sublabel,
  measures,
  stronger,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <ScoreBar label={label} score={score} sublabel={sublabel} />
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (measures || stronger) && (
        <div className="mt-2 pl-1 space-y-1.5">
          {measures && (
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-700">What this measures: </span>
              {measures}
            </p>
          )}
          {stronger && (
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold" style={{ color: "#0202ff" }}>
                What stronger looks like:{" "}
              </span>
              {stronger}
            </p>
          )}
        </div>
      )}
    </div>
  );
}