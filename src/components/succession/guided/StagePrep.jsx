import React, { useState } from "react";
import { ChevronDown, ListChecks, Plus, ArrowLeft } from "lucide-react";
import { STAGE_PREP } from "./stagePrep";

/**
 * StagePrep — what this stage needs before it can be worked properly.
 *
 * Open by default for the stage the cycle is on and for stages still ahead
 * (where it is the whole point), collapsed for stages already behind the
 * cycle so it does not crowd the work in progress.
 */
export default function StagePrep({ stageKey, defaultOpen = true, action, onAction, backLabel, onBack }) {
  const prep = STAGE_PREP[stageKey];
  const [open, setOpen] = useState(defaultOpen);
  if (!prep) return null;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <ListChecks className="w-3.5 h-3.5 text-[#0202ff] flex-shrink-0" />
        <span className="flex-1 min-w-0 text-xs font-medium text-gray-900">
          What to have ready for this stage
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ul className="space-y-1.5">
            {prep.haveReady.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
            {prep.note}
          </p>
        </div>
      )}

      {/* The step's own action, kept outside the collapsible body so it is
          always reachable — plus the way back to the previous stage. */}
      {(action || onBack) && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center gap-3 flex-wrap">
          {action && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              {action.create && <Plus className="w-3.5 h-3.5" />}
              {action.label}
            </button>
          )}
          {onBack && backLabel && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to {backLabel.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}