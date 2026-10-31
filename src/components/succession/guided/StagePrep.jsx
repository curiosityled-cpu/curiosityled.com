import React, { useState } from "react";
import { ChevronDown, ListChecks, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_PREP } from "./stagePrep";

/**
 * StagePrep — what this stage needs before it can be worked properly, and the
 * one step that lets the cycle move past it.
 *
 * The list is open by default for the stage the cycle is on and for stages
 * still ahead (where it is the whole point), collapsed for stages already
 * behind the cycle so it does not crowd the work in progress. The step button
 * stays visible either way: it names the work to finish, not the stage.
 */
export default function StagePrep({
  stageKey,
  defaultOpen = true,
  readOnly = false,
  onStep,
  onBack,
  backLabel,
}) {
  const prep = STAGE_PREP[stageKey];
  const [open, setOpen] = useState(defaultOpen);
  if (!prep) return null;

  const step = prep.step;

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
        <div className="px-4">
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

      <div
        className={`px-4 pt-3 pb-3.5 flex items-center gap-2 flex-wrap ${
          open ? "" : "border-t border-gray-100"
        }`}
      >
        {readOnly ? (
          <p className="text-xs text-gray-500">This stage is read-only for your role.</p>
        ) : (
          <>
            {step && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => onStep?.(step.view)}
              >
                <ArrowRight className="w-3.5 h-3.5" /> {step.label}
              </Button>
            )}
            {backLabel && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-gray-600"
                onClick={onBack}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to {backLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}