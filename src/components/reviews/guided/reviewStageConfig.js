import {
  Settings2,
  UserPlus,
  ClipboardCheck,
  UserCheck,
  Scale,
  MessagesSquare,
  Send,
  Circle,
} from "lucide-react";

/**
 * reviewStageConfig — the presentation layer for the seven review-cycle stages.
 *
 * Stage order, completion state and counts live in @/lib/reviewStages; this file
 * only adds the icon and the plain-language purpose each stage carries in the
 * guided shell, so the rail and the stage header never disagree.
 */
export const REVIEW_STAGE_UI = {
  setup: {
    icon: Settings2,
    description:
      "The period, rating scale and release policy this cycle runs on. Locked once the cycle launches.",
  },
  roster: {
    icon: UserPlus,
    description:
      "Who is being reviewed this cycle, and who reviews them — self, manager and any peer reviewers.",
  },
  self: {
    icon: ClipboardCheck,
    description:
      "Employees record their own view of the period before their manager's assessment is written.",
  },
  manager: {
    icon: UserCheck,
    description:
      "Managers assess their reports against the same criteria and rating scale.",
  },
  calibration: {
    icon: Scale,
    description:
      "Ratings are compared across teams so the same work earns the same rating everywhere.",
  },
  conversation: {
    icon: MessagesSquare,
    description: "The review conversation is held with the employee and recorded.",
  },
  release: {
    icon: Send,
    description:
      "The outcome is shared with the employee, who acknowledges receipt and may respond.",
  },
};

export function stageUi(stageId) {
  return REVIEW_STAGE_UI[stageId] || { icon: Circle, description: "" };
}