import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft } from "lucide-react";
import { REVIEW_STAGE_MAP } from "./reviewStageConfig";

/**
 * ReviewStagePreview — what a stage holds, before a cycle exists for it.
 *
 * Selecting a stage on a cycle that has not been created yet must still show
 * that stage's own content, so the person setting the cycle up can see what
 * each step will ask of them before they get there. This is stage-specific
 * preparation guidance, never a single shared placeholder.
 */
const STAGE_PREP = {
  roster: {
    what: "Every person being reviewed, who reviews them, and who gives peer feedback.",
    prepare: [
      "The employees in scope, by email, grouped under the manager who reviews them",
      "Who reviews anyone whose manager is not in the cycle",
      "Whether peer reviewers are needed, and who is asked for each person",
    ],
    note: "The roster locks when the cycle launches. Later changes are reassignments and stay in the cycle history.",
  },
  self: {
    what: "Employees record their own evidence and reflections before their manager writes a review.",
    prepare: [
      "The questions the self review asks, and how much time employees get",
      "Whether evidence kept outside the form (documents, prior goals) is accepted",
      "When reminders go out before the self assessment due date",
    ],
    note: "A self review is read by the employee and their manager only.",
  },
  manager: {
    what: "Managers assess each report against the rating scale, with the self review and any peer feedback alongside.",
    prepare: [
      "The rating scale and what each level looks like in practice",
      "How much written evidence a manager must give for each rating",
      "Whether managers see peer text, which is set as a cycle rule",
    ],
    note: "Manager ratings are not final until calibration closes.",
  },
  calibration: {
    what: "Ratings are compared across the team, adjusted where the evidence supports it, and finalized.",
    prepare: [
      "Who calibrates: HR Admins, or managers with an HR Admin chairing",
      "Whether a rating can move without a written reason (it cannot)",
      "How far a rating may move from the manager's proposal before review",
    ],
    note: "Every adjustment is recorded with the reason and stays in the history.",
  },
  conversation: {
    what: "Managers hold the review conversation and record that it took place before the outcome can be released.",
    prepare: [
      "Whether the conversation is required for every person or only some",
      "What the manager records: the fact it happened, plus optional private notes",
      "How long managers have to hold it after calibration closes",
    ],
    note: "Conversation notes are the manager's own and are not released to the employee.",
  },
  release: {
    what: "The final outcome is released to the employee, who acknowledges it and can add a written response.",
    prepare: [
      "When outcomes release: after calibration, or after the conversation",
      "What the employee sees: the rating, the manager's summary, and any agreed actions",
      "How long the response window stays open",
    ],
    note: "Acknowledgment records that the outcome was received, not that the employee agreed with it.",
  },
};

export default function ReviewStagePreview({ stageKey, canConfigure, onCreate, onGoSetup }) {
  const stage = REVIEW_STAGE_MAP[stageKey];
  const prep = STAGE_PREP[stageKey] || null;
  const Icon = stage?.icon;

  return (
    <div className="space-y-4">
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
                Not started
              </Badge>
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

        <div className="pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          {canConfigure ? (
            <>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={onCreate}>
                <Plus className="w-3.5 h-3.5" /> Create review cycle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-gray-600"
                onClick={onGoSetup}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to set up
              </Button>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              This stage opens when an HR Admin launches the cycle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}