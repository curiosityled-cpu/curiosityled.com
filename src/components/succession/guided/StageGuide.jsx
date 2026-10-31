import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { STAGE_MAP, STAGE_ORDER } from "./stageConfig";
import { STAGE_PREP } from "./stagePrep";

/**
 * StageGuide — the preparation explainer that sits under every succession
 * stage: what the stage asks of you, what to have ready before you start, and
 * the one thing worth knowing before relying on it.
 *
 * Its action calls out the step that actually moves the cycle forward right
 * now — which is often in a different stage from the one being read — so
 * browsing ahead never looks like the place the work is waiting.
 */
export default function StageGuide({
  stageKey,
  currentStageKey,
  hasCycle = true,
  readOnly = false,
  currentStep = null,
  loadingSteps = false,
  onNavigate,
  onGoCurrentStage,
}) {
  const stage = STAGE_MAP[stageKey];
  const prep = STAGE_PREP[stageKey];
  const currentStage = STAGE_MAP[currentStageKey];
  const Icon = stage?.icon;

  const currentIdx = STAGE_ORDER.indexOf(currentStageKey);
  const stageIdx = STAGE_ORDER.indexOf(stageKey);
  const state = !hasCycle
    ? stageKey === "frame"
      ? "current"
      : "upcoming"
    : stageIdx < currentIdx
    ? "done"
    : stageIdx === currentIdx
    ? "current"
    : "upcoming";

  const stateLabel =
    state === "done" ? "Done" : state === "current" ? "Current step" : "Not started";

  const stepStage = currentStep ? STAGE_MAP[currentStep.stageKey] : null;
  const viewingElsewhere = currentStageKey && stageKey !== currentStageKey;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">
              {stage?.label || "This stage"}
            </h3>
            <Badge variant="outline" className="text-[10px] text-gray-500">
              {stateLabel}
            </Badge>
            {readOnly && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                <Lock className="w-2.5 h-2.5" />
                Read-only for your role
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {prep?.what || stage?.description}
          </p>
        </div>
      </div>

      {prep && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            What to have ready
          </p>
          <ul className="space-y-1.5">
            {prep.prepare.map((line) => (
              <li key={line} className="text-xs text-gray-600 flex gap-2 leading-relaxed">
                <span className="text-gray-300 flex-shrink-0">–</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">{prep.note}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          The step you need to complete now
        </p>

        {loadingSteps ? (
          <p className="text-xs text-gray-400">Finding your next step…</p>
        ) : currentStep ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => onNavigate?.(currentStep.stageKey, currentStep.viewKey)}
            >
              {currentStep.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            {stepStage && stepStage.key !== stageKey && (
              <span className="text-[10px] text-gray-400">
                In the {stepStage.label} stage
              </span>
            )}
            {viewingElsewhere && currentStage && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-gray-600"
                onClick={() => onGoCurrentStage?.()}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to {currentStage.label}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Nothing is waiting on you in this cycle right now.
          </p>
        )}
      </div>
    </div>
  );
}