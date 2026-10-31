import React from "react";
import GuidedNextSteps from "@/components/guided/GuidedNextSteps";
import { REVIEW_STAGE_MAP, stageForView } from "./reviewStageConfig";

/**
 * ReviewNextSteps — the reviews equivalent of "What to do next". Reads the
 * cycle's counts and the person's role and offers the one or two concrete
 * actions that move the cycle forward, each deep-linking into its view.
 */

function remaining(total, done) {
  return Math.max(0, (total || 0) - (done || 0));
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function buildNextActions(cycle, role) {
  if (!cycle) {
    return role === "admin"
      ? [{ label: "Create your first review cycle", viewKey: "settings" }]
      : [];
  }

  const counts = cycle.counts || {};
  const cfg = cycle.config || {};
  const total = counts.participants ?? (cycle.progress_rows || []).length;
  const openTasks = (cycle.my_tasks || []).filter((t) => !t.submitted);
  const actions = [];

  if (role === "employee") {
    if (openTasks.length) {
      actions.push({
        label: `${plural(openTasks.length, "review task")} waiting on you`,
        viewKey: "my-review",
      });
    }
    if (cycle.my_summary?.released) {
      actions.push({ label: "Read your released review outcome", viewKey: "my-review" });
    }
    if (!actions.length) {
      actions.push({ label: "Nothing is due from you in this cycle", viewKey: "my-review" });
    }
    return actions.slice(0, 3);
  }

  if (role === "manager") {
    const mine = remaining(total, counts.manager_done);
    if (mine) {
      actions.push({ label: `Finish ${plural(mine, "manager review")}`, viewKey: "manager-progress" });
    }
    if (cfg.require_conversation !== false) {
      const conversations = remaining(total, counts.conversation_done);
      if (conversations) {
        actions.push({
          label: `Record ${plural(conversations, "review conversation")}`,
          viewKey: "conversation-progress",
        });
      }
    }
    if (openTasks.length) {
      actions.push({ label: "Complete your own review tasks", viewKey: "my-review" });
    }
    if (!actions.length) {
      actions.push({ label: "Your team's reviews are up to date", viewKey: "my-team" });
    }
    return actions.slice(0, 3);
  }

  // Admin / HR — drive the cycle in order
  if (cycle.status === "draft") {
    actions.push({ label: "Add the roster and launch the cycle", viewKey: "roster" });
    return actions;
  }

  if (!total) {
    actions.push({ label: "Add the roster to this cycle", viewKey: "roster" });
    return actions;
  }

  const selfOutstanding = remaining(total, counts.self_done);
  if (selfOutstanding) {
    actions.push({
      label: `${plural(selfOutstanding, "self review")} outstanding`,
      viewKey: "self-progress",
    });
  }

  const managerOutstanding = remaining(total, counts.manager_done);
  if (managerOutstanding) {
    actions.push({
      label: `${plural(managerOutstanding, "manager review")} outstanding`,
      viewKey: "manager-progress",
    });
  }

  if (cfg.release_policy === "after_calibration" && cycle.calibration?.status !== "completed") {
    actions.push({ label: "Run calibration and finalize ratings", viewKey: "calibration" });
  }

  if (cfg.require_conversation !== false) {
    const conversations = remaining(total, counts.conversation_done);
    if (conversations) {
      actions.push({
        label: `Record ${plural(conversations, "review conversation")}`,
        viewKey: "conversation-progress",
      });
    }
  }

  const toRelease = remaining(total, counts.released);
  if (toRelease) {
    actions.push({ label: `Release ${plural(toRelease, "outcome")}`, viewKey: "release-progress" });
  }

  if (!actions.length) {
    actions.push({ label: "Everything is released — review the cycle history", viewKey: "history" });
  }

  return actions.slice(0, 3);
}

export default function ReviewNextSteps({ cycle, role, onNavigate }) {
  const actions = buildNextActions(cycle, role).map((action) => {
    const stageKey = stageForView(action.viewKey);
    return { ...action, hint: stageKey ? REVIEW_STAGE_MAP[stageKey]?.label : null };
  });

  return (
    <GuidedNextSteps
      actions={actions}
      onAction={(action) => onNavigate?.(action.viewKey)}
    />
  );
}