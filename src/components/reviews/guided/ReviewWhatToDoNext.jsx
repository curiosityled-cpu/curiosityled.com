import React from "react";
import { Sparkles, ChevronRight } from "lucide-react";

const ROLE_LABEL = { self: "self review", manager: "manager review", peer: "peer feedback" };

/** The concrete action that moves one stage forward, from the stage's state. */
function stageAction(stage) {
  switch (stage.id) {
    case "setup":
      return { label: "Set the review period, scale and release policy", settings: true };
    case "roster":
      return { label: "Add people to the roster and assign reviewers", tab: "progress", focus: "roster" };
    case "self":
      return { label: `${stage.detail} self reviews still open`, tab: "progress", focus: "self" };
    case "manager":
      return { label: `${stage.detail} manager reviews still open`, tab: "progress", focus: "manager" };
    case "calibration":
      return { label: "Run calibration before outcomes are released", tab: "calibration" };
    case "conversation":
      return { label: `${stage.detail} review conversations still to record`, tab: "progress", focus: "conversation" };
    case "release":
      return { label: `${stage.detail} outcomes still to release`, tab: "progress", focus: "release" };
    default:
      return null;
  }
}

/**
 * ReviewWhatToDoNext — the pinned "next steps" panel. Reads the cycle's own
 * stage completion and the viewer's open tasks, and deep-links into them.
 */
export default function ReviewWhatToDoNext({
  cycle,
  stages = [],
  myTasks = [],
  isAdmin,
  hasTeam,
  canConfigure,
  onNavigate,
  onOpenSettings,
  onCreate,
}) {
  const actions = [];

  if (!cycle) {
    if (canConfigure) actions.push({ label: "Create a review cycle to begin", onSelect: onCreate });
  } else {
    const nextTask = myTasks.find((t) => !t.submitted);
    if (nextTask) {
      actions.push({
        label: `Complete your ${ROLE_LABEL[nextTask.role] || "review"} · ${nextTask.employee_name}`,
        onSelect: () => onNavigate("mine", null),
      });
    }

    if (isAdmin) {
      stages
        .filter((s) => !s.done)
        .forEach((s) => {
          if (actions.length >= 3) return;
          const action = stageAction(s);
          if (!action) return;
          actions.push({
            label: action.label,
            onSelect: () =>
              action.settings ? onOpenSettings() : onNavigate(action.tab, action.focus || null),
          });
        });
    } else if (hasTeam) {
      actions.push({
        label: "Open your team's reviews",
        onSelect: () => onNavigate("team", null),
      });
    }
  }

  if (!actions.length) return null;

  return (
    <div className="border border-[#0202ff]/15 rounded-lg bg-[#0202ff]/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#0202ff]/10 bg-[#0202ff]/[0.02]">
        <Sparkles className="w-3.5 h-3.5 text-[#0202ff]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          What to do next
        </h3>
      </div>
      <div className="p-3 space-y-1.5">
        {actions.slice(0, 3).map((action, i) => (
          <button
            key={i}
            onClick={action.onSelect}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white transition-colors text-left group"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0202ff]/10 flex items-center justify-center text-[11px] font-semibold text-[#0202ff]">
              {i + 1}
            </div>
            <span className="text-sm text-gray-700 flex-1">{action.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0202ff] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}