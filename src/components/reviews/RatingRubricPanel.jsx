import React, { useState } from "react";
import { ChevronDown, ChevronRight, Scale } from "lucide-react";
import { normalizeAnchors } from "@/lib/reviewRubric";

/**
 * Shows the rating scale with the definition of each level, so a rating is
 * chosen against stated expectations rather than a bare number.
 */
export default function RatingRubricPanel({ anchors = [], criteria = "", rubric = "" }) {
  const [open, setOpen] = useState(false);
  const list = normalizeAnchors(anchors);

  if (!list.length && !criteria && !rubric) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
        <Scale className="w-3 h-3 text-[#0202ff]" />
        <span className="text-[11px] font-medium text-gray-700">Rating scale and definitions</span>
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-gray-100 pt-2">
          {criteria && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                What this cycle assesses
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                {criteria}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            {list.map((a) => (
              <div key={a.value} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {a.value}
                </span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-800">{a.label}</span>
                  {a.definition ? ` — ${a.definition}` : ""}
                </p>
              </div>
            ))}
          </div>

          {!list.length && rubric && (
            <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">{rubric}</p>
          )}
        </div>
      )}
    </div>
  );
}